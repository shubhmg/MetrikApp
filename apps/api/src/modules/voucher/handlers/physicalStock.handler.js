import ApiError from '../../../utils/ApiError.js';

export function validate(data) {
  if (!data.materialCentreId) throw ApiError.badRequest('Material centre is required');
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one item is required');
  }
  for (const li of data.lineItems) {
    if (!li.itemId) throw ApiError.badRequest('Each line must have an itemId');
    if (li.quantity === 0) throw ApiError.badRequest('Quantity cannot be zero');
  }
}

export function getInventoryEntries(voucher) {
  const entries = [];

  for (const li of voucher.lineItems) {
    if (!li.itemId || !li.quantity) continue;

    const type = li.quantity > 0 ? 'in' : 'out';
    const quantity = Math.abs(li.quantity);

    entries.push({
      businessId: voucher.businessId,
      itemId: li.itemId,
      materialCentreId: voucher.materialCentreId,
      voucherId: voucher._id,
      voucherType: voucher.voucherType,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      type,
      quantity,
      rate: li.rate || 0,
      narration: `Physical Stock Adjustment: ${voucher.voucherNumber}`,
    });
  }

  return entries;
}

export function getJournalEntries() {
  return [];
}

export default { validate, getInventoryEntries, getJournalEntries };
