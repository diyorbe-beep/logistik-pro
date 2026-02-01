import express from 'express';
import { CarrierController } from '../controllers/carrier.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get('/', CarrierController.getAll);
router.get('/:id', CarrierController.getOne);
router.get('/:id/history', CarrierController.getHistory);
router.post('/', CarrierController.create);
router.put('/:id', CarrierController.update);
router.delete('/:id', CarrierController.delete);

export default router;
