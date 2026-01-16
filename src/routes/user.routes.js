import express from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', UserController.getProfile);
router.get('/', UserController.getAll); // /api/users

export default router;
