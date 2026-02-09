import { Router } from 'express';
import * as itemController from './item.controller.js';
import validate from '../../middleware/validate.js';
import {
  createItemGroupSchema,
  updateItemGroupSchema,
  createItemSchema,
  updateItemSchema,
  listItemSchema,
} from './item.validation.js';

const router = Router();

// ItemGroup routes
router.post('/groups', validate(createItemGroupSchema), itemController.createGroup);
router.get('/groups', itemController.listGroups);
router.get('/groups/:id', itemController.getGroup);
router.patch('/groups/:id', validate(updateItemGroupSchema), itemController.updateGroup);
router.delete('/groups/:id', itemController.deleteGroup);

// Item routes
router.post('/', validate(createItemSchema), itemController.create);
router.get('/', validate(listItemSchema), itemController.list);
router.get('/:id', itemController.getById);
router.patch('/:id', validate(updateItemSchema), itemController.update);
router.delete('/:id', itemController.remove);

export default router;
