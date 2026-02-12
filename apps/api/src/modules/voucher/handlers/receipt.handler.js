import ApiError from '../../../utils/ApiError.js';
import mongoose from 'mongoose';

/**
 * Receipt handler (money coming in).
 *
 * No inventory movement.
 * Accounting: Uses line items with accountId, debit, credit.
 *   Typically: Debit Cash or Bank / Credit party (receivable)
 */

export function validate(data) {
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one line item is required');
  }
  for (const li of data.lineItems) {
    if (!li.accountId) throw ApiError.badRequest('Each line must have an accountId');
    if (!mongoose.isValidObjectId(li.accountId)) {
      throw ApiError.badRequest('Invalid account selected in receipt line');
    }
    if (!li.debit && !li.credit) throw ApiError.badRequest('Each line must have debit or credit');
  }
  // If partyId is present, ensure at least one line has debit (money received)
  if (data.partyId) {
    const totalDebitsInLines = data.lineItems.reduce((sum, li) => sum + (li.debit || 0), 0);
    if (totalDebitsInLines <= 0) {
      throw ApiError.badRequest('Receipt with a Party must have at least one debit entry (e.g., Cash/Bank account receiving money)');
    }
  }
}

export function getInventoryEntries() {
  return [];
}

export function getJournalEntries(voucher) {
  const common = {
    businessId: voucher.businessId,
    voucherId: voucher._id,
    voucherType: voucher.voucherType,
    voucherNumber: voucher.voucherNumber,
    date: voucher.date,
    financialYear: voucher.financialYear,
  };

  const entries = [];
  let totalAmount = 0;

  // Line items (Cash/Bank) - Debits
  for (const li of voucher.lineItems) {
    entries.push({
      ...common,
      accountId: li.accountId,
      debit: li.debit || 0,
      credit: li.credit || 0,
      narration: li.narration || voucher.narration || `Receipt: ${voucher.voucherNumber}`,
    });
    totalAmount += (li.debit || 0);
  }

  // Party Entry - Credit (if party is selected)
  if (voucher.partyId) {
    entries.push({
      ...common,
      _accountCode: 'PARTY',
      _partyId: voucher.partyId,
      debit: 0,
      credit: totalAmount,
      narration: voucher.narration || `Receipt from party`,
    });
  }

  return entries;
}

export default { validate, getInventoryEntries, getJournalEntries };
