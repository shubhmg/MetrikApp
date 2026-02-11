import { Router } from 'express';
import * as memberController from './member.controller.js';
import { requirePermission } from '../../middleware/rbac.js';
import validate from '../../middleware/validate.js';
import { createMemberSchema, updateMemberSchema } from './member.validation.js';

const router = Router();

router.get('/', requirePermission('member:read'), memberController.list);
router.get('/:id', requirePermission('member:read'), memberController.getById);
router.post('/', requirePermission('member:write'), validate(createMemberSchema), memberController.create);
router.patch('/:id', requirePermission('member:write'), validate(updateMemberSchema), memberController.update);
router.delete('/:id', requirePermission('member:delete'), memberController.remove);

export default router;
