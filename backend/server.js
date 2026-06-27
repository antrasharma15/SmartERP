require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const groupRoutes = require('./routes/groupRoutes');
const { protect } = require('./Middleware/authMiddleware');

const app = express();

// Configure CORS to support HTTP-only cookies with credentials
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isLocalOrigin = allowedOrigins.includes(origin) || 
      (isDevelopment && (
        origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') || 
        /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/.test(origin)
      ));

    if (isLocalOrigin || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser()); // Required to parse HTTP-only JWT cookies

// Request Logging Middleware for diagnostics
app.use((req, res, next) => {
  console.log(`[BACKEND REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  if (req.method !== 'GET' && req.body) {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/groups', groupRoutes);

app.get('/', (req, res) => {
  res.send('SmartERP backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get('/api/protected', protect, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});
