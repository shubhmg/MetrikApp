import ApiError from '../../../utils/ApiError.js';

/**
 * GRN (Goods Received Note) handler.
 *
 * Inventory: IN to MC (goods received from vendor)
 * Accounting: None — accounting is done on the Purchase Invoice, not GRN.
 *
 * GRN is typically linked to a Purchase Order via linkedVouchers.
 * The Purchase Invoice is then created referencing the GRN.
 */

export function validate(data) {
  if (!data.partyId) throw ApiError.badRequest('Party (vendor) is required for GRN');
  if (!data.materialCentreId) throw ApiError.badRequest('Material centre is required for GRN');
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one line item is required');
  }
  for (const item of data.lineItems) {
    if (!item.itemId) throw ApiError.badRequest('Each line item must have an itemId');
    if (!item.quantity || item.quantity <= 0) throw ApiError.badRequest('Quantity must be positive');
  }
}

export function getInventoryEntries(voucher) {
  return voucher.lineItems
    .filter((li) => li.itemId)
    .map((li) => ({
      businessId: voucher.businessId,
      itemId: li.itemId,
      materialCentreId: li.materialCentreId || voucher.materialCentreId,
      voucherId: voucher._id,
      voucherType: voucher.voucherType,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      type: 'in',
      quantity: li.quantity,
      rate: li.rate,
      narration: `GRN: ${voucher.voucherNumber}`,
    }));
}

export function getJournalEntries() {
  return []; // No accounting on GRN
}

export default { validate, getInventoryEntries, getJournalEntries };
