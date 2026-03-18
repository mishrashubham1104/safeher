const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes         = require('./routes/auth');
const incidentRoutes     = require('./routes/incidents');
const sosRoutes          = require('./routes/sos');
const contactRoutes      = require('./routes/contacts');
const adminRoutes        = require('./routes/admin');
const userRoutes         = require('./routes/users');
const testimonialRoutes  = require('./routes/testimonials');
const volunteerRoutes    = require('./routes/volunteers');
const liveShareRoutes    = require('./routes/liveshare');
const { initSocket }     = require('./socket/socketHandler');

const app    = express();
const server = http.createServer(app);

// ── CORS must be FIRST — before helmet and everything else ──
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle ALL preflight OPTIONS requests immediately
app.options('*', cors(corsOptions));

// ── Security middleware (after CORS) ──
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// ── Rate limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'development', // skip in dev
});
app.use('/api', limiter);

// ── Body parser ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logger ──
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Socket.io ──
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);
initSocket(io);

// ── MongoDB Atlas ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ── Routes ──
app.use('/api/auth',          authRoutes);
app.use('/api/incidents',     incidentRoutes);
app.use('/api/sos',           sosRoutes);
app.use('/api/contacts',      contactRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/testimonials',  testimonialRoutes);
app.use('/api/volunteers',    volunteerRoutes);
app.use('/api/liveshare',     liveShareRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status:    'OK',
    message:   'SafeHer API is running',
    timestamp: new Date().toISOString(),
  });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SafeHer Server running on port ${PORT}`);
  console.log(`🌐 CORS allowed: ${allowedOrigins.join(', ')}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, server, io };