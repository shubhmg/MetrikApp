import { Router } from 'express';
import * as bomController from './bom.controller.js';
import validate from '../../middleware/validate.js';
import { createBomSchema, updateBomSchema, listBomSchema, expandBomSchema } from './bom.validation.js';

const router = Router();

router.post('/', validate(createBomSchema), bomController.create);
router.get('/', validate(listBomSchema), bomController.list);
router.get('/expand', validate(expandBomSchema), bomController.expand);
router.get('/item/:outputItemId/active', bomController.getActiveForItem);
router.get('/item/:outputItemId/versions', bomController.getVersionHistory);
router.get('/:id', bomController.getById);
router.patch('/:id', validate(updateBomSchema), bomController.update);
router.delete('/:id', bomController.remove);
router.post('/:id/activate', bomController.activate);
router.post('/:id/archive', bomController.archive);
router.post('/:id/new-version', bomController.newVersion);

export default router;
