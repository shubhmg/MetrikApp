import { Router } from 'express';
import * as voucherController from './voucher.controller.js';
import validate from '../../middleware/validate.js';
import {
  createVoucherSchema,
  updateVoucherSchema,
  cancelVoucherSchema,
  convertToInvoiceSchema,
  listVoucherSchema,
} from './voucher.validation.js';

const router = Router();

router.post('/', validate(createVoucherSchema), voucherController.create);
router.get('/', validate(listVoucherSchema), voucherController.list);
router.get('/stock-summary', voucherController.getStockSummary);
router.get('/:id', voucherController.getById);
router.put('/:id', validate(updateVoucherSchema), voucherController.update);
router.post('/:id/cancel', validate(cancelVoucherSchema), voucherController.cancel);
router.post('/:id/convert-to-invoice', validate(convertToInvoiceSchema), voucherController.convertToInvoice);
router.delete('/:id', voucherController.remove);

export default router;
