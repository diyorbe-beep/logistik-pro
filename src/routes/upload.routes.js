import express from 'express';
import { UploadController } from '../controllers/upload.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Allow authenticated users to upload
router.post('/', authenticateToken, UploadController.uploadMiddleware, UploadController.uploadFile);

export default router;
