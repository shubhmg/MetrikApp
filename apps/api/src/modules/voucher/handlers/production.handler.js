import ApiError from '../../../utils/ApiError.js';
import Party from '../../party/party.model.js';
import Item from '../../item/item.model.js';
import { PARTY_TYPES } from '../../../config/constants.js';

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

const DOZEN_UNITS = new Set(['dozen', 'dozens', 'doz', 'dzn', 'dz']);

function isDozenUnit(unit) {
  return DOZEN_UNITS.has(String(unit || '').trim().toLowerCase());
}

function getContractorAmount(outputQty, rate, rateUom, outputUnit) {
  if (!rate || rate <= 0 || !outputQty || outputQty <= 0) return 0;
  if (rateUom === 'per_dozen') {
    return isDozenUnit(outputUnit) ? outputQty * rate : (outputQty / 12) * rate;
  }
  return outputQty * rate;
}

export async function validate(data) {
  if (!data.materialCentreId) throw ApiError.badRequest('Material centre is required for production');

  const minItems = data.bomId ? 1 : 2;
  if (!data.lineItems || data.lineItems.length < minItems) {
    throw ApiError.badRequest(
      data.bomId
        ? 'Production requires at least 1 output and 1 input line item'
        : 'Production requires at least 1 output and 1 input line item'
    );
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

  if (data.productionMode === 'contractor') {
    if (!data.contractorPartyId) throw ApiError.badRequest('Contractor is required for contractor production');
    if (!data.outputMaterialCentreId) throw ApiError.badRequest('Output material centre is required for contractor production');

    const contractor = await Party.findOne({ _id: data.contractorPartyId, businessId: data.businessId })
      .select('type contractorSettings');
    if (!contractor) throw ApiError.badRequest('Invalid contractor party');
    if (!contractor.type?.includes(PARTY_TYPES.CONTRACTOR)) {
      throw ApiError.badRequest('Selected party is not a contractor');
    }

    const settings = contractor.contractorSettings || {};
    if (!settings.isEnabled) {
      throw ApiError.badRequest('Contractor workflow is not enabled for this contractor');
    }

    if (settings.linkedUserId && String(settings.linkedUserId) !== String(data.userId)) {
      throw ApiError.forbidden('This contractor is linked to another user');
    }

    if (settings.consumeMaterialCentreId && String(settings.consumeMaterialCentreId) !== String(data.materialCentreId)) {
      throw ApiError.badRequest('Raw material consumption MC must match contractor consume MC');
    }
    if (settings.outputMaterialCentreId && String(settings.outputMaterialCentreId) !== String(data.outputMaterialCentreId)) {
      throw ApiError.badRequest('Output MC must match contractor output MC');
    }
    if (String(data.materialCentreId) === String(data.outputMaterialCentreId)) {
      throw ApiError.badRequest('Consume MC and output MC cannot be the same in contractor mode');
    }

    const outputItemId = String(output.itemId);
    const itemRate = (settings.itemRates || []).find((r) => String(r.itemId) === outputItemId);
    if (!itemRate) {
      throw ApiError.badRequest('This contractor is not assigned to produce the selected output item');
    }

    const outputItem = await Item.findOne({ _id: output.itemId, businessId: data.businessId }).select('unit');
    if (!outputItem) throw ApiError.badRequest('Output item not found');

    data.contractorRate = Number(itemRate.rate || 0);
    data.contractorRateUom = itemRate.rateUom || 'per_dozen';
    data.contractorAmount = Number(
      getContractorAmount(output.quantity, data.contractorRate, data.contractorRateUom, outputItem.unit).toFixed(2)
    );
  } else {
    data.productionMode = 'manual';
    data.outputMaterialCentreId = data.outputMaterialCentreId || data.materialCentreId;
    data.contractorPartyId = null;
    data.contractorRate = 0;
    data.contractorRateUom = null;
    data.contractorAmount = 0;
  }
}

export function getInventoryEntries(voucher) {
  const entries = [];
  const consumeMc = voucher.materialCentreId;
  const outputMc = voucher.outputMaterialCentreId || voucher.materialCentreId;

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
      materialCentreId: li.materialCentreId || consumeMc,
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
    materialCentreId: output.materialCentreId || outputMc,
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

export function getJournalEntries(voucher) {
  if (voucher.productionMode !== 'contractor') {
    // No separate accounting for manual production.
    return [];
  }

  const amount = Number(voucher.contractorAmount || 0);
  if (amount <= 0) return [];

  return [
    {
      businessId: voucher.businessId,
      voucherId: voucher._id,
      voucherType: voucher.voucherType,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      debit: amount,
      credit: 0,
      narration: `Contractor production charges: ${voucher.voucherNumber}`,
      financialYear: voucher.financialYear,
      _accountCode: 'MFG_EXP',
    },
    {
      businessId: voucher.businessId,
      voucherId: voucher._id,
      voucherType: voucher.voucherType,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      debit: 0,
      credit: amount,
      narration: `Contractor payable: ${voucher.voucherNumber}`,
      financialYear: voucher.financialYear,
      _accountCode: 'PARTY',
      _partyId: voucher.contractorPartyId,
    },
  ];
}

export default { validate, getInventoryEntries, getJournalEntries };
