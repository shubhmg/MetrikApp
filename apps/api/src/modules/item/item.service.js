import mongoose from 'mongoose';
import Item from './item.model.js';
import ItemGroup from './itemGroup.model.js';
import Unit from './unit.model.js';
import BillOfMaterial from '../bom/bom.model.js';
import InventoryLedger from '../voucher/inventoryLedger.model.js';
import ApiError from '../../utils/ApiError.js';

const DEFAULT_UNITS = [
  { name: 'Pieces', symbol: 'pcs' },
  { name: 'Kilogram', symbol: 'kg' },
  { name: 'Gram', symbol: 'g' },
  { name: 'Litre', symbol: 'ltr' },
  { name: 'Millilitre', symbol: 'ml' },
  { name: 'Meter', symbol: 'm' },
  { name: 'Dozen', symbol: 'dozen' },
];

// ─── ItemGroup ───

export async function createItemGroup(data, businessId, userId) {
  const exists = await ItemGroup.findOne({ businessId, code: data.code });
  if (exists) throw ApiError.conflict(`Item group code "${data.code}" already exists`);

  return ItemGroup.create({ ...data, businessId, createdBy: userId, updatedBy: userId });
}

export async function listItemGroups(businessId) {
  return ItemGroup.find({ businessId }).sort({ type: 1, name: 1 });
}

export async function getItemGroupById(id, businessId) {
  const group = await ItemGroup.findOne({ _id: id, businessId });
  if (!group) throw ApiError.notFound('Item group not found');
  return group;
}

export async function updateItemGroup(id, data, businessId, userId) {
  const group = await ItemGroup.findOne({ _id: id, businessId });
  if (!group) throw ApiError.notFound('Item group not found');

  Object.assign(group, data, { updatedBy: userId });
  return group.save();
}

export async function deleteItemGroup(id, businessId, userId) {
  const group = await ItemGroup.findOne({ _id: id, businessId });
  if (!group) throw ApiError.notFound('Item group not found');

  const itemCount = await Item.countDocuments({ businessId, itemGroupId: id });
  if (itemCount > 0) throw ApiError.badRequest('Cannot delete group with existing items');

  return group.softDelete(userId);
}

// ─── Item ───

