import { Router } from 'express';
import * as accountController from './account.controller.js';
import validate from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';
import { createAccountSchema, updateAccountSchema, listAccountSchema, getLedgerSchema } from './account.validation.js';

const router = Router();

router.post('/', requirePermission('accounting:write'), validate(createAccountSchema), accountController.create);
router.get('/', requirePermission('accounting:read'), validate(listAccountSchema), accountController.list);
router.get('/:id', requirePermission('accounting:read'), accountController.getById);
router.get('/:id/ledger', requirePermission('accounting:read'), validate(getLedgerSchema), accountController.getLedger);
router.patch('/:id', requirePermission('accounting:write'), validate(updateAccountSchema), accountController.update);
router.delete('/:id', requirePermission('accounting:delete'), accountController.remove);

export default router;
