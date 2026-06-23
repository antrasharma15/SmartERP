require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const { protect } = require('./Middleware/authMiddleware');

const app = express();

// Configure CORS to support HTTP-only cookies with credentials
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser()); // Required to parse HTTP-only JWT cookies

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);

app.get('/', (req, res) => {
  res.send('SmartERP backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get('/api/protected', protect, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});
