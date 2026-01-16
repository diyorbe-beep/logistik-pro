import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';

// Ensure data directory exists
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

export const DATA_FILES = {
  USERS: path.join(config.dataDir, 'users.json'),
  SHIPMENTS: path.join(config.dataDir, 'shipments.json'),
  ORDERS: path.join(config.dataDir, 'orders.json'),
  VEHICLES: path.join(config.dataDir, 'vehicles.json'),
  PRICING: path.join(config.dataDir, 'pricing.json'),
  CARRIERS: path.join(config.dataDir, 'carriers.json'),
  NEWS: path.join(config.dataDir, 'news.json'),
};

// Initialize file if not exists
export const initializeFile = (filePath, defaultValue = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
};

// Initialize all files
Object.values(DATA_FILES).forEach(file => initializeFile(file));

export const readData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
};

export const writeData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
};
