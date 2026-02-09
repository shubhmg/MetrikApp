import ApiError from '../../../utils/ApiError.js';

/**
 * Delivery Note handler.
 *
 * Inventory: OUT from MC (goods dispatched to customer)
 * Accounting: None — accounting is done on the Sales Invoice, not the delivery note.
 *
 * Delivery Note is typically linked to a Sales Order via linkedVouchers.
 * The Sales Invoice is then created referencing the delivery note.
 */

export function validate(data) {
  if (!data.partyId) throw ApiError.badRequest('Party (customer) is required for delivery note');
  if (!data.materialCentreId) throw ApiError.badRequest('Material centre is required for delivery note');
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
      type: 'out',
      quantity: li.quantity,
      rate: li.rate,
      narration: `Delivery: ${voucher.voucherNumber}`,
    }));
}

export function getJournalEntries() {
  return []; // No accounting on delivery note
}

export default { validate, getInventoryEntries, getJournalEntries };
