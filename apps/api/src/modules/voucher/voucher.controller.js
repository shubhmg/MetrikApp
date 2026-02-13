import * as voucherService from './voucher.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { getInvoicePdfBuffer, scheduleInvoiceAutoPrint } from './invoicePrint.service.js';
import ApiError from '../../utils/ApiError.js';

export const create = catchAsync(async (req, res) => {
  const voucher = await voucherService.createVoucher(req.body, req.businessId, req.user._id);
  if (voucher.voucherType === 'sales_invoice') {
    scheduleInvoiceAutoPrint(voucher._id, req.businessId, req.user._id);
  }
  res.status(201).json({ success: true, data: { voucher } });
});

export const list = catchAsync(async (req, res) => {
  const result = await voucherService.listVouchers(req.businessId, req.query, {
    role: req.businessRole,
    permissions: req.businessPermissions,
  });
  res.json({ success: true, data: result });
});

export const getById = catchAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherById(req.params.id, req.businessId);
  res.json({ success: true, data: { voucher } });
});

export const update = catchAsync(async (req, res) => {
  const voucher = await voucherService.updateVoucher(
    req.params.id,
    req.body,
    req.businessId,
    req.user._id,
    req
  );
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

export const convertToInvoice = catchAsync(async (req, res) => {
  const voucher = await voucherService.convertOrderToInvoice(req.params.id, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { voucher } });
});

export const remove = catchAsync(async (req, res) => {
  await voucherService.deleteVoucher(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, data: null });
});

export const getInvoicePdf = catchAsync(async (req, res) => {
  const result = await getInvoicePdfBuffer(req.params.id, req.businessId);
  if (!result) throw ApiError.notFound('Sales invoice not found');

  const { pdf, voucher } = result;
  const safeName = String(voucher.voucherNumber || 'invoice').replace(/[^\w.-]/g, '_');
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}.pdf"`);
  res.send(pdf);
});

export const getStockSummary = catchAsync(async (req, res) => {
  const stock = await voucherService.getStockSummary(req.businessId, req.query, req.allowedMaterialCentreIds);
  res.json({ success: true, data: { stock } });
});
