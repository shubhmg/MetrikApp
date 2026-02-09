import { Router } from 'express';
import * as accountController from './account.controller.js';
import validate from '../../middleware/validate.js';
import { createAccountSchema, updateAccountSchema, listAccountSchema, getLedgerSchema } from './account.validation.js';

const router = Router();

router.post('/', validate(createAccountSchema), accountController.create);
router.get('/', validate(listAccountSchema), accountController.list);
router.get('/:id', accountController.getById);
router.get('/:id/ledger', validate(getLedgerSchema), accountController.getLedger);
router.patch('/:id', validate(updateAccountSchema), accountController.update);
router.delete('/:id', accountController.remove);

export default router;
