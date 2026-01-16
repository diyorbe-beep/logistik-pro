import express from 'express';
import { ShipmentController } from '../controllers/shipment.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get('/', ShipmentController.getAll);
router.get('/:id', ShipmentController.getOne);
router.post('/', ShipmentController.create);
router.put('/:id', ShipmentController.update);
router.delete('/:id', ShipmentController.delete);

export default router;