export async function createItem(data, businessId, userId) {
  const exists = await Item.findOne({ businessId, sku: data.sku });
  if (exists) throw ApiError.conflict(`SKU "${data.sku}" already exists`);

  const group = await ItemGroup.findOne({ _id: data.itemGroupId, businessId });
  if (!group) throw ApiError.badRequest('Invalid item group');

  const unit = await Unit.findOne({ _id: data.unitId, businessId });
  if (!unit) throw ApiError.badRequest('Invalid unit');

  return Item.create({
    ...data,
    unit: unit.symbol,
    businessId,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function listItems(businessId, filters = {}) {
  const query = { businessId };
  if (filters.itemGroupId) query.itemGroupId = filters.itemGroupId;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { sku: { $regex: filters.search, $options: 'i' } },
    ];
  }

  return Item.find(query)
    .populate('itemGroupId', 'name code type')
    .populate('unitId', 'name symbol')
    .sort({ name: 1 });
}

export async function getItemById(id, businessId) {
  const item = await Item.findOne({ _id: id, businessId })
    .populate('itemGroupId', 'name code type')
    .populate('unitId', 'name symbol');
  if (!item) throw ApiError.notFound('Item not found');
  return item;
}

export async function updateItem(id, data, businessId, userId) {
  const item = await Item.findOne({ _id: id, businessId });
  if (!item) throw ApiError.notFound('Item not found');

  if (data.unitId) {
    const unit = await Unit.findOne({ _id: data.unitId, businessId });
    if (!unit) throw ApiError.badRequest('Invalid unit');
    data.unit = unit.symbol;
  }

  Object.assign(item, data, { updatedBy: userId });
  return item.save();
}

export async function deleteItem(id, businessId, userId) {
  const item = await Item.findOne({ _id: id, businessId });
  if (!item) throw ApiError.notFound('Item not found');

  // Block deletion if item is used in any active BOM
  const bomCount = await BillOfMaterial.countDocuments({
    businessId,
    $or: [{ outputItemId: id }, { 'inputs.itemId': id }],
    isDeleted: false,
  });
  if (bomCount > 0) {
    throw ApiError.badRequest('Cannot delete item that is used in a Bill of Materials');
  }

  return item.softDelete(userId);
}

// ─── Unit ───

async function ensureDefaultUnits(businessId, userId) {
  const count = await Unit.countDocuments({ businessId });
  if (count > 0) return;
  await Unit.insertMany(
    DEFAULT_UNITS.map((u) => ({
      ...u,
      businessId,
      createdBy: userId,
      updatedBy: userId,
    }))
  );
}

export async function listUnits(businessId, userId) {
  await ensureDefaultUnits(businessId, userId);
  return Unit.find({ businessId }).sort({ name: 1 });
}

export async function createUnit(data, businessId, userId) {
  const exists = await Unit.findOne({ businessId, symbol: data.symbol });
  if (exists) throw ApiError.conflict(`Unit symbol "${data.symbol}" already exists`);
  return Unit.create({ ...data, businessId, createdBy: userId, updatedBy: userId });
}

export async function updateUnit(id, data, businessId, userId) {
  const unit = await Unit.findOne({ _id: id, businessId });
  if (!unit) throw ApiError.notFound('Unit not found');
  Object.assign(unit, data, { updatedBy: userId });
  return unit.save();
}

export async function deleteUnit(id, businessId, userId) {
  const used = await Item.countDocuments({ businessId, unitId: id });
  if (used > 0) {
    throw ApiError.badRequest('Cannot delete unit linked to items');
  }
  const unit = await Unit.findOne({ _id: id, businessId });
  if (!unit) throw ApiError.notFound('Unit not found');
  return unit.softDelete(userId);
}

// ─── Item Ledger ───

function parseFinancialYearRange(financialYear) {
  const parts = String(financialYear || '').split('-');
  const startYear = parseInt(parts[0], 10);
  if (Number.isNaN(startYear)) return null;
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
}

export async function getItemLedger(itemId, businessId, filters = {}) {
  const businessObjectId = typeof businessId === 'string' ? new mongoose.Types.ObjectId(businessId) : businessId;
  const itemObjectId = typeof itemId === 'string' ? new mongoose.Types.ObjectId(itemId) : itemId;
  const mcObjectId = filters.materialCentreId
    ? (typeof filters.materialCentreId === 'string' ? new mongoose.Types.ObjectId(filters.materialCentreId) : filters.materialCentreId)
    : null;
  const allowedMcIds = (filters.allowedMaterialCentreIds || []).map((id) =>
    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
  );

  const item = await Item.findOne({ _id: itemObjectId, businessId: businessObjectId }).populate('itemGroupId', 'name code type');
  if (!item) throw ApiError.notFound('Item not found');

  const query = {
    businessId: businessObjectId,
    itemId: itemObjectId,
  };

  if (allowedMcIds.length > 0) {
    if (mcObjectId && !allowedMcIds.some((id) => id.toString() === mcObjectId.toString())) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    query.materialCentreId = mcObjectId ? mcObjectId : { $in: allowedMcIds };
  } else if (mcObjectId) {
    query.materialCentreId = mcObjectId;
  }

  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
    if (filters.toDate) {
      const end = new Date(filters.toDate);
      end.setUTCHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  } else if (filters.financialYear) {
    const range = parseFinancialYearRange(filters.financialYear);
    if (range) {
      query.date = { $gte: range.start, $lte: range.end };
    }
  }

  const entries = await InventoryLedger.find(query)
    .populate('materialCentreId', 'name code')
    .sort({ date: 1, createdAt: 1 })
    .lean();

  // Opening balance (qty/value) before the filter window
  const preQuery = {
    businessId: businessObjectId,
    itemId: itemObjectId,
  };
  let hasPreQuery = false;

  if (allowedMcIds.length > 0) {
    preQuery.materialCentreId = mcObjectId ? mcObjectId : { $in: allowedMcIds };
  } else if (mcObjectId) {
    preQuery.materialCentreId = mcObjectId;
  }

  if (filters.fromDate) {
    preQuery.date = { $lt: new Date(filters.fromDate) };
    hasPreQuery = true;
  } else if (filters.financialYear) {
    const range = parseFinancialYearRange(filters.financialYear);
    if (range) {
      preQuery.date = { $lt: range.start };
      hasPreQuery = true;
    }
  }

  let openingQuantity = 0;
  let openingValue = 0;
  if (hasPreQuery) {
    const result = await InventoryLedger.aggregate([
      { $match: preQuery },
      {
        $group: {
          _id: null,
          inQty: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
          outQty: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } },
          inValue: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$value', 0] } },
          outValue: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$value', 0] } },
        },
      },
    ]);

    if (result.length > 0) {
      openingQuantity = (result[0].inQty || 0) - (result[0].outQty || 0);
      openingValue = (result[0].inValue || 0) - (result[0].outValue || 0);
    }
  }

  return {
    item,
    openingQuantity,
    openingValue,
    entries,
  };
}
