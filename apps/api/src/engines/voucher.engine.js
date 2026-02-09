import mongoose from 'mongoose';
import Voucher from '../modules/voucher/voucher.model.js';
import VoucherSequence from '../modules/voucher/voucherSequence.model.js';
import Account from '../modules/account/account.model.js';
import Party from '../modules/party/party.model.js';
import * as accountingEngine from './accounting.engine.js';
import * as inventoryEngine from './inventory.engine.js';
import ApiError from '../utils/ApiError.js';
import { VOUCHER_STATUS, VOUCHER_PREFIX, getFinancialYear } from '../config/constants.js';
import { emitAudit } from '../events/handlers/auditHandler.js';

/**
 * Voucher Engine - Central orchestration for voucher lifecycle.
 *
 * create()  → validate + generate number + save draft
 * post()    → finalize: inventory + accounting in transaction
 * cancel()  → reverse entries in transaction
 *
 * Type-specific handlers implement:
 *   validate(voucher) — business rule checks
 *   getInventoryEntries(voucher) — stock movements (can be empty)
 *   getJournalEntries(voucher) — debit/credit entries
 */

const handlers = new Map();

export function registerHandler(voucherType, handler) {
  handlers.set(voucherType, handler);
}

export function getHandler(voucherType) {
  const handler = handlers.get(voucherType);
  if (!handler) {
    throw ApiError.badRequest(`No handler registered for voucher type: ${voucherType}`);
  }
  return handler;
}

/**
 * Resolve _accountCode markers in journal entries to real accountId ObjectIds.
 * Handlers use _accountCode (e.g. 'SALES', 'PURCHASES', 'PARTY') as symbolic refs,
 * which this function resolves against the business's Chart of Accounts.
 */
async function resolveAccountIds(journalEntries, businessId) {
  // Collect unique account codes to resolve
  const codes = [...new Set(journalEntries.filter((e) => e._accountCode && e._accountCode !== 'PARTY').map((e) => e._accountCode))];

  // Batch-fetch system accounts by code
  const accounts = codes.length > 0
    ? await Account.find({ businessId, code: { $in: codes } })
    : [];
  const codeMap = {};
  for (const a of accounts) codeMap[a.code] = a._id;

  for (const entry of journalEntries) {
    if (entry._accountCode === 'PARTY' && entry._partyId) {
      // Resolve party's linked account
      const party = await Party.findById(entry._partyId);
      if (party && party.linkedAccountId) {
        entry.accountId = party.linkedAccountId;
      } else {
        throw ApiError.badRequest(`Party ${entry._partyId} has no linked account`);
      }
    } else if (entry._accountCode && codeMap[entry._accountCode]) {
      entry.accountId = codeMap[entry._accountCode];
    }

    // accountId must be set by now (either from handler directly, or resolved above)
    if (!entry.accountId) {
      throw ApiError.badRequest(`Could not resolve account for code: ${entry._accountCode}`);
    }

    // Clean up internal markers
    delete entry._accountCode;
    delete entry._partyId;
  }
}

/**
 * Create a draft voucher.
 * Generates voucher number atomically via VoucherSequence.
 */
export async function create(data, businessId, userId) {
  const handler = getHandler(data.voucherType);

  // Type-specific validation
  if (handler.validate) {
    await handler.validate(data);
  }

  const financialYear = getFinancialYear(new Date(data.date));
  const prefix = VOUCHER_PREFIX[data.voucherType];

  // Generate voucher number (not in transaction — sequence is independent)
  const voucherNumber = await VoucherSequence.getNextNumber(
    businessId,
    data.voucherType,
    financialYear,
    prefix
  );

  // Calculate totals from line items
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  if (data.lineItems && data.lineItems.length > 0) {
    for (const item of data.lineItems) {
      if (item.itemId) {
        // Item-based line: calculate amount from qty * rate
        item.amount = (item.quantity || 0) * (item.rate || 0);
        item.taxAmount = ((item.amount - (item.discount || 0)) * (item.gstRate || 0)) / 100;
        subtotal += item.amount;
        totalDiscount += item.discount || 0;
        totalTax += item.taxAmount;
      } else if (item.accountId) {
        // Account-based line: use debit/credit
        if (data.voucherType === 'payment') {
          subtotal += (item.credit || 0);
        } else {
          subtotal += (item.debit || 0);
        }
      }
    }
  }

  const grandTotal = subtotal - totalDiscount + totalTax;

  const voucher = await Voucher.create({
    ...data,
    businessId,
    voucherNumber,
    financialYear,
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal,
    status: VOUCHER_STATUS.DRAFT,
    createdBy: userId,
    updatedBy: userId,
  });

  emitAudit({
    businessId,
    userId,
    action: 'create',
    module: 'voucher',
    documentId: voucher._id,
    documentType: data.voucherType,
    after: voucher.toObject(),
  });

  return voucher;
}

