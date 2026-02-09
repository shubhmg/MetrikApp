import ApiError from '../../../utils/ApiError.js';

/**
 * Stock Transfer handler (inter-MC).
 *
 * Inventory: OUT from source MC, IN to destination MC (same items, same qty).
 * Accounting: No journal entries (internal movement, no P&L impact).
 */

export function validate(data) {
  if (!data.fromMaterialCentreId) throw ApiError.badRequest('Source material centre is required');
  if (!data.toMaterialCentreId) throw ApiError.badRequest('Destination material centre is required');
  if (data.fromMaterialCentreId === data.toMaterialCentreId) {
    throw ApiError.badRequest('Source and destination must be different');
  }
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one item is required for stock transfer');
  }
  for (const li of data.lineItems) {
    if (!li.itemId) throw ApiError.badRequest('Each line must have an itemId');
    if (!li.quantity || li.quantity <= 0) throw ApiError.badRequest('Quantity must be positive');
  }
}

export function getInventoryEntries(voucher) {
  const entries = [];

  for (const li of voucher.lineItems) {
    if (!li.itemId) continue;

    // OUT from source
    entries.push({
      businessId: voucher.businessId,
      itemId: li.itemId,
      materialCentreId: voucher.fromMaterialCentreId,
      voucherId: voucher._id,
      voucherType: voucher.voucherType,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      type: 'out',
      quantity: li.quantity,
      rate: li.rate,
      narration: `Transfer out: ${voucher.voucherNumber}`,
    });

    // IN to destination
    entries.push({
      businessId: voucher.businessId,
      itemId: li.itemId,
      materialCentreId: voucher.toMaterialCentreId,
      voucherId: voucher._id,
      voucherType: voucher.voucherType,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      type: 'in',
      quantity: li.quantity,
      rate: li.rate,
      narration: `Transfer in: ${voucher.voucherNumber}`,
    });
  }

  return entries;
}

export function getJournalEntries() {
  return []; // No accounting for internal transfers
}

export default { validate, getInventoryEntries, getJournalEntries };
