import Party from './party.model.js';
import Account from '../account/account.model.js';
import { getAccountLedger } from '../account/account.service.js';
import User from '../auth/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { PARTY_TYPES, ROLES } from '../../config/constants.js';

let legacyIndexCheckDone = false;

async function dropLegacyBusinessUniqueIndexes() {
  if (legacyIndexCheckDone) return;
  legacyIndexCheckDone = true;

  const targets = [Party, Account];
  for (const model of targets) {
    try {
      const indexes = await model.collection.indexes();
      const legacyIndexes = indexes.filter((idx) => (
        idx.unique === true &&
        idx.key &&
        Object.keys(idx.key).length === 1 &&
        Object.prototype.hasOwnProperty.call(idx.key, 'businessId')
      ));

      for (const idx of legacyIndexes) {
        await model.collection.dropIndex(idx.name);
      }
    } catch {
      // Ignore index read/drop failures and continue normal request flow.
    }
  }
}

/**
 * Determines the account type for a party's linked account.
 * Customers → asset (receivable), Vendors → liability (payable), Mixed → asset
 */
function getLinkedAccountType(partyTypes) {
  if (partyTypes.includes(PARTY_TYPES.CUSTOMER)) return 'asset';
  if (partyTypes.includes(PARTY_TYPES.VENDOR)) return 'liability';
  return 'asset'; // contractor default
}

function getLinkedAccountGroup(partyTypes) {
  if (partyTypes.includes(PARTY_TYPES.CUSTOMER)) return 'Sundry Debtors';
  if (partyTypes.includes(PARTY_TYPES.VENDOR)) return 'Sundry Creditors';
  return 'Sundry Debtors';
}

function generateLinkedAccountCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PTY-${ts}-${rnd}`.slice(0, 50);
}

export async function createParty(data, businessId, userId) {
  await dropLegacyBusinessUniqueIndexes();

  // Check if contractor settings are being enabled for a non-contractor party
  if (data.contractorSettings?.isEnabled && !data.type?.includes(PARTY_TYPES.CONTRACTOR)) {
    throw ApiError.badRequest('Contractor settings can be set only for contractor party type');
  }
  if (data.contractorSettings?.linkedUserId) {
    const linked = await User.findOne({
      _id: data.contractorSettings.linkedUserId,
      businesses: { $elemMatch: { businessId, isActive: true } },
    }).select('_id');
    if (!linked) throw ApiError.badRequest('Linked contractor user must be an active member of this business');
  }

  // Create linked account for this party
  const accountType = getLinkedAccountType(data.type);
  const accountGroup = getLinkedAccountGroup(data.type);

  const linkedAccount = await Account.create({
    name: data.name,
    code: generateLinkedAccountCode(),
    type: accountType,
    group: accountGroup,
    isSystemAccount: false,
    openingBalance: {
      debit: data.openingBalance > 0 ? data.openingBalance : 0,
      credit: data.openingBalance < 0 ? Math.abs(data.openingBalance) : 0,
    },
    businessId,
    createdBy: userId,
    updatedBy: userId,
  });

  let party;
  try {
    party = await Party.create({
      ...data,
      linkedAccountId: linkedAccount._id,
      businessId,
      createdBy: userId,
      updatedBy: userId,
    });
  } catch (err) {
    // Prevent orphan linked accounts if party insert fails.
    await Account.deleteOne({ _id: linkedAccount._id }).catch(() => {});
    if (err?.code === 11000 && err?.keyPattern?.businessId) {
      throw ApiError.conflict('Legacy unique index on businessId is blocking party creation. Please retry once after server restart.');
    }
    throw err;
  }

  // Back-link account to party
  linkedAccount.linkedPartyId = party._id;
  await linkedAccount.save();

  return party;
}

export async function listParties(businessId, filters = {}) {
  const query = { businessId };
  if (filters.type) query.type = filters.type;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { gstin: { $regex: filters.search, $options: 'i' } },
    ];
  }

  return Party.find(query).sort({ name: 1 });
}

export async function getPartyById(id, businessId) {
  const party = await Party.findOne({ _id: id, businessId })
    .populate('linkedAccountId', 'name code type')
    .populate('contractorSettings.consumeMaterialCentreId', 'name code')
    .populate('contractorSettings.outputMaterialCentreId', 'name code')
    .populate('contractorSettings.linkedUserId', 'name email')
    .populate('contractorSettings.itemRates.itemId', 'name sku unit');
  if (!party) throw ApiError.notFound('Party not found');
  return party;
}

export async function getPartyLedger(partyId, businessId, filters = {}, actor = {}) {
  const party = await Party.findOne({ _id: partyId, businessId }).select('linkedAccountId contractorSettings.linkedUserId');
  if (!party) throw ApiError.notFound('Party not found');

  if (actor.role === ROLES.CONTRACTOR) {
    const linkedUserId = party.contractorSettings?.linkedUserId;
    if (String(linkedUserId) !== String(actor.userId)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
  }

  if (!party.linkedAccountId) {
    throw ApiError.badRequest('Linked account not found for this party');
  }

  return getAccountLedger(party.linkedAccountId, businessId, filters);
}

export async function updateParty(id, data, businessId, userId) {
  const party = await Party.findOne({ _id: id, businessId });
  if (!party) throw ApiError.notFound('Party not found');

  // Check if contractor settings are being enabled for a non-contractor party
  // Use data.type if provided (array), otherwise fall back to existing party.type
  const typeToCheck = data.type !== undefined ? data.type : party.type;
  if (data.contractorSettings?.isEnabled && !typeToCheck?.includes(PARTY_TYPES.CONTRACTOR)) {
    throw ApiError.badRequest('Contractor settings can be set only for contractor party type');
  }
  if (data.contractorSettings?.linkedUserId) {
    const linked = await User.findOne({
      _id: data.contractorSettings.linkedUserId,
      businesses: { $elemMatch: { businessId, isActive: true } },
    }).select('_id');
    if (!linked) throw ApiError.badRequest('Linked contractor user must be an active member of this business');
  }

  // If name changed, update linked account name too
  if (data.name && data.name !== party.name && party.linkedAccountId) {
    await Account.findByIdAndUpdate(party.linkedAccountId, {
      name: data.name,
      updatedBy: userId,
    });
  }

  Object.assign(party, data, { updatedBy: userId });
  return party.save();
}

export async function deleteParty(id, businessId, userId) {
  const party = await Party.findOne({ _id: id, businessId });
  if (!party) throw ApiError.notFound('Party not found');

  // Soft-delete linked account too
  if (party.linkedAccountId) {
    const account = await Account.findById(party.linkedAccountId);
    if (account) await account.softDelete(userId);
  }

  return party.softDelete(userId);
}
