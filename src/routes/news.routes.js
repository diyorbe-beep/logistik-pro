import express from 'express';
import { NewsController } from '../controllers/news.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route to view news
router.get('/', NewsController.getAll);
router.get('/:id', NewsController.getOne);

// Protected routes to manage news (Admin only)
router.post('/', authenticateToken, NewsController.create);
router.put('/:id', authenticateToken, NewsController.update);
router.delete('/:id', authenticateToken, NewsController.delete);

export default router;
