import ApiError from '../../../utils/ApiError.js';

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
    if (!li.debit && !li.credit) throw ApiError.badRequest('Each line must have debit or credit');
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
    narration: li.narration || voucher.narration || `Receipt: ${voucher.voucherNumber}`,
  }));
}

export default { validate, getInventoryEntries, getJournalEntries };
