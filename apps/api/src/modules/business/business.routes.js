import { Router } from 'express';
import * as businessController from './business.controller.js';
import validate from '../../middleware/validate.js';
import auth from '../../middleware/auth.js';
import { createBusinessSchema, updateBusinessSchema } from './business.validation.js';

const router = Router();

// All business routes require auth
router.use(auth);

router.post('/', validate(createBusinessSchema), businessController.create);
router.get('/', businessController.list);
router.get('/:id', businessController.getById);
router.patch('/:id', validate(updateBusinessSchema), businessController.update);

export default router;
