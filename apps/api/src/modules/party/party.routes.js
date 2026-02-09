import { Router } from 'express';
import * as partyController from './party.controller.js';
import validate from '../../middleware/validate.js';
import { createPartySchema, updatePartySchema, listPartySchema } from './party.validation.js';

const router = Router();

router.post('/', validate(createPartySchema), partyController.create);
router.get('/', validate(listPartySchema), partyController.list);
router.get('/:id', partyController.getById);
router.patch('/:id', validate(updatePartySchema), partyController.update);
router.delete('/:id', partyController.remove);

export default router;
