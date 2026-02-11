import { Router } from 'express';
import * as partyController from './party.controller.js';
import validate from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';
import { createPartySchema, updatePartySchema, listPartySchema } from './party.validation.js';

const router = Router();

router.post('/', requirePermission('party:write'), validate(createPartySchema), partyController.create);
router.get('/', requirePermission('party:read'), validate(listPartySchema), partyController.list);
router.get('/:id', requirePermission('party:read'), partyController.getById);
router.patch('/:id', requirePermission('party:write'), validate(updatePartySchema), partyController.update);
router.delete('/:id', requirePermission('party:delete'), partyController.remove);

export default router;
