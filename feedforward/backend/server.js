require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const requestRoutes = require('./routes/request');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notification');
const { autoExpireFood } = require('./jobs/expireFood');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/request', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notification', notificationRoutes);

app.get('/', (req, res) => res.json({ message: 'FeedForward API running' }));

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Cron: auto-expire food every 10 minutes
    cron.schedule('*/10 * * * *', () => autoExpireFood(io));
  })
  .catch((err) => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
