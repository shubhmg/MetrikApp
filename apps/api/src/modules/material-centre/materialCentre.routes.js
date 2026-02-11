import { Router } from 'express';
import * as mcController from './materialCentre.controller.js';
import validate from '../../middleware/validate.js';
import { requireAnyModulePermission, requirePermission } from '../../middleware/rbac.js';
import { createMCSchema, updateMCSchema } from './materialCentre.validation.js';

const router = Router();

router.post('/', requirePermission('inventory:write'), validate(createMCSchema), mcController.create);
router.get('/', requirePermission('inventory:read'), mcController.list);
router.get(
  '/lookup',
  requireAnyModulePermission([
    'member',
    'inventory',
    'item',
    'bom',
    'production',
    'stock_transfer',
    'physical_stock',
    'sales_order',
    'sales_invoice',
    'purchase_order',
    'purchase_invoice',
    'receipt',
    'payment',
    'sales_return',
    'purchase_return',
    'delivery_note',
    'grn',
    'journal',
    'contra',
  ]),
  mcController.listLookup
);
router.get('/:id', requirePermission('inventory:read'), mcController.getById);
router.patch('/:id', requirePermission('inventory:write'), validate(updateMCSchema), mcController.update);
router.delete('/:id', requirePermission('inventory:delete'), mcController.remove);

export default router;
