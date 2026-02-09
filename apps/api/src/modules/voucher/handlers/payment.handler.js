import ApiError from '../../../utils/ApiError.js';

/**
 * Payment handler (money going out).
 *
 * No inventory movement.
 * Accounting: Uses line items with accountId, debit, credit.
 *   Typically: Debit party (payable) / Credit Cash or Bank
 */

export function validate(data) {
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one line item is required');
  }
  for (const li of data.lineItems) {
    if (!li.accountId) throw ApiError.badRequest('Each line must have an accountId');
    if (!li.debit && !li.credit) throw ApiError.badRequest('Each line must have debit or credit');
  }
}

export function getInventoryEntries() {
  return []; // No inventory for payments
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
    narration: li.narration || voucher.narration || `Payment: ${voucher.voucherNumber}`,
  }));
}

export default { validate, getInventoryEntries, getJournalEntries };
