import { Router } from 'express';
import * as bomController from './bom.controller.js';
import validate from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';
import { createBomSchema, updateBomSchema, listBomSchema, expandBomSchema } from './bom.validation.js';

const router = Router();

router.post('/', requirePermission('bom:write'), validate(createBomSchema), bomController.create);
router.get('/', requirePermission('bom:read'), validate(listBomSchema), bomController.list);
router.get('/expand', requirePermission('bom:read'), validate(expandBomSchema), bomController.expand);
router.get('/item/:outputItemId/active', requirePermission('bom:read'), bomController.getActiveForItem);
router.get('/item/:outputItemId/versions', requirePermission('bom:read'), bomController.getVersionHistory);
router.get('/:id', requirePermission('bom:read'), bomController.getById);
router.patch('/:id', requirePermission('bom:write'), validate(updateBomSchema), bomController.update);
router.delete('/:id', requirePermission('bom:delete'), bomController.remove);
router.post('/:id/activate', requirePermission('bom:write'), bomController.activate);
router.post('/:id/archive', requirePermission('bom:write'), bomController.archive);
router.post('/:id/new-version', requirePermission('bom:write'), bomController.newVersion);

export default router;
