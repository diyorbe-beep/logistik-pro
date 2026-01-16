import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import shipmentRoutes from './routes/shipment.routes.js';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl, // Restrict to frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control']
}));

// Logging
app.use(morgan('dev'));

// Parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Trust proxy (for Render/Heroku)
app.set('trust proxy', 1);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', env: config.env, version: '2.0.0' });
});

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;
