import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const SHIPMENTS_FILE = path.join(DATA_DIR, 'shipments.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files if they don't exist
const initializeFile = (filePath, defaultValue) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
};

initializeFile(SHIPMENTS_FILE, []);
initializeFile(USERS_FILE, [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    email: 'admin@logistics.com'
  }
]);
initializeFile(VEHICLES_FILE, [
  { id: 1, name: 'Truck-001', type: 'Truck', status: 'Available' },
  { id: 2, name: 'Van-002', type: 'Van', status: 'Available' }
]);

// Helper functions
const readData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeData = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authorization middleware - check if user has required role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { username, email, password, role = 'user' } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const users = readData(USERS_FILE);

  // Check if username already exists
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Check if email already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username,
    email,
    password: hashedPassword,
    role,
  };

  users.push(newUser);
  writeData(USERS_FILE, users);

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ message: 'User created successfully', user: userWithoutPassword });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = readData(USERS_FILE);
  const user = users.find(u => u.username === username);

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role, email: user.email } });
});

// Shipments Routes
app.get('/api/shipments', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  res.json(shipments);
});

app.get('/api/shipments/:id', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const shipment = shipments.find(s => s.id === parseInt(req.params.id));
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  res.json(shipment);
});

app.post('/api/shipments', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const newShipment = {
    id: shipments.length > 0 ? Math.max(...shipments.map(s => s.id)) + 1 : 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  shipments.push(newShipment);
  writeData(SHIPMENTS_FILE, shipments);
  res.status(201).json(newShipment);
});

app.put('/api/shipments/:id', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const index = shipments.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  shipments[index] = {
    ...shipments[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeData(SHIPMENTS_FILE, shipments);
  res.json(shipments[index]);
});

app.delete('/api/shipments/:id', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const filtered = shipments.filter(s => s.id !== parseInt(req.params.id));
  if (filtered.length === shipments.length) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  writeData(SHIPMENTS_FILE, filtered);
  res.json({ message: 'Shipment deleted successfully' });
});

// Users Routes (Admin only)
app.get('/api/users', authenticateToken, requireRole('admin'), (req, res) => {
  const users = readData(USERS_FILE);
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  res.json(usersWithoutPasswords);
});

app.post('/api/users', authenticateToken, requireRole('admin'), (req, res) => {
  const users = readData(USERS_FILE);
  const hashedPassword = bcrypt.hashSync(req.body.password || 'password123', 10);
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    ...req.body,
    password: hashedPassword
  };
  users.push(newUser);
  writeData(USERS_FILE, users);
  const { password, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

// Vehicles Routes
app.get('/api/vehicles', authenticateToken, (req, res) => {
  const vehicles = readData(VEHICLES_FILE);
  res.json(vehicles);
});

app.post('/api/vehicles', authenticateToken, (req, res) => {
  const vehicles = readData(VEHICLES_FILE);
  const newVehicle = {
    id: vehicles.length > 0 ? Math.max(...vehicles.map(v => v.id)) + 1 : 1,
    ...req.body
  };
  vehicles.push(newVehicle);
  writeData(VEHICLES_FILE, vehicles);
  res.status(201).json(newVehicle);
});

// Dashboard Stats
app.get('/api/stats', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const total = shipments.length;
  const inTransit = shipments.filter(s => s.status === 'In Transit').length;
  const delivered = shipments.filter(s => s.status === 'Delivered').length;
  const received = shipments.filter(s => s.status === 'Received').length;

  res.json({
    total,
    inTransit,
    delivered,
    received
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


