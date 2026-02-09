import ApiError from '../../../utils/ApiError.js';

/**
 * Production handler.
 *
 * Consumes input items per BOM and produces output item.
 *
 * Voucher lineItems convention:
 *   - First line item: OUTPUT (the finished/semi-finished good produced)
 *     quantity = produced qty, rate = cost per unit (calculated or manual)
 *   - Remaining line items: INPUTS (raw materials consumed per BOM)
 *     quantity = consumed qty, rate = cost per unit
 *
 * Inventory:
 *   - OUT for each input item (consumed from MC)
 *   - IN for output item (produced into MC)
 *
 * Accounting:
 *   - Debit Manufacturing Expenses for total input value
 *   - Credit Manufacturing Expenses for output value (net zero if costed correctly)
 *   OR simpler approach:
 *   - No journal entries (inventory-only voucher, cost flows through weighted avg)
 *
 * We use the simpler inventory-only approach: cost of inputs flows into the
 * output item's weighted average rate via the StockSummary engine.
 * Manufacturing expense impact shows up in reports via COGS/inventory valuation.
 */

export function validate(data) {
  if (!data.materialCentreId) throw ApiError.badRequest('Material centre is required for production');
  if (!data.lineItems || data.lineItems.length < 2) {
    throw ApiError.badRequest('Production requires at least 1 output and 1 input line item');
  }

  // First line is output, rest are inputs
  const output = data.lineItems[0];
  if (!output.itemId) throw ApiError.badRequest('Output item is required');
  if (!output.quantity || output.quantity <= 0) {
    throw ApiError.badRequest('Output quantity must be positive');
  }

  const inputs = data.lineItems.slice(1);
  for (const input of inputs) {
    if (!input.itemId) throw ApiError.badRequest('Each input item must have an itemId');
    if (!input.quantity || input.quantity <= 0) {
      throw ApiError.badRequest('Input quantity must be positive');
    }
  }
}

export function getInventoryEntries(voucher) {
  const entries = [];
  const mc = voucher.materialCentreId;

  // First line item = OUTPUT (produced)
  const output = voucher.lineItems[0];
  const inputs = voucher.lineItems.slice(1);

  // If no explicit output rate, calculate from sum of input costs
  let outputRate = output.rate;
  if (!outputRate || outputRate === 0) {
    const totalInputCost = inputs.reduce((sum, li) => sum + (li.quantity * li.rate), 0);
    outputRate = output.quantity > 0 ? totalInputCost / output.quantity : 0;
  }

  // OUT for each input (consumed)
  for (const li of inputs) {
    if (!li.itemId) continue;
    entries.push({
      businessId: voucher.businessId,
      itemId: li.itemId,
      materialCentreId: li.materialCentreId || mc,
      voucherId: voucher._id,
      voucherType: voucher.voucherType,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      type: 'out',
      quantity: li.quantity,
      rate: li.rate,
      narration: `Production input consumed: ${voucher.voucherNumber}`,
    });
  }

  // IN for output (produced)
  entries.push({
    businessId: voucher.businessId,
    itemId: output.itemId,
    materialCentreId: output.materialCentreId || mc,
    voucherId: voucher._id,
    voucherType: voucher.voucherType,
    voucherNumber: voucher.voucherNumber,
    date: voucher.date,
    type: 'in',
    quantity: output.quantity,
    rate: outputRate,
    narration: `Production output: ${voucher.voucherNumber}`,
  });

  return entries;
}

export function getJournalEntries() {
  // No separate accounting — cost flows through inventory weighted avg
  return [];
}

export default { validate, getInventoryEntries, getJournalEntries };
