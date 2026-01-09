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
const PORT = process.env.PORT || 10000;

// Startup logging
console.log('🚀 Starting Logistics Pro Backend Server...');
console.log(`📊 Node.js version: ${process.version}`);
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📊 Port: ${PORT}`);

// JWT Secret Management
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  console.warn('⚠️ WARNING: Using fallback JWT secret for development');
  return 'fallback-secret-key-change-immediately-' + Date.now();
})();

const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS;

// Validate JWT secret
if (JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://logistik-dusky.vercel.app',
        'https://logistik-pro.onrender.com'
      ]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Handle preflight requests
app.options('*', cors(corsOptions));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const SHIPMENTS_FILE = path.join(DATA_DIR, 'shipments.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');
const PRICING_FILE = path.join(DATA_DIR, 'pricing.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const CARRIERS_FILE = path.join(DATA_DIR, 'carriers.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files
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
  },
  {
    id: 3,
    username: 'operator',
    password: bcrypt.hashSync('admin123', 10),
    role: 'operator',
    email: 'operator@logistics.com'
  }
]);
initializeFile(VEHICLES_FILE, [
  { id: 1, name: 'Truck-001', type: 'Truck', status: 'Available' },
  { id: 2, name: 'Van-002', type: 'Van', status: 'Available' }
]);
initializeFile(PRICING_FILE, []);
initializeFile(ORDERS_FILE, []);
initializeFile(CARRIERS_FILE, []);
initializeFile(NEWS_FILE, []);

// Helper functions
const readData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
};

const writeData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (JWT_SECRET_PREVIOUS && err.name === 'JsonWebTokenError') {
        return jwt.verify(token, JWT_SECRET_PREVIOUS, (prevErr, prevUser) => {
          if (prevErr) {
            return res.status(401).json({ 
              error: 'Invalid or expired token',
              code: prevErr.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
            });
          }
          req.user = prevUser;
          req.tokenNeedsRefresh = true;
          next();
        });
      }
      
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
    }
    
    const users = readData(USERS_FILE);
    const currentUser = users.find(u => u.id === user.id);
    if (!currentUser) {
      return res.status(401).json({ 
        error: 'User account no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }
    
    req.user = user;
    next();
  });
};

// Authorization middleware
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Logistics Pro API Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role, userType, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const users = readData(USERS_FILE);

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

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
      phone: phone || ''
    };

    users.push(newUser);
    writeData(USERS_FILE, users);

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'User created successfully', user: userWithoutPassword });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`🔐 Login attempt for username: ${username}`);
    
    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const users = readData(USERS_FILE);
    console.log(`👥 Total users in database: ${users.length}`);
    console.log(`👥 Available usernames: ${users.map(u => u.username).join(', ')}`);
    
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log(`✅ User found: ${user.username} (${user.role})`);
    console.log(`🔑 Comparing password with hash: ${user.password.substring(0, 20)}...`);
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    console.log(`🔑 Password match result: ${passwordMatch}`);
    
    if (!passwordMatch) {
      console.log(`❌ Password mismatch for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      userType: user.userType,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log(`✅ Login successful for: ${user.username} (${user.role})`);

    res.json({
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        userType: user.userType, 
        email: user.email 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to check users (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test/users', (req, res) => {
    try {
      const users = readData(USERS_FILE);
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0
      }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Profile Routes
app.get('/api/profile', authenticateToken, (req, res) => {
  try {
    const users = readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Shipments Routes
app.get('/api/shipments', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  res.json(shipments);
});

// Get user's shipments (for carriers and customers)
app.get('/api/my-shipments', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let userShipments = [];
    
    if (userRole === 'carrier') {
      // For carriers, return shipments assigned to them
      userShipments = shipments.filter(s => s.carrierId === userId);
    } else if (userRole === 'customer') {
      // For customers, return shipments they created
      userShipments = shipments.filter(s => s.customerId === userId);
    } else if (userRole === 'admin' || userRole === 'operator') {
      // For admin/operator, return all shipments
      userShipments = shipments;
    }
    
    console.log(`📦 My shipments for ${req.user.username} (${userRole}): ${userShipments.length} found`);
    res.json(userShipments);
  } catch (error) {
    console.error('Error fetching my shipments:', error);
    res.status(500).json({ error: 'Failed to fetch my shipments' });
  }
});

// Get available shipments (for carriers)
app.get('/api/available-shipments', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    
    // Return shipments that are not yet assigned to a carrier
    const availableShipments = shipments.filter(s => 
      !s.carrierId && (s.status === 'Pending' || s.status === 'Ready for Pickup')
    );
    
    console.log(`📦 Available shipments: ${availableShipments.length} found`);
    res.json(availableShipments);
  } catch (error) {
    console.error('Error fetching available shipments:', error);
    res.status(500).json({ error: 'Failed to fetch available shipments' });
  }
});

app.post('/api/shipments', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const newShipment = {
    id: shipments.length > 0 ? Math.max(...shipments.map(s => s.id)) + 1 : 1,
    ...req.body,
    status: req.body.status || 'Received',
    customerId: req.body.customerId || req.user.id,
    operatorId: req.user.id,
    carrierId: null,
    operatorConfirmed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  shipments.push(newShipment);
  writeData(SHIPMENTS_FILE, shipments);
  res.status(201).json(newShipment);
});

// Available shipments for carriers
app.get('/api/available-shipments', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    const availableShipments = shipments.filter(s => 
      s.status === 'Received' && (!s.carrierId || s.carrierId === null)
    );
    availableShipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(availableShipments);
  } catch (error) {
    console.error('Error fetching available shipments:', error);
    res.status(500).json({ error: 'Failed to fetch available shipments' });
  }
});

