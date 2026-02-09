import ApiError from '../../../utils/ApiError.js';

/**
 * Sales Invoice handler.
 *
 * Inventory: OUT from MC (items sold)
 * Accounting: Debit party (receivable) for grandTotal
 *             Credit Sales for subtotal - discount
 *             Credit GST Output for totalTax
 */

export function validate(data) {
  if (!data.partyId) throw ApiError.badRequest('Party is required for sales invoice');
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one line item is required');
  }
  for (const item of data.lineItems) {
    if (!item.itemId) throw ApiError.badRequest('Each line item must have an itemId');
    if (!item.quantity || item.quantity <= 0) throw ApiError.badRequest('Quantity must be positive');
    if (item.rate < 0) throw ApiError.badRequest('Rate cannot be negative');
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
      narration: `Sales: ${voucher.voucherNumber}`,
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

  // Debit: Party account (receivable) for grand total
  entries.push({
    ...common,
    accountId: voucher.partyId, // resolved to linked account at post time
    debit: voucher.grandTotal,
    credit: 0,
    narration: `Sales to party: ${voucher.voucherNumber}`,
    _partyId: voucher.partyId,
    _accountCode: 'PARTY',
  });

  // Credit: Sales for net amount
  const netSales = voucher.subtotal - voucher.totalDiscount;
  if (netSales > 0) {
    entries.push({
      ...common,
      debit: 0,
      credit: netSales,
      narration: `Sales: ${voucher.voucherNumber}`,
      _accountCode: 'SALES',
    });
  }

  // Credit: GST Output for tax
  if (voucher.totalTax > 0) {
    entries.push({
      ...common,
      debit: 0,
      credit: voucher.totalTax,
      narration: `GST on sales: ${voucher.voucherNumber}`,
      _accountCode: 'GST_OUTPUT',
    });
  }

  return entries;
}

export default { validate, getInventoryEntries, getJournalEntries };
