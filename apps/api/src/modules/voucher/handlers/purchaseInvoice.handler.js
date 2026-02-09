import ApiError from '../../../utils/ApiError.js';

/**
 * Purchase Invoice handler.
 *
 * Inventory: IN to MC (items purchased)
 * Accounting: Debit Purchases for subtotal - discount
 *             Debit GST Input for totalTax
 *             Credit party (payable) for grandTotal
 */

export function validate(data) {
  if (!data.partyId) throw ApiError.badRequest('Party is required for purchase invoice');
  if (!data.lineItems || data.lineItems.length === 0) {
    throw ApiError.badRequest('At least one line item is required');
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
      narration: `Purchase: ${voucher.voucherNumber}`,
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

  // Debit: Purchases
  const netPurchases = voucher.subtotal - voucher.totalDiscount;
  if (netPurchases > 0) {
    entries.push({
      ...common,
      debit: netPurchases,
      credit: 0,
      narration: `Purchase: ${voucher.voucherNumber}`,
      _accountCode: 'PURCHASES',
    });
  }

  // Debit: GST Input
  if (voucher.totalTax > 0) {
    entries.push({
      ...common,
      debit: voucher.totalTax,
      credit: 0,
      narration: `GST on purchase: ${voucher.voucherNumber}`,
      _accountCode: 'GST_INPUT',
    });
  }

  // Credit: Party account (payable)
  entries.push({
    ...common,
    accountId: voucher.partyId,
    debit: 0,
    credit: voucher.grandTotal,
    narration: `Purchase from party: ${voucher.voucherNumber}`,
    _partyId: voucher.partyId,
    _accountCode: 'PARTY',
  });

  return entries;
}

export default { validate, getInventoryEntries, getJournalEntries };
