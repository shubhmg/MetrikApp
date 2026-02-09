import ApiError from '../../../utils/ApiError.js';

/**
 * Journal Voucher handler (general purpose).
 *
 * No inventory movement.
 * Accounting: Direct debit/credit entries from line items.
 */

export function validate(data) {
  if (!data.lineItems || data.lineItems.length < 2) {
    throw ApiError.badRequest('Journal voucher requires at least 2 line items');
  }
  for (const li of data.lineItems) {
    if (!li.accountId) throw ApiError.badRequest('Each line must have an accountId');
  }

  const totalDebit = data.lineItems.reduce((s, li) => s + (li.debit || 0), 0);
  const totalCredit = data.lineItems.reduce((s, li) => s + (li.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw ApiError.badRequest('Journal entries must balance: debit must equal credit');
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

  return voucher.lineItems.map((li) => ({
    ...common,
    accountId: li.accountId,
    debit: li.debit || 0,
    credit: li.credit || 0,
    narration: li.narration || voucher.narration || `Journal: ${voucher.voucherNumber}`,
  }));
}

export default { validate, getInventoryEntries, getJournalEntries };
