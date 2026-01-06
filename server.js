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
const PORT = process.env.PORT || 10000; // Render.com default port

// Log startup information
console.log('🚀 Starting Logistics Pro Backend Server...');
console.log(`📊 Node.js version: ${process.version}`);
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📊 Port: ${PORT}`);
console.log(`📊 Platform: ${process.platform}`);
console.log(`📊 Architecture: ${process.arch}`);
console.log(`📊 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);

// JWT Secret Management - Production Safe
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  console.warn('⚠️  WARNING: JWT_SECRET not set in environment variables. Using fallback.');
  console.warn('⚠️  Set JWT_SECRET environment variable for production security.');
  return 'fallback-secret-key-change-immediately-' + Date.now();
})();

// Optional: Support for secret rotation
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS;

// Validate JWT secret strength
if (JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long for security');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://logistik-dusky.vercel.app',
        'https://logistik-pro.onrender.com',
        'https://logistics-pro-frontend.onrender.com'
      ]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Trust proxy for Render.com
app.set('trust proxy', 1);

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Handle preflight requests
app.options('*', cors());

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

// Enhanced Authentication middleware with proper error handling
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  // Try current secret first
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // If current secret fails and we have a previous secret, try it
      if (JWT_SECRET_PREVIOUS && err.name === 'JsonWebTokenError') {
        return jwt.verify(token, JWT_SECRET_PREVIOUS, (prevErr, prevUser) => {
          if (prevErr) {
            console.log(`Token verification failed for user: ${prevErr.message}`);
            return res.status(401).json({ 
              error: 'Invalid or expired token',
              code: prevErr.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
              message: 'Please log in again'
            });
          }
          
          // Token valid with previous secret - user should refresh
          console.log(`Token verified with previous secret for user: ${prevUser.username}`);
          req.user = prevUser;
          req.tokenNeedsRefresh = true; // Flag for frontend to refresh token
          next();
        });
      }
      
      // Log the specific error for debugging
      console.log(`Token verification failed: ${err.message}, Token: ${token.substring(0, 20)}...`);
      
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        message: 'Please log in again'
      });
    }
    
    // Verify user still exists in the system
    const users = readData(USERS_FILE);
    const currentUser = users.find(u => u.id === user.id);
    if (!currentUser) {
      console.log(`Token valid but user no longer exists: ${user.id}`);
      return res.status(401).json({ 
        error: 'User account no longer exists',
        code: 'USER_NOT_FOUND',
        message: 'Please contact administrator'
      });
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
  try {
    const { username, email, password, role, userType, phone } = req.body;

    console.log('Register request body:', req.body);

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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, passwordProvided: !!password });
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const users = readData(USERS_FILE);
    console.log('Total users in database:', users.length);
    
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('User found:', { id: user.id, username: user.username, role: user.role });
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Enhanced token generation with additional security
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      userType: user.userType,
      iat: Math.floor(Date.now() / 1000), // Issued at
      jti: `${user.id}-${Date.now()}` // JWT ID for tracking
    };

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'logistics-pro-api',
        audience: 'logistics-pro-client'
      }
    );

    console.log('Login successful for user:', username);
    
    // Return user info and token refresh indicator if needed
    const response = {
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        userType: user.userType, 
        email: user.email 
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Token refresh endpoint
app.post('/api/refresh-token', authenticateToken, (req, res) => {
  try {
    // Generate new token with current secret
    const tokenPayload = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      userType: req.user.userType,
      iat: Math.floor(Date.now() / 1000),
      jti: `${req.user.id}-${Date.now()}`
    };

    const newToken = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'logistics-pro-api',
        audience: 'logistics-pro-client'
      }
    );

    console.log(`Token refreshed for user: ${req.user.username}`);
    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Health check endpoint for monitoring
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    cors_origins: process.env.NODE_ENV === 'production' 
      ? ['https://logistik-dusky.vercel.app', 'https://logistik-pro.onrender.com']
      : ['http://localhost:3000', 'http://localhost:5173']
  });
});

