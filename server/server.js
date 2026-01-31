const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS - allow all origins for development
app.use(cors({
  origin: true,
  credentials: true
}));

// Mount routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/drones', require('./routes/drones'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Miami Police Drone API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 3002;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     MIAMI POLICE DRONE MANAGEMENT SYSTEM - BACKEND         ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  API Base URL: http://localhost:${PORT}/api                  ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