// My shipments for carriers
app.get('/api/my-shipments', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    let myShipments = [];
    
    if (req.user.role === 'carrier') {
      myShipments = shipments.filter(s => s.carrierId === req.user.id);
    } else if (req.user.role === 'customer') {
      myShipments = shipments.filter(s => s.customerId === req.user.id);
    } else if (req.user.role === 'operator' || req.user.role === 'admin') {
      myShipments = shipments;
    }
    
    myShipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(myShipments);
  } catch (error) {
    console.error('Error fetching my shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// Accept shipment
app.post('/api/shipments/:id/accept', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const index = shipments.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const shipment = shipments[index];
  if (shipment.status !== 'Received' || shipment.carrierId) {
    return res.status(400).json({ error: 'Shipment is not available for acceptance' });
  }

  const users = readData(USERS_FILE);
  const carrier = users.find(u => u.id === req.user.id);
  
  shipments[index] = {
    ...shipment,
    carrierId: req.user.id,
    carrierName: carrier?.username || 'Carrier',
    updatedAt: new Date().toISOString()
  };
  writeData(SHIPMENTS_FILE, shipments);
  res.json(shipments[index]);
});

// Complete delivery
app.post('/api/shipments/:id/complete-delivery', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    const index = shipments.findIndex(s => s.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    const shipment = shipments[index];
    
    if (req.user.role !== 'admin' && req.user.role !== 'operator' && shipment.carrierId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to complete this delivery' });
    }
    
    shipments[index] = {
      ...shipment,
      status: 'Delivered',
      deliveryCode: req.body.deliveryCode,
      deliveryNotes: req.body.deliveryNotes,
      deliveredAt: new Date().toISOString(),
      deliveredBy: req.user.id,
      deliveryCompleted: true,
      updatedAt: new Date().toISOString()
    };
    
    writeData(SHIPMENTS_FILE, shipments);
    res.json({ message: 'Delivery completed successfully', shipment: shipments[index] });
  } catch (error) {
    console.error('Error completing delivery:', error);
    res.status(500).json({ error: 'Failed to complete delivery' });
  }
});

// Orders Routes
app.post('/api/orders', authenticateToken, (req, res) => {
  try {
    const orders = readData(ORDERS_FILE);
    const newOrder = {
      id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1,
      ...req.body,
      customerId: req.user.id,
      status: 'Pending',
      orderType: 'customer_order',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    writeData(ORDERS_FILE, orders);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', authenticateToken, (req, res) => {
  try {
    const orders = readData(ORDERS_FILE);
    let filteredOrders = orders;
    if (req.user.role === 'customer') {
      filteredOrders = orders.filter(o => o.customerId === req.user.id);
    }
    res.json(filteredOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Pricing Routes
app.get('/api/pricing', (req, res) => {
  const pricing = readData(PRICING_FILE);
  res.json(pricing);
});

// Vehicles Routes
app.get('/api/vehicles', authenticateToken, (req, res) => {
  const vehicles = readData(VEHICLES_FILE);
  res.json(vehicles);
});

// News Routes
app.get('/api/news', (req, res) => {
  const news = readData(NEWS_FILE);
  res.json(news);
});

// Carriers Routes
app.get('/api/carriers', authenticateToken, (req, res) => {
  const users = readData(USERS_FILE);
  const carriers = users.filter(u => u.role === 'carrier' || u.userType === 'carrier');
  res.json(carriers);
});

// Dashboard Stats
app.get('/api/stats', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const total = shipments.length;
  const inTransit = shipments.filter(s => s.status === 'In Transit').length;
  const delivered = shipments.filter(s => s.status === 'Delivered').length;
  const received = shipments.filter(s => s.status === 'Received').length;

  res.json({ total, inTransit, delivered, received });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Server startup
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret configured: ${JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`🌐 CORS enabled for production domains`);
  console.log(`✅ Server is ready to accept connections`);
  console.log(`✅ Health endpoint available at /api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});