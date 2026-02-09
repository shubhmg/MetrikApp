import { Router } from 'express';
import * as mcController from './materialCentre.controller.js';
import validate from '../../middleware/validate.js';
import { createMCSchema, updateMCSchema } from './materialCentre.validation.js';

const router = Router();

router.post('/', validate(createMCSchema), mcController.create);
router.get('/', mcController.list);
router.get('/:id', mcController.getById);
router.patch('/:id', validate(updateMCSchema), mcController.update);
router.delete('/:id', mcController.remove);

export default router;
