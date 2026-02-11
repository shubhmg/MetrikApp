import { Router } from 'express';
import * as itemController from './item.controller.js';
import validate from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';
import {
  createItemGroupSchema,
  updateItemGroupSchema,
  createItemSchema,
  updateItemSchema,
  listItemSchema,
  getItemLedgerSchema,
  createUnitSchema,
  updateUnitSchema,
} from './item.validation.js';

const router = Router();

// ItemGroup routes
router.post('/groups', requirePermission('item:write'), validate(createItemGroupSchema), itemController.createGroup);
router.get('/groups', requirePermission('item:read'), itemController.listGroups);
router.get('/groups/:id', requirePermission('item:read'), itemController.getGroup);
router.patch('/groups/:id', requirePermission('item:write'), validate(updateItemGroupSchema), itemController.updateGroup);
router.delete('/groups/:id', requirePermission('item:delete'), itemController.deleteGroup);

// Item routes
router.get('/units', requirePermission('item:read'), itemController.listUnits);
router.post('/units', requirePermission('item:write'), validate(createUnitSchema), itemController.createUnit);
router.patch('/units/:id', requirePermission('item:write'), validate(updateUnitSchema), itemController.updateUnit);
router.delete('/units/:id', requirePermission('item:delete'), itemController.deleteUnit);

router.post('/', requirePermission('item:write'), validate(createItemSchema), itemController.create);
router.get('/', requirePermission('item:read'), validate(listItemSchema), itemController.list);
router.get('/:id', requirePermission('item:read'), itemController.getById);
router.get('/:id/ledger', requirePermission('item:read'), validate(getItemLedgerSchema), itemController.getLedger);
router.patch('/:id', requirePermission('item:write'), validate(updateItemSchema), itemController.update);
router.delete('/:id', requirePermission('item:delete'), itemController.remove);

export default router;
