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

if (!config.jwtSecret) {
  console.error('FATAL: JWT_SECRET is not defined in .env');
  process.exit(1);
}
