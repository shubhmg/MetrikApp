import ApiError from '../../../utils/ApiError.js';

/**
 * Purchase Return (Debit Note) handler.
 *
 * Reverse of Purchase Invoice:
 * Inventory: OUT from MC (goods returned to vendor)
 * Accounting: Debit party (reduce payable) for grandTotal
 *             Credit Purchase Returns for subtotal - discount
 *             Credit GST Input (reduce receivable) for totalTax
 */

export function validate(data) {
  if (!data.partyId) throw ApiError.badRequest('Party is required for purchase return');
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
      type: 'out', // stock goes back to vendor
      quantity: li.quantity,
      rate: li.rate,
      narration: `Purchase return: ${voucher.voucherNumber}`,
    }));
}

export function getJournalEntries(voucher) {
  const entries = [];
  const common = {
    businessId: voucher.businessId,
    voucherId: voucher._id,
    voucherType: voucher.voucherType,
    voucherNumber: voucher.voucherNumber,
    date: voucher.date,
    financialYear: voucher.financialYear,
  };

  // Debit: Party account (reduce payable)
  entries.push({
    ...common,
    debit: voucher.grandTotal,
    credit: 0,
    narration: `Purchase return to party: ${voucher.voucherNumber}`,
    _partyId: voucher.partyId,
    _accountCode: 'PARTY',
  });

  // Credit: Purchase Returns
  const netAmount = voucher.subtotal - voucher.totalDiscount;
  if (netAmount > 0) {
    entries.push({
      ...common,
      debit: 0,
      credit: netAmount,
      narration: `Purchase return: ${voucher.voucherNumber}`,
      _accountCode: 'PURCHASE_RET',
    });
  }

  // Credit: GST Input reversal
  if (voucher.totalTax > 0) {
    entries.push({
      ...common,
      debit: 0,
      credit: voucher.totalTax,
      narration: `GST reversal on purchase return: ${voucher.voucherNumber}`,
      _accountCode: 'GST_INPUT',
    });
  }

  return entries;
}

export default { validate, getInventoryEntries, getJournalEntries };
