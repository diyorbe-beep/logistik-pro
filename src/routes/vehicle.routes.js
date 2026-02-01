import express from 'express';
import { VehicleController } from '../controllers/vehicle.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get('/', VehicleController.getAll);
router.get('/:id', VehicleController.getOne);
router.post('/', VehicleController.create);
router.put('/:id', VehicleController.update);
router.delete('/:id', VehicleController.delete);

export default router;
