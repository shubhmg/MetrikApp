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
 * create()  → validate + generate number + post inventory/accounting + save as posted
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
 * Calculate totals from line items.
 * Returns { subtotal, totalDiscount, totalTax, grandTotal } and mutates line items
 * with computed amount/taxAmount.
 */
export function calculateTotals(lineItems, voucherType) {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  if (lineItems && lineItems.length > 0) {
    for (const item of lineItems) {
      if (item.itemId) {
        item.amount = (item.quantity || 0) * (item.rate || 0);
        item.taxAmount = ((item.amount - (item.discount || 0)) * (item.gstRate || 0)) / 100;
        subtotal += item.amount;
        totalDiscount += item.discount || 0;
        totalTax += item.taxAmount;
      } else if (item.accountId) {
        if (voucherType === 'payment') {
          subtotal += (item.credit || 0);
        } else {
          subtotal += (item.debit || 0);
        }
      }
    }
  }

  const grandTotal = subtotal - totalDiscount + totalTax;
  return { subtotal, totalDiscount, totalTax, grandTotal };
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
 * Create and immediately post a voucher — single atomic operation.
 * Validates, generates number, calculates totals, runs inventory + accounting engines,
 * and saves with status POSTED.
 * Uses a transaction if replica set is available, otherwise runs without one (dev mode).
 */
export async function create(data, businessId, userId) {
  const workingData = { ...data, businessId, userId };
  const handler = getHandler(data.voucherType);

  // Type-specific validation
  if (handler.validate) {
    await handler.validate(workingData);
  }

  const financialYear = getFinancialYear(new Date(data.date));
  const prefix = VOUCHER_PREFIX[workingData.voucherType];

  // Generate voucher number (not in transaction — sequence is independent)
  const voucherNumber = await VoucherSequence.getNextNumber(
    businessId,
    workingData.voucherType,
    financialYear,
    prefix
  );

  // Calculate totals from line items
  const { subtotal, totalDiscount, totalTax, grandTotal } = calculateTotals(workingData.lineItems, workingData.voucherType);

  const useTxn = await supportsTransactions();
  let session = null;

  if (useTxn) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    // Save the voucher as posted
    const now = new Date();
    const voucherDoc = new Voucher({
      ...workingData,
      businessId,
      voucherNumber,
      financialYear,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      status: VOUCHER_STATUS.POSTED,
      postedAt: now,
      postedBy: userId,
      createdBy: userId,
      updatedBy: userId,
    });

    await voucherDoc.save(session ? { session } : {});

    // Get inventory entries from handler
    const inventoryEntries = handler.getInventoryEntries
      ? handler.getInventoryEntries(voucherDoc)
      : [];

    // Get journal entries from handler
    const journalEntries = handler.getJournalEntries
      ? handler.getJournalEntries(voucherDoc)
      : [];

    // Post inventory (creates ledger docs + updates stock summary)
    if (inventoryEntries.length > 0) {
      await inventoryEngine.postEntries(inventoryEntries, session);
    }

    // Resolve symbolic account codes to real accountIds and post
    if (journalEntries.length > 0) {
      await resolveAccountIds(journalEntries, businessId);
      await accountingEngine.postEntries(journalEntries, session);
    }

    if (session) await session.commitTransaction();

    emitAudit({
      businessId,
      userId,
      action: 'create',
      module: 'voucher',
      documentId: voucherDoc._id,
      documentType: workingData.voucherType,
      after: voucherDoc.toObject(),
    });

    return voucherDoc;
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

// Types that don't post inventory/accounting entries (commitment records only)
const NON_POSTING_TYPES = ['sales_order', 'purchase_order'];

/**
 * Update a posted voucher.
 * Non-posting types (orders): direct update.
 * Posting types: reverse old entries → update doc → post new entries (same voucherNumber/_id).
 */
export async function update(voucherId, data, businessId, userId, req) {
  const voucher = await Voucher.findOne({ _id: voucherId, businessId });
  if (!voucher) throw ApiError.notFound('Voucher not found');
  if (voucher.status !== VOUCHER_STATUS.POSTED) {
    throw ApiError.badRequest(`Cannot edit voucher with status: ${voucher.status}`);
  }

  // Block if downstream linked vouchers exist (e.g. PO converted to invoice, invoice with return)
  const downstream = await Voucher.findOne({
    'linkedVouchers.voucherId': voucherId,
    status: VOUCHER_STATUS.POSTED,
    businessId,
  });
  if (downstream) {
    throw ApiError.badRequest(
      `Cannot edit: voucher has downstream linked voucher ${downstream.voucherNumber}`
    );
  }

  // Date change cannot cross financial year boundary
  const newDate = new Date(data.date);
  const newFY = getFinancialYear(newDate);
  if (newFY !== voucher.financialYear) {
    throw ApiError.badRequest(
      `Date change would cross financial year boundary (${voucher.financialYear} → ${newFY}). Create a new voucher instead.`
    );
  }

  const handler = getHandler(voucher.voucherType);
  const before = voucher.toObject();

  // Validate new data using handler
  const workingData = { ...data, voucherType: voucher.voucherType, businessId, userId };
  if (handler.validate) {
    await handler.validate(workingData);
  }

  // Recalculate totals
  const { subtotal, totalDiscount, totalTax, grandTotal } = calculateTotals(workingData.lineItems, voucher.voucherType);

  if (NON_POSTING_TYPES.includes(voucher.voucherType)) {
    // --- Non-posting path: direct update ---
    voucher.date = newDate;
    voucher.partyId = workingData.partyId || voucher.partyId;
    voucher.materialCentreId = workingData.materialCentreId || voucher.materialCentreId;
    voucher.lineItems = workingData.lineItems;
    voucher.narration = workingData.narration ?? voucher.narration;
    voucher.bomId = workingData.bomId || voucher.bomId;
    voucher.outputMaterialCentreId = workingData.outputMaterialCentreId || workingData.materialCentreId || voucher.outputMaterialCentreId;
    voucher.productionMode = workingData.productionMode || voucher.productionMode || 'manual';
    voucher.contractorPartyId = workingData.contractorPartyId || null;
    voucher.contractorRate = workingData.contractorRate ?? 0;
    voucher.contractorRateUom = workingData.contractorRateUom ?? null;
    voucher.contractorAmount = workingData.contractorAmount ?? 0;
    voucher.fromMaterialCentreId = workingData.fromMaterialCentreId || voucher.fromMaterialCentreId;
    voucher.toMaterialCentreId = workingData.toMaterialCentreId || voucher.toMaterialCentreId;
    voucher.subtotal = subtotal;
    voucher.totalDiscount = totalDiscount;
    voucher.totalTax = totalTax;
    voucher.grandTotal = grandTotal;
    voucher.updatedBy = userId;
    await voucher.save();

    emitAudit({
      businessId,
      userId,
      action: 'update',
      module: 'voucher',
      documentId: voucher._id,
      documentType: voucher.voucherType,
      before,
      after: voucher.toObject(),
      req,
    });

    return voucher;
  }

  // --- Posting path: reverse old entries → update → post new entries ---
  const useTxn = await supportsTransactions();
  let session = null;

  if (useTxn) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const findOpts = session ? { session } : {};

    // Reverse old inventory + accounting entries
    await inventoryEngine.reverseEntries(voucherId, businessId, session);
    await accountingEngine.reverseEntries(voucherId, businessId, session);

    // Update voucher document with new data
    voucher.date = newDate;
    voucher.partyId = workingData.partyId || voucher.partyId;
    voucher.materialCentreId = workingData.materialCentreId || voucher.materialCentreId;
    voucher.lineItems = workingData.lineItems;
    voucher.narration = workingData.narration ?? voucher.narration;
    voucher.bomId = workingData.bomId || voucher.bomId;
    voucher.outputMaterialCentreId = workingData.outputMaterialCentreId || workingData.materialCentreId || voucher.outputMaterialCentreId;
    voucher.productionMode = workingData.productionMode || voucher.productionMode || 'manual';
    voucher.contractorPartyId = workingData.contractorPartyId || null;
    voucher.contractorRate = workingData.contractorRate ?? 0;
    voucher.contractorRateUom = workingData.contractorRateUom ?? null;
    voucher.contractorAmount = workingData.contractorAmount ?? 0;
    voucher.fromMaterialCentreId = workingData.fromMaterialCentreId || voucher.fromMaterialCentreId;
    voucher.toMaterialCentreId = workingData.toMaterialCentreId || voucher.toMaterialCentreId;
    voucher.subtotal = subtotal;
    voucher.totalDiscount = totalDiscount;
    voucher.totalTax = totalTax;
    voucher.grandTotal = grandTotal;
    voucher.updatedBy = userId;

    await voucher.save(session ? { session } : {});

    // Get new entries from handler
    const inventoryEntries = handler.getInventoryEntries
      ? handler.getInventoryEntries(voucher)
      : [];
    const journalEntries = handler.getJournalEntries
      ? handler.getJournalEntries(voucher)
      : [];

    // Post new inventory entries
    if (inventoryEntries.length > 0) {
      await inventoryEngine.postEntries(inventoryEntries, session);
    }

    // Resolve account codes and post new journal entries
    if (journalEntries.length > 0) {
      await resolveAccountIds(journalEntries, businessId);
      await accountingEngine.postEntries(journalEntries, session);
    }

    if (session) await session.commitTransaction();

    emitAudit({
      businessId,
      userId,
      action: 'update',
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

export default { registerHandler, getHandler, create, cancel, update };
