import Item from './item.model.js';
import ItemGroup from './itemGroup.model.js';
import BillOfMaterial from '../bom/bom.model.js';
import ApiError from '../../utils/ApiError.js';

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

  return Item.create({ ...data, businessId, createdBy: userId, updatedBy: userId });
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

  return Item.find(query).populate('itemGroupId', 'name code type').sort({ name: 1 });
}

export async function getItemById(id, businessId) {
  const item = await Item.findOne({ _id: id, businessId }).populate('itemGroupId', 'name code type');
  if (!item) throw ApiError.notFound('Item not found');
  return item;
}

export async function updateItem(id, data, businessId, userId) {
  const item = await Item.findOne({ _id: id, businessId });
  if (!item) throw ApiError.notFound('Item not found');

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
