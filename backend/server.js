require('dotenv').config(); // ← must be the very first line
console.log('ENV CHECK:', process.env.DATABASE_URL);

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('SmartERP backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const { protect } = require('./Middleware/authMiddleware');
app.get('/api/protected', protect, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});
