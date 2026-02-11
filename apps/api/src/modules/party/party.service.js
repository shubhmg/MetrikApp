import Party from './party.model.js';
import Account from '../account/account.model.js';
import { getAccountLedger } from '../account/account.service.js';
import User from '../auth/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { PARTY_TYPES, ROLES } from '../../config/constants.js';

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

export async function createParty(data, businessId, userId) {
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

  const party = await Party.create({
    ...data,
    linkedAccountId: linkedAccount._id,
    businessId,
    createdBy: userId,
    updatedBy: userId,
  });

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
  if (data.contractorSettings?.isEnabled && !(data.type || party.type || []).includes(PARTY_TYPES.CONTRACTOR)) {
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
