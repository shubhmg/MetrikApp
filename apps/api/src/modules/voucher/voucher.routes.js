import { Router } from 'express';
import * as voucherController from './voucher.controller.js';
import validate from '../../middleware/validate.js';
import { requireAnyVoucherPermission, requirePermission, requireVoucherPermission } from '../../middleware/rbac.js';
import {
  createVoucherSchema,
  updateVoucherSchema,
  cancelVoucherSchema,
  convertToInvoiceSchema,
  listVoucherSchema,
} from './voucher.validation.js';

const router = Router();

router.post('/', requireVoucherPermission('write'), validate(createVoucherSchema), voucherController.create);
router.get('/', requireAnyVoucherPermission('read'), validate(listVoucherSchema), voucherController.list);
router.get('/stock-summary', requirePermission('inventory:read'), voucherController.getStockSummary);
router.get('/:id/invoice-pdf', requireVoucherPermission('read'), voucherController.getInvoicePdf);
router.get('/:id', requireVoucherPermission('read'), voucherController.getById);
router.put('/:id', requireVoucherPermission('write'), validate(updateVoucherSchema), voucherController.update);
router.post('/:id/cancel', requireVoucherPermission('delete'), validate(cancelVoucherSchema), voucherController.cancel);
router.post('/:id/convert-to-invoice', requireVoucherPermission('write'), validate(convertToInvoiceSchema), voucherController.convertToInvoice);
router.delete('/:id', requireVoucherPermission('delete'), voucherController.remove);

export default router;
