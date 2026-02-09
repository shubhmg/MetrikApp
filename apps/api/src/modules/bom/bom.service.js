import BillOfMaterial from './bom.model.js';
import Item from '../item/item.model.js';
import ItemGroup from '../item/itemGroup.model.js';
import Voucher from '../voucher/voucher.model.js';
import ApiError from '../../utils/ApiError.js';
import { BOM_STATUS, ITEM_GROUP_TYPES, VOUCHER_TYPES, VOUCHER_STATUS } from '../../config/constants.js';

const PRODUCIBLE_GROUP_TYPES = [ITEM_GROUP_TYPES.FINISHED_GOOD, ITEM_GROUP_TYPES.SEMI_FINISHED];

async function validateOutputItem(outputItemId, businessId) {
  const item = await Item.findOne({ _id: outputItemId, businessId }).populate('itemGroupId', 'type');
  if (!item) throw ApiError.notFound('Output item not found');
  if (!item.itemGroupId || !PRODUCIBLE_GROUP_TYPES.includes(item.itemGroupId.type)) {
    throw ApiError.badRequest('Output item must be a finished good or semi-finished good');
  }
  return item;
}

function validateInputs(inputs, outputItemId) {
  const seen = new Set();
  for (const input of inputs) {
    if (input.itemId === outputItemId.toString()) {
      throw ApiError.badRequest('Output item cannot be used as an input');
    }
    if (seen.has(input.itemId)) {
      throw ApiError.badRequest('Duplicate input items are not allowed');
    }
    seen.add(input.itemId);
  }
}

export async function createBom(data, businessId, userId) {
  await validateOutputItem(data.outputItemId, businessId);
  validateInputs(data.inputs, data.outputItemId);

  // Verify all input items exist
  const inputItemIds = data.inputs.map((i) => i.itemId);
  const existingItems = await Item.countDocuments({ _id: { $in: inputItemIds }, businessId });
  if (existingItems !== inputItemIds.length) {
    throw ApiError.badRequest('One or more input items not found');
  }

  return BillOfMaterial.create({
    ...data,
    version: 1,
    status: BOM_STATUS.DRAFT,
    businessId,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function listBoms(businessId, filters = {}) {
  const query = { businessId };
  if (filters.outputItemId) query.outputItemId = filters.outputItemId;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.name = { $regex: filters.search, $options: 'i' };
  }

  return BillOfMaterial.find(query)
    .populate('outputItemId', 'name sku')
    .populate('inputs.itemId', 'name sku unit')
    .populate('defaultMaterialCentreId', 'name code')
    .sort({ updatedAt: -1 });
}

export async function getBomById(id, businessId) {
  const bom = await BillOfMaterial.findOne({ _id: id, businessId })
    .populate('outputItemId', 'name sku unit')
    .populate('inputs.itemId', 'name sku unit')
    .populate('defaultMaterialCentreId', 'name code');
  if (!bom) throw ApiError.notFound('BOM not found');
  return bom;
}

export async function updateBom(id, data, businessId, userId) {
  const bom = await BillOfMaterial.findOne({ _id: id, businessId });
  if (!bom) throw ApiError.notFound('BOM not found');
  if (bom.status !== BOM_STATUS.DRAFT) {
    throw ApiError.badRequest('Only draft BOMs can be edited');
  }

  if (data.inputs) {
    validateInputs(data.inputs, bom.outputItemId);
    const inputItemIds = data.inputs.map((i) => i.itemId);
    const existingItems = await Item.countDocuments({ _id: { $in: inputItemIds }, businessId });
    if (existingItems !== inputItemIds.length) {
      throw ApiError.badRequest('One or more input items not found');
    }
  }

  Object.assign(bom, data, { updatedBy: userId });
  return bom.save();
}

export async function activateBom(id, businessId, userId) {
  const bom = await BillOfMaterial.findOne({ _id: id, businessId });
  if (!bom) throw ApiError.notFound('BOM not found');
  if (bom.status !== BOM_STATUS.DRAFT) {
    throw ApiError.badRequest('Only draft BOMs can be activated');
  }

  // Archive any existing active BOM for the same output item
  await BillOfMaterial.updateMany(
    { businessId, outputItemId: bom.outputItemId, status: BOM_STATUS.ACTIVE },
    { status: BOM_STATUS.ARCHIVED, updatedBy: userId }
  );

  bom.status = BOM_STATUS.ACTIVE;
  bom.updatedBy = userId;
  return bom.save();
}

export async function archiveBom(id, businessId, userId) {
  const bom = await BillOfMaterial.findOne({ _id: id, businessId });
  if (!bom) throw ApiError.notFound('BOM not found');
  if (bom.status !== BOM_STATUS.ACTIVE) {
    throw ApiError.badRequest('Only active BOMs can be archived');
  }

  bom.status = BOM_STATUS.ARCHIVED;
  bom.updatedBy = userId;
  return bom.save();
}

export async function deleteBom(id, businessId, userId) {
  const bom = await BillOfMaterial.findOne({ _id: id, businessId });
  if (!bom) throw ApiError.notFound('BOM not found');

  // Block deletion if used in any posted production voucher
  const usedCount = await Voucher.countDocuments({
    businessId,
    bomId: id,
    status: VOUCHER_STATUS.POSTED,
  });
  if (usedCount > 0) {
    throw ApiError.badRequest('Cannot delete BOM that has been used in posted production vouchers');
  }

  return bom.softDelete(userId);
}

export async function createNewVersion(id, businessId, userId) {
  const source = await BillOfMaterial.findOne({ _id: id, businessId });
  if (!source) throw ApiError.notFound('BOM not found');

  // Find the highest version for this output item
  const latest = await BillOfMaterial.findOne({ businessId, outputItemId: source.outputItemId })
    .sort({ version: -1 })
    .select('version');
  const nextVersion = (latest?.version || 0) + 1;

  return BillOfMaterial.create({
    outputItemId: source.outputItemId,
    name: source.name,
    description: source.description,
    version: nextVersion,
    status: BOM_STATUS.DRAFT,
    outputQuantity: source.outputQuantity,
    inputs: source.inputs.map((inp) => ({
      itemId: inp.itemId,
      quantity: inp.quantity,
      wastagePercent: inp.wastagePercent,
      narration: inp.narration,
    })),
    defaultMaterialCentreId: source.defaultMaterialCentreId,
    previousVersionId: source._id,
    businessId,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function getActiveBomForItem(outputItemId, businessId) {
  return BillOfMaterial.findOne({ businessId, outputItemId, status: BOM_STATUS.ACTIVE })
    .populate('outputItemId', 'name sku unit')
    .populate('inputs.itemId', 'name sku unit')
    .populate('defaultMaterialCentreId', 'name code');
}

export async function getVersionHistory(outputItemId, businessId) {
  return BillOfMaterial.find({ businessId, outputItemId })
    .select('name version status createdAt updatedAt')
    .sort({ version: -1 });
}

export function expandBomForProduction(bom, outputQuantity) {
  return bom.inputs.map((input) => {
    const baseQty = (input.quantity / bom.outputQuantity) * outputQuantity;
    const withWastage = baseQty * (1 + (input.wastagePercent || 0) / 100);
    return {
      itemId: input.itemId,
      quantity: Math.round(withWastage * 10000) / 10000,
      wastagePercent: input.wastagePercent || 0,
      narration: input.narration || '',
    };
  });
}
