import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './db/connection.js';
import eventRoutes from './routes/events.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS Configuration - এটা সবার আগে
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', 
  'http://localhost:5174',
  'https://social-client-cb1t.onrender.com',
  'https://social-server-2s6h.onrender.com'
];

// CORS middleware - MUST BE FIRST
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (optional but helpful)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/events', eventRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Social Events API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      events: '/api/events/upcoming',
      createEvent: 'POST /api/events',
      userEvents: '/api/events/user/created',
      joinedEvents: '/api/events/user/joined'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    message: error.message || 'Internal server error' 
  });
});

// Start server
const startServer = async () => {
  try {
    await connectToDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════╗
║   🚀 Social Events API Server Started     ║
╠════════════════════════════════════════════╣
║   📍 Port: ${PORT}                         ║
║   📍 Health: http://localhost:${PORT}/health
║   📍 API: http://localhost:${PORT}/api/events
║   🌐 CORS Enabled for:                     ║
${allowedOrigins.map(origin => `║      - ${origin}`).join('\n')}
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();