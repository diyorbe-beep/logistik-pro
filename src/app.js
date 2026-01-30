import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import shipmentRoutes from './routes/shipment.routes.js';
import orderRoutes from './routes/order.routes.js';
import uploadRoutes from './routes/upload.routes.js';
// ...
app.use('/api/shipments', shipmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve Frontend Static Files
const distPath = path.join(__dirname, '../../dist');
console.log('Serving static files from:', distPath); // DEBUG LOG
app.use(express.static(distPath));

// 404 Handler for API requests (must be before catch-all)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API Endpoint not found' });
});

// React SPA Catch-all (for non-API requests)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// General Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
