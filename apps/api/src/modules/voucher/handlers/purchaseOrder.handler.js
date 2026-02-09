import ApiError from '../../../utils/ApiError.js';

/**
 * Purchase Order handler.
 *
 * Non-posting voucher — no inventory or accounting entries.
 * Exists as a commitment record that can be linked/converted to:
 *   - GRN (receives goods)
 *   - Purchase Invoice (bills from vendor)
 *
 * Tracks ordered quantities; downstream vouchers reference via linkedVouchers.
 */

export function validate(data) {
  if (!data.partyId) throw ApiError.badRequest('Party (vendor) is required for purchase order');
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one line item is required');
  }
  for (const item of data.lineItems) {
    if (!item.itemId) throw ApiError.badRequest('Each line item must have an itemId');
    if (!item.quantity || item.quantity <= 0) throw ApiError.badRequest('Quantity must be positive');
    if (item.rate < 0) throw ApiError.badRequest('Rate cannot be negative');
  }
}

export function getInventoryEntries() {
  return [];
}

export function getJournalEntries() {
  return [];
}

export default { validate, getInventoryEntries, getJournalEntries };
