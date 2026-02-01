import express from 'express';
import { PricingController } from '../controllers/pricing.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route to view pricing
router.get('/', PricingController.getAll);
router.get('/:id', PricingController.getOne);

// Protected routes to manage pricing
router.post('/', authenticateToken, PricingController.create);
router.put('/:id', authenticateToken, PricingController.update);
router.delete('/:id', authenticateToken, PricingController.delete);

export default router;
