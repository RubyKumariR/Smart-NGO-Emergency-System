const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const taskRoutes = require('./taskRoutes');
const aiRoutes = require('./aiRoutes');
const documentRoutes = require('./documentRoutes');
const notificationRoutes = require('./notificationRoutes');

// Register routes
router.use('/auth', authRoutes);
router.use('/', profileRoutes);
router.use('/', taskRoutes);
router.use('/', aiRoutes);
router.use('/', documentRoutes);
router.use('/', notificationRoutes);

// Health check route
router.get('/health', (req, res) => {
    res.json({ message: 'Server is healthy 🟢' });
});

module.exports = router;