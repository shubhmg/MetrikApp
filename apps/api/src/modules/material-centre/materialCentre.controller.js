import * as mcService from './materialCentre.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const mc = await mcService.createMC(req.body, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { materialCentre: mc } });
});

export const list = catchAsync(async (req, res) => {
  const materialCentres = await mcService.listMCs(req.businessId);
  res.json({ success: true, data: { materialCentres } });
});

export const getById = catchAsync(async (req, res) => {
  const mc = await mcService.getMCById(req.params.id, req.businessId);
  res.json({ success: true, data: { materialCentre: mc } });
});

export const update = catchAsync(async (req, res) => {
  const mc = await mcService.updateMC(req.params.id, req.body, req.businessId, req.user._id);
  res.json({ success: true, data: { materialCentre: mc } });
});

export const remove = catchAsync(async (req, res) => {
  await mcService.deleteMC(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, message: 'Material centre deleted' });
});
