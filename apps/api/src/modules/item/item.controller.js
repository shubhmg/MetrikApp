import * as itemService from './item.service.js';
import catchAsync from '../../utils/catchAsync.js';

// ─── ItemGroup ───

export const createGroup = catchAsync(async (req, res) => {
  const group = await itemService.createItemGroup(req.body, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { itemGroup: group } });
});

export const listGroups = catchAsync(async (req, res) => {
  const groups = await itemService.listItemGroups(req.businessId);
  res.json({ success: true, data: { itemGroups: groups } });
});

export const getGroup = catchAsync(async (req, res) => {
  const group = await itemService.getItemGroupById(req.params.id, req.businessId);
  res.json({ success: true, data: { itemGroup: group } });
});

export const updateGroup = catchAsync(async (req, res) => {
  const group = await itemService.updateItemGroup(req.params.id, req.body, req.businessId, req.user._id);
  res.json({ success: true, data: { itemGroup: group } });
});

export const deleteGroup = catchAsync(async (req, res) => {
  await itemService.deleteItemGroup(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, message: 'Item group deleted' });
});

// ─── Item ───

export const create = catchAsync(async (req, res) => {
  const item = await itemService.createItem(req.body, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { item } });
});

export const list = catchAsync(async (req, res) => {
  const items = await itemService.listItems(req.businessId, req.query);
  res.json({ success: true, data: { items } });
});

export const getById = catchAsync(async (req, res) => {
  const item = await itemService.getItemById(req.params.id, req.businessId);
  res.json({ success: true, data: { item } });
});

export const update = catchAsync(async (req, res) => {
  const item = await itemService.updateItem(req.params.id, req.body, req.businessId, req.user._id);
  res.json({ success: true, data: { item } });
});

export const remove = catchAsync(async (req, res) => {
  await itemService.deleteItem(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, message: 'Item deleted' });
});
