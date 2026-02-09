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

    // NEW VALIDATION FOR PAYMENT WITH PARTY
    if (data.partyId && li.debit && li.debit > 0) {
      throw ApiError.badRequest('For a Payment with a Party, line items should only contain Credits (e.g., Cash/Bank accounts).');
    }
  }
  // If partyId is present, ensure total credits from line items > 0
  if (data.partyId) {
    const totalCreditsInLines = data.lineItems.reduce((sum, li) => sum + (li.credit || 0), 0);
    if (totalCreditsInLines <= 0) {
      throw ApiError.badRequest('For a Payment with a Party, total credits in line items must be greater than zero.');
    }
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

  const entries = [];
  let totalAmount = 0;

  // Line items (Cash/Bank) - Credits
  for (const li of voucher.lineItems) {
    entries.push({
      ...common,
      accountId: li.accountId,
      debit: li.debit || 0,
      credit: li.credit || 0,
      narration: li.narration || voucher.narration || `Payment: ${voucher.voucherNumber}`,
    });
    totalAmount += (li.credit || 0);
  }

  // Party Entry - Debit (if party is selected)
  if (voucher.partyId) {
    entries.push({
      ...common,
      _accountCode: 'PARTY',
      _partyId: voucher.partyId,
      debit: totalAmount,
      credit: 0,
      narration: voucher.narration || `Payment to party`,
    });
  }

  return entries;
}

export default { validate, getInventoryEntries, getJournalEntries };
