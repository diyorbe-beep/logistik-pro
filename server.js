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
const PORT = process.env.PORT || 3001;
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
const PRICING_FILE = path.join(DATA_DIR, 'pricing.json');

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
initializeFile(PRICING_FILE, [
  { 
    id: 1, 
    route: 'Toshkent - Samarqand', 
    distance: 300, 
    pricePerKm: 500, 
    totalPrice: 150000,
    vehicleType: 'Truck',
    description: 'Standard route pricing'
  }
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
  const { username, email, password, role, userType, phone } = req.body;

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
  const finalRole = role || (userType === 'customer' ? 'customer' : userType === 'carrier' ? 'carrier' : userType === 'operator' ? 'operator' : 'user');
  
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username,
    email,
    password: hashedPassword,
    role: finalRole,
    userType: userType || finalRole,
    phone: phone || '',
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

// Pricing Routes
app.get('/api/pricing', authenticateToken, (req, res) => {
  const pricing = readData(PRICING_FILE);
  res.json(pricing);
});

app.get('/api/pricing/:id', authenticateToken, (req, res) => {
  const pricing = readData(PRICING_FILE);
  const item = pricing.find(p => p.id === parseInt(req.params.id));
  if (!item) {
    return res.status(404).json({ error: 'Pricing not found' });
  }
  res.json(item);
});

app.post('/api/pricing', authenticateToken, (req, res) => {
  const pricing = readData(PRICING_FILE);
  const newPricing = {
    id: pricing.length > 0 ? Math.max(...pricing.map(p => p.id)) + 1 : 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  pricing.push(newPricing);
  writeData(PRICING_FILE, pricing);
  res.status(201).json(newPricing);
});

app.put('/api/pricing/:id', authenticateToken, (req, res) => {
  const pricing = readData(PRICING_FILE);
  const index = pricing.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Pricing not found' });
  }
  pricing[index] = {
    ...pricing[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeData(PRICING_FILE, pricing);
  res.json(pricing[index]);
});

app.delete('/api/pricing/:id', authenticateToken, (req, res) => {
  const pricing = readData(PRICING_FILE);
  const filtered = pricing.filter(p => p.id !== parseInt(req.params.id));
  if (filtered.length === pricing.length) {
    return res.status(404).json({ error: 'Pricing not found' });
  }
  writeData(PRICING_FILE, filtered);
  res.json({ message: 'Pricing deleted successfully' });
});

// Carriers Routes
const CARRIERS_FILE = path.join(DATA_DIR, 'carriers.json');
initializeFile(CARRIERS_FILE, []);

app.get('/api/carriers', authenticateToken, (req, res) => {
  const users = readData(USERS_FILE);
  const shipments = readData(SHIPMENTS_FILE);
  const carriers = users.filter(u => u.role === 'carrier' || u.userType === 'carrier');
  
  const carriersWithStats = carriers.map(carrier => {
    const carrierShipments = shipments.filter(s => s.carrierId === carrier.id);
    return {
      ...carrier,
      totalShipments: carrierShipments.length,
      completedShipments: carrierShipments.filter(s => s.status === 'Delivered').length,
      activeShipments: carrierShipments.filter(s => s.status === 'In Transit').length,
    };
  });
  
  res.json(carriersWithStats);
});

app.get('/api/carriers/:id/history', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const carrierId = parseInt(req.params.id);
  const carrierShipments = shipments
    .filter(s => s.carrierId === carrierId)
    .map(s => ({
      id: s.id,
      shipmentId: s.trackingNumber || s.id,
      from: s.origin,
      to: s.destination,
      status: s.status,
      date: s.createdAt || s.updatedAt,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  res.json(carrierShipments);
});

// Profile Routes
app.get('/api/profile', authenticateToken, (req, res) => {
  const users = readData(USERS_FILE);
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.put('/api/profile', authenticateToken, (req, res) => {
  const users = readData(USERS_FILE);
  const index = users.findIndex(u => u.id === req.user.id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  users[index] = {
    ...users[index],
    ...req.body,
    id: users[index].id,
    password: users[index].password,
  };
  writeData(USERS_FILE, users);
  const { password, ...userWithoutPassword } = users[index];
  res.json(userWithoutPassword);
});

// News Routes
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
initializeFile(NEWS_FILE, [
  {
    id: 1,
    title: 'Yangi logistika xizmatlari',
    summary: 'Biz yangi xizmatlarimizni joriy qildik',
    content: 'Full content here...',
    createdAt: new Date().toISOString(),
  }
]);

app.get('/api/news', (req, res) => {
  const news = readData(NEWS_FILE);
  res.json(news);
});

// Vehicles Routes - Update
app.get('/api/vehicles/:id', authenticateToken, (req, res) => {
  const vehicles = readData(VEHICLES_FILE);
  const vehicle = vehicles.find(v => v.id === parseInt(req.params.id));
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  res.json(vehicle);
});

app.put('/api/vehicles/:id', authenticateToken, (req, res) => {
  const vehicles = readData(VEHICLES_FILE);
  const index = vehicles.findIndex(v => v.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  vehicles[index] = {
    ...vehicles[index],
    ...req.body,
    id: vehicles[index].id,
  };
  writeData(VEHICLES_FILE, vehicles);
  res.json(vehicles[index]);
});

// Dashboard Stats - Enhanced with monthly data
app.get('/api/stats', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const total = shipments.length;
  const inTransit = shipments.filter(s => s.status === 'In Transit').length;
  const delivered = shipments.filter(s => s.status === 'Delivered').length;
  const received = shipments.filter(s => s.status === 'Received').length;

  // Monthly statistics
  const monthlyData = {};
  shipments.forEach(shipment => {
    const date = new Date(shipment.createdAt || shipment.updatedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
  });

  // Get last 6 months
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    last6Months.push({
      month: monthKey,
      count: monthlyData[monthKey] || 0,
    });
  }

  res.json({
    total,
    inTransit,
    delivered,
    received,
    monthly: last6Months,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