/**
 * Check if the connected MongoDB supports transactions (replica set or mongos).
 * Standalone instances don't support transactions — we fall back to non-transactional mode in dev.
 */
async function supportsTransactions() {
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.serverStatus();
    // Replica set or sharded cluster
    return !!info.repl || info.process === 'mongos';
  } catch {
    return false;
  }
}

/**
 * Post a draft voucher — finalize with inventory + accounting.
 * Uses a transaction if replica set is available, otherwise runs without one (dev mode).
 */
export async function post(voucherId, businessId, userId, req) {
  const useTxn = await supportsTransactions();
  let session = null;

  if (useTxn) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const findOpts = session ? { session } : {};
    const voucher = await Voucher.findOne({ _id: voucherId, businessId }, null, findOpts);
    if (!voucher) throw ApiError.notFound('Voucher not found');
    if (voucher.status !== VOUCHER_STATUS.DRAFT) {
      throw ApiError.badRequest(`Cannot post voucher with status: ${voucher.status}`);
    }

    const handler = getHandler(voucher.voucherType);

    // Get inventory entries from handler
    const inventoryEntries = handler.getInventoryEntries
      ? handler.getInventoryEntries(voucher)
      : [];

    // Get journal entries from handler
    const journalEntries = handler.getJournalEntries
      ? handler.getJournalEntries(voucher)
      : [];

    // Post inventory (creates ledger docs + updates stock summary)
    if (inventoryEntries.length > 0) {
      await inventoryEngine.postEntries(inventoryEntries, session);
    }

    // Resolve symbolic account codes to real accountIds
    if (journalEntries.length > 0) {
      await resolveAccountIds(journalEntries, businessId);
      await accountingEngine.postEntries(journalEntries, session);
    }

    // Update voucher status
    voucher.status = VOUCHER_STATUS.POSTED;
    voucher.postedAt = new Date();
    voucher.postedBy = userId;
    voucher.updatedBy = userId;
    await voucher.save(session ? { session } : {});

    if (session) await session.commitTransaction();

    emitAudit({
      businessId,
      userId,
      action: 'post',
      module: 'voucher',
      documentId: voucher._id,
      documentType: voucher.voucherType,
      after: voucher.toObject(),
      req,
    });

    return voucher;
  } catch (err) {
    if (session) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

/**
 * Cancel a posted voucher — reverse all entries.
 * Uses a transaction if replica set is available.
 */
export async function cancel(voucherId, businessId, userId, reason, req) {
  const useTxn = await supportsTransactions();
  let session = null;

  if (useTxn) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const findOpts = session ? { session } : {};
    const voucher = await Voucher.findOne({ _id: voucherId, businessId }, null, findOpts);
    if (!voucher) throw ApiError.notFound('Voucher not found');
    if (voucher.status !== VOUCHER_STATUS.POSTED) {
      throw ApiError.badRequest(`Cannot cancel voucher with status: ${voucher.status}`);
    }

    // Reverse inventory entries
    await inventoryEngine.reverseEntries(voucherId, businessId, session);

    // Reverse accounting entries
    await accountingEngine.reverseEntries(voucherId, businessId, session);

    // Update voucher status
    const before = voucher.toObject();
    voucher.status = VOUCHER_STATUS.CANCELLED;
    voucher.cancelledAt = new Date();
    voucher.cancelledBy = userId;
    voucher.cancellationReason = reason;
    voucher.updatedBy = userId;
    await voucher.save(session ? { session } : {});

    if (session) await session.commitTransaction();

    emitAudit({
      businessId,
      userId,
      action: 'cancel',
      module: 'voucher',
      documentId: voucher._id,
      documentType: voucher.voucherType,
      before,
      after: voucher.toObject(),
      req,
    });

    return voucher;
  } catch (err) {
    if (session) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

export default { registerHandler, getHandler, create, post, cancel };
