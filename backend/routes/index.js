const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const aiTaskRoutes = require('./aiTaskRoutes');
const aiRoutes = require('./aiRoutes');
const documentRoutes = require('./documentRoutes');
const notificationRoutes = require('./notificationRoutes');

// Register routes
router.use('/auth', authRoutes);  // This handles login, register, profile, and volunteers
router.use('/tasks', taskRoutes);
router.use('/ai-tasks', aiTaskRoutes);
router.use('/ai', aiRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);

// Health check route
router.get('/health', (req, res) => {
    res.json({ 
        message: 'Server is healthy 🟢',
        timestamp: new Date().toISOString(),
        availableEndpoints: {
            auth: '/api/auth (login, register, profile, volunteers)',
            tasks: '/api/tasks',
            'ai-tasks': '/api/ai-tasks',
            ai: '/api/ai',
            documents: '/api/documents',
            notifications: '/api/notifications',
            health: '/api/health'
        }
    });
});

module.exports = router;