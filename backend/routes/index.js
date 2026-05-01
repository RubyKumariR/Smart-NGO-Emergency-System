const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./authRoutes');
// const profileRoutes = require('./profileRoutes'); // COMMENT OUT - Profile routes are in authRoutes
const taskRoutes = require('./taskRoutes');
const aiTaskRoutes = require('./aiTaskRoutes'); // ADD AI Task Routes
const aiRoutes = require('./aiRoutes');
const documentRoutes = require('./documentRoutes');
const notificationRoutes = require('./notificationRoutes');

// Register routes
router.use('/auth', authRoutes);  // This now handles both auth AND profile
// router.use('/profile', profileRoutes); // REMOVE or COMMENT OUT - avoid conflict
router.use('/tasks', taskRoutes);
router.use('/ai-tasks', aiTaskRoutes); // ADD AI-powered task management routes
router.use('/ai', aiRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);

// Health check route
router.get('/health', (req, res) => {
    res.json({ 
        message: 'Server is healthy 🟢',
        timestamp: new Date().toISOString(),
        availableEndpoints: {
            auth: '/api/auth (login, register, profile)',
            tasks: '/api/tasks',
            'ai-tasks': '/api/ai-tasks (recommendations, smart-assign, insights)',
            ai: '/api/ai',
            documents: '/api/documents',
            notifications: '/api/notifications',
            health: '/api/health'
        }
    });
});

module.exports = router;