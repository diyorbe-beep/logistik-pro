import express from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', OrderController.getAll);
router.get('/:id', OrderController.getOne);
router.post('/', OrderController.create);
router.put('/:id', OrderController.update);
router.delete('/:id', OrderController.delete);
router.post('/:id/convert-to-shipment', OrderController.convertToShipment);

export default router;
