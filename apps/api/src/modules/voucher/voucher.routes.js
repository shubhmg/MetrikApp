import { Router } from 'express';
import * as voucherController from './voucher.controller.js';
import validate from '../../middleware/validate.js';
import {
  createVoucherSchema,
  postVoucherSchema,
  cancelVoucherSchema,
  listVoucherSchema,
} from './voucher.validation.js';

const router = Router();

router.post('/', validate(createVoucherSchema), voucherController.create);
router.get('/', validate(listVoucherSchema), voucherController.list);
router.get('/:id', voucherController.getById);
router.post('/:id/post', validate(postVoucherSchema), voucherController.post);
router.post('/:id/cancel', validate(cancelVoucherSchema), voucherController.cancel);

export default router;
