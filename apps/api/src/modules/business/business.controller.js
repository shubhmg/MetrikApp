import * as businessService from './business.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const business = await businessService.createBusiness(req.body, req.user._id);
  res.status(201).json({ success: true, data: { business } });
});

export const list = catchAsync(async (req, res) => {
  const businesses = await businessService.getUserBusinesses(req.user._id);
  res.json({ success: true, data: { businesses } });
});

export const getById = catchAsync(async (req, res) => {
  const business = await businessService.getBusinessById(req.params.id, req.user._id);
  res.json({ success: true, data: { business } });
});

export const update = catchAsync(async (req, res) => {
  const business = await businessService.updateBusiness(req.params.id, req.body, req.user._id);
  res.json({ success: true, data: { business } });
});
