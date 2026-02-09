import * as bomService from './bom.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const bom = await bomService.createBom(req.body, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { bom } });
});

export const list = catchAsync(async (req, res) => {
  const boms = await bomService.listBoms(req.businessId, req.query);
  res.json({ success: true, data: { boms } });
});

export const getById = catchAsync(async (req, res) => {
  const bom = await bomService.getBomById(req.params.id, req.businessId);
  res.json({ success: true, data: { bom } });
});

export const update = catchAsync(async (req, res) => {
  const bom = await bomService.updateBom(req.params.id, req.body, req.businessId, req.user._id);
  res.json({ success: true, data: { bom } });
});

export const remove = catchAsync(async (req, res) => {
  await bomService.deleteBom(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, message: 'BOM deleted' });
});

export const activate = catchAsync(async (req, res) => {
  const bom = await bomService.activateBom(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, data: { bom } });
});

export const archive = catchAsync(async (req, res) => {
  const bom = await bomService.archiveBom(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, data: { bom } });
});

export const newVersion = catchAsync(async (req, res) => {
  const bom = await bomService.createNewVersion(req.params.id, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { bom } });
});

export const getActiveForItem = catchAsync(async (req, res) => {
  const bom = await bomService.getActiveBomForItem(req.params.outputItemId, req.businessId);
  res.json({ success: true, data: { bom: bom || null } });
});

export const getVersionHistory = catchAsync(async (req, res) => {
  const versions = await bomService.getVersionHistory(req.params.outputItemId, req.businessId);
  res.json({ success: true, data: { versions } });
});

export const expand = catchAsync(async (req, res) => {
  const bom = await bomService.getBomById(req.query.bomId, req.businessId);
  const inputs = bomService.expandBomForProduction(bom, Number(req.query.outputQuantity));
  res.json({ success: true, data: { inputs, bom } });
});
