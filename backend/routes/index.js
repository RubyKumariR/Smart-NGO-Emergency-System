const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const aiTaskRoutes = require('./aiTaskRoutes');
const aiRoutes = require('./aiRoutes');
const documentRoutes = require('./documentRoutes');
const notificationRoutes = require('./notificationRoutes');
const whatsappWebhook = require('./whatsappWebhook');
const taskAssignmentRoutes = require('./taskAssignmentRoutes');
const ocrRoutes = require('./ocrRoutes');  // ✅ ADD THIS LINE - OCR Scanner

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/ai-tasks', aiTaskRoutes);
router.use('/ai', aiRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/whatsapp', whatsappWebhook);
router.use('/task-assignment', taskAssignmentRoutes);
router.use('/ocr', ocrRoutes);  // ✅ ADD THIS LINE - OCR routes

router.get('/health', (req, res) => {
    res.json({ 
        message: 'Server is healthy 🟢',
        timestamp: new Date().toISOString(),
        availableEndpoints: {
            auth: '/api/auth',
            tasks: '/api/tasks',
            'ai-tasks': '/api/ai-tasks',
            ai: '/api/ai',
            documents: '/api/documents',
            notifications: '/api/notifications',
            whatsapp: '/api/whatsapp/webhook',
            'task-assignment': '/api/task-assignment/my-tasks',
            ocr: '/api/ocr/scan',  // ✅ ADD THIS LINE
            health: '/api/health'
        }
    });
});

module.exports = router;