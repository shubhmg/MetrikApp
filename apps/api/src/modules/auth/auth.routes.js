import { Router } from 'express';
import * as authController from './auth.controller.js';
import validate from '../../middleware/validate.js';
import auth from '../../middleware/auth.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.me);

export default router;
