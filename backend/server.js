require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const groupRoutes = require('./routes/groupRoutes');
const unitRoutes = require('./routes/unitRoutes');
const stockGroupRoutes = require('./routes/stockGroupRoutes');
const stockItemRoutes = require('./routes/stockItemRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const customerRoutes = require('./routes/customerRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const { protect } = require('./Middleware/authMiddleware');
const { checkLock } = require('./Middleware/lockMiddleware');

const os = require('os');

const app = express();

// Which backend copy is answering? In Docker, HOSTNAME is the container id.
const INSTANCE_ID = process.env.HOSTNAME || os.hostname();

// Behind Nginx every request arrives from the proxy's IP. Trusting one proxy hop makes
// req.ip (and the rate limiter) use the real client address from X-Forwarded-For.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || true);
}

app.use(helmet());

// Tag every response with the instance that served it (visible in browser DevTools > Network).
app.use((req, res, next) => {
  res.setHeader('X-Served-By', INSTANCE_ID);
  next();
});

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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id']
}));

app.use(express.json());
app.use(cookieParser()); // Required to parse HTTP-only JWT cookies

// Request Logging Middleware for diagnostics (redacts sensitive variables)
app.use((req, res, next) => {
  if (req.url === '/health') return next(); // skip noisy Docker healthcheck logs
  console.log(`[BACKEND REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
    if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
    console.log('Body:', JSON.stringify(sanitizedBody));
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
// Apply protect and checkLock to all business operations routers
app.use('/api/ledgers', protect, checkLock, ledgerRoutes);
app.use('/api/groups', protect, checkLock, groupRoutes);
app.use('/api/units', protect, checkLock, unitRoutes);
app.use('/api/stock-groups', protect, checkLock, stockGroupRoutes);
app.use('/api/stock-items', protect, checkLock, stockItemRoutes);
app.use('/api/vouchers', protect, checkLock, voucherRoutes);
app.use('/api/customers', protect, checkLock, customerRoutes);
app.use('/api/invoices', protect, checkLock, invoiceRoutes);
app.use('/api/reports', protect, checkLock, reportRoutes);
app.use('/api/settings', protect, checkLock, settingsRoutes);

app.get('/', (req, res) => {
  res.send('KEYbooks backend is running');
});

// Cloud Run startup/liveness probe. Must not touch the DB: a slow or cold
// Cloud SQL instance would otherwise fail the probe and kill a healthy revision.
// Load-balancing demo: refresh /whoami and watch the instance id change.
app.get('/whoami', (req, res) => res.json({ instance: INSTANCE_ID, pid: process.pid }));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} (instance ${INSTANCE_ID})`));
