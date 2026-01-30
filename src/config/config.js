import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 10001,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  dataDir: path.join(__dirname, '../../data'),
};

// Fallback for JWT Secret to prevent crash
if (!config.jwtSecret) {
  console.warn('WARNING: JWT_SECRET is not defined. Using default insecure secret.');
  config.jwtSecret = 'default-insecure-secret-please-change';
}
