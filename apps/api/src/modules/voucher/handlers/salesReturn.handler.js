import ApiError from '../../../utils/ApiError.js';

/**
 * Sales Return (Credit Note) handler.
 *
 * Reverse of Sales Invoice:
 * Inventory: IN to MC (goods returned by customer)
 * Accounting: Credit party (reduce receivable) for grandTotal
 *             Debit Sales Returns for subtotal - discount
 *             Debit GST Output (reduce liability) for totalTax
 */

export function validate(data) {
  if (!data.partyId) throw ApiError.badRequest('Party is required for sales return');
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
      type: 'in', // stock comes back
      quantity: li.quantity,
      rate: li.rate,
      narration: `Sales return: ${voucher.voucherNumber}`,
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

  // Debit: Sales Returns
  const netAmount = voucher.subtotal - voucher.totalDiscount;
  if (netAmount > 0) {
    entries.push({
      ...common,
      debit: netAmount,
      credit: 0,
      narration: `Sales return: ${voucher.voucherNumber}`,
      _accountCode: 'SALES_RET',
    });
  }

  // Debit: GST Output reversal
  if (voucher.totalTax > 0) {
    entries.push({
      ...common,
      debit: voucher.totalTax,
      credit: 0,
      narration: `GST reversal on sales return: ${voucher.voucherNumber}`,
      _accountCode: 'GST_OUTPUT',
    });
  }

  // Credit: Party account (reduce receivable)
  entries.push({
    ...common,
    debit: 0,
    credit: voucher.grandTotal,
    narration: `Sales return from party: ${voucher.voucherNumber}`,
    _partyId: voucher.partyId,
    _accountCode: 'PARTY',
  });

  return entries;
}

export default { validate, getInventoryEntries, getJournalEntries };