// Root endpoint for Render.com health checks
app.get('/', (req, res) => {
  res.json({ 
    message: 'Logistics Pro API Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      login: '/api/login',
      register: '/api/register',
      profile: '/api/profile'
    }
  });
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

// Carrier accepts shipment
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

// Operator confirms carrier acceptance
app.post('/api/shipments/:id/confirm', authenticateToken, (req, res) => {
  const shipments = readData(SHIPMENTS_FILE);
  const index = shipments.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const shipment = shipments[index];
  if (!shipment.carrierId) {
    return res.status(400).json({ error: 'No carrier has accepted this shipment' });
  }

  if (shipment.operatorConfirmed) {
    return res.status(400).json({ error: 'Shipment already confirmed' });
  }

  shipments[index] = {
    ...shipment,
    operatorConfirmed: true,
    status: 'In Transit',
    updatedAt: new Date().toISOString()
  };
  writeData(SHIPMENTS_FILE, shipments);
  res.json(shipments[index]);
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

// Pricing Routes (Public endpoint, but can be accessed with token for admin)
app.get('/api/pricing', (req, res) => {
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

// Available shipments for carriers (shipments without assigned carrier)
app.get('/api/available-shipments', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    
    // Only show shipments that are "Received" status and don't have a carrier assigned
    const availableShipments = shipments.filter(s => 
      s.status === 'Received' && 
      (!s.carrierId || s.carrierId === null)
    );
    
    // Sort by creation date (newest first)
    availableShipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(availableShipments);
  } catch (error) {
    console.error('Error fetching available shipments:', error);
    res.status(500).json({ error: 'Failed to fetch available shipments' });
  }
});

// My shipments for carriers (shipments assigned to current carrier)
app.get('/api/my-shipments', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    
    let myShipments = [];
    
    if (req.user.role === 'carrier') {
      // For carriers: show shipments assigned to them
      myShipments = shipments.filter(s => s.carrierId === req.user.id);
    } else if (req.user.role === 'customer') {
      // For customers: show shipments they created
      myShipments = shipments.filter(s => s.customerId === req.user.id);
    } else if (req.user.role === 'operator' || req.user.role === 'admin') {
      // For operators/admins: show all shipments
      myShipments = shipments;
    }
    
    // Sort by creation date (newest first)
    myShipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(myShipments);
  } catch (error) {
    console.error('Error fetching my shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
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

// Profile Routes with enhanced error handling
app.get('/api/profile', authenticateToken, (req, res) => {
  try {
    const users = readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      console.log(`Profile request failed - user not found: ${req.user.id}`);
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        message: 'Your account may have been deleted. Please contact administrator.'
      });
    }
    
    const { password, ...userWithoutPassword } = user;
    
    // Add token refresh indicator if needed
    const response = {
      ...userWithoutPassword,
      ...(req.tokenNeedsRefresh && { tokenNeedsRefresh: true })
    };
    
    res.json(response);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'Please try again later'
    });
  }
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

// Orders Routes (Customer orders)
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
initializeFile(ORDERS_FILE, []);

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
    
    // Filter orders based on user role
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

// Convert order to shipment (Operator/Admin only)
app.post('/api/orders/:id/convert-to-shipment', authenticateToken, requireRole('admin', 'operator'), (req, res) => {
  try {
    const orders = readData(ORDERS_FILE);
    const shipments = readData(SHIPMENTS_FILE);
    
    const orderIndex = orders.findIndex(o => o.id === parseInt(req.params.id));
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[orderIndex];
    
    // Create shipment from order
    const newShipment = {
      id: shipments.length > 0 ? Math.max(...shipments.map(s => s.id)) + 1 : 1,
      trackingNumber: order.trackingNumber,
      origin: order.origin,
      destination: order.destination,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerId: order.customerId,
      weight: order.weight,
      dimensions: order.dimensions,
      description: order.description,
      specialInstructions: order.specialInstructions,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      recipientAddress: order.recipientAddress,
      urgency: order.urgency,
      estimatedPrice: order.estimatedPrice,
      status: 'Received',
      operatorId: req.user.id,
      carrierId: null,
      operatorConfirmed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderId: order.id
    };
    
    shipments.push(newShipment);
    writeData(SHIPMENTS_FILE, shipments);
    
    // Update order status
    orders[orderIndex].status = 'Converted';
    orders[orderIndex].shipmentId = newShipment.id;
    orders[orderIndex].updatedAt = new Date().toISOString();
    writeData(ORDERS_FILE, orders);
    
    res.json({ order: orders[orderIndex], shipment: newShipment });
  } catch (error) {
    console.error('Error converting order to shipment:', error);
    res.status(500).json({ error: 'Failed to convert order' });
  }
});

// Complete delivery endpoint
app.post('/api/shipments/:id/complete-delivery', authenticateToken, (req, res) => {
  try {
    const shipments = readData(SHIPMENTS_FILE);
    const index = shipments.findIndex(s => s.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    const shipment = shipments[index];
    
    // Check if user is authorized (carrier assigned to this shipment or admin/operator)
    if (req.user.role !== 'admin' && req.user.role !== 'operator' && shipment.carrierId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to complete this delivery' });
    }
    
    // Update shipment with delivery completion data
    shipments[index] = {
      ...shipment,
      status: 'Delivered',
      deliveryCode: req.body.deliveryCode,
      deliveryNotes: req.body.deliveryNotes,
      actualRecipientName: req.body.recipientName || shipment.recipientName,
      deliveredAt: req.body.deliveredAt || new Date().toISOString(),
      deliveredBy: req.user.id,
      deliveryCompleted: true,
      updatedAt: new Date().toISOString()
    };
    
    writeData(SHIPMENTS_FILE, shipments);
    
    res.json({
      message: 'Delivery completed successfully',
      shipment: shipments[index]
    });
  } catch (error) {
    console.error('Error completing delivery:', error);
    res.status(500).json({ error: 'Failed to complete delivery' });
  }
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

// Enhanced server startup for Render.com compatibility
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret configured: ${JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`🌐 CORS enabled for: ${process.env.NODE_ENV === 'production' ? 'Production domains' : 'Development domains'}`);
  console.log(`🔗 Server URL: http://0.0.0.0:${PORT}`);
  
  // Log available endpoints
  console.log('\n📋 Available API endpoints:');
  console.log('  POST /api/login');
  console.log('  POST /api/register');
  console.log('  GET  /api/profile');
  console.log('  GET  /api/health');
  console.log('  GET  /api/shipments');
  console.log('  GET  /api/available-shipments');
  console.log('  GET  /api/my-shipments');
  console.log('  ... and more\n');
  
  // Render.com health check confirmation
  console.log('✅ Server is ready to accept connections');
  console.log('✅ Health endpoint available at /api/health');
});

// Graceful shutdown handling
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
