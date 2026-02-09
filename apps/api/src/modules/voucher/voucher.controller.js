import * as voucherService from './voucher.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const voucher = await voucherService.createVoucher(req.body, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { voucher } });
});

export const list = catchAsync(async (req, res) => {
  const result = await voucherService.listVouchers(req.businessId, req.query);
  res.json({ success: true, data: result });
});

export const getById = catchAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherById(req.params.id, req.businessId);
  res.json({ success: true, data: { voucher } });
});

export const post = catchAsync(async (req, res) => {
  const voucher = await voucherService.postVoucher(req.params.id, req.businessId, req.user._id, req);
  res.json({ success: true, data: { voucher } });
});

export const cancel = catchAsync(async (req, res) => {
  const voucher = await voucherService.cancelVoucher(
    req.params.id,
    req.businessId,
    req.user._id,
    req.body.reason,
    req
  );
  res.json({ success: true, data: { voucher } });
});

export const getStockSummary = catchAsync(async (req, res) => {
  const stock = await voucherService.getStockSummary(req.businessId, req.query);
  res.json({ success: true, data: { stock } });
});
