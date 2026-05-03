require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Import routes
const apiRoutes = require('./routes');
const aiRoutes = require('./routes/aiRoutes');
const aiTaskRoutes = require('./routes/aiTaskRoutes');
const ocrRoutes = require('./routes/ocrRoutes');  // ✅ ADD THIS LINE

const app = express();

// ==================== MIDDLEWARE ====================
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(cors());
app.use(express.json());

// ==================== MULTER UPLOAD CONFIGURATION ====================
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('📁 Uploads folder created');
}

// Also create OCR upload directory
const ocrUploadDir = './uploads/ocr';
if (!fs.existsSync(ocrUploadDir)) {
    fs.mkdirSync(ocrUploadDir, { recursive: true });
    console.log('📁 OCR uploads folder created');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.locals.upload = upload;
console.log('✅ File upload system ready');

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.DB_CONNECT_STRING || 'mongodb://127.0.0.1:27017/hackathon')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==================== ROUTES ====================
// Mount all routes under /api
app.use('/api', apiRoutes);  // This handles /api/auth, /api/ai, /api/tasks, etc.
app.use('/api/ai', aiRoutes); // Additional AI routes (if needed)
app.use('/api/ai-tasks', aiTaskRoutes); // AI-powered task management routes
app.use('/api/ocr', ocrRoutes);  // ✅ ADD THIS LINE - OCR Scanner routes

// ==================== HEALTH CHECK ENDPOINT ====================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            auth: '/api/auth (login, register, profile)',
            tasks: '/api/tasks',
            'ai-tasks': '/api/ai-tasks (recommendations, insights, smart-assign)',
            ai: '/api/ai',
            ocr: '/api/ocr/scan',  // ✅ ADD THIS LINE
            cases: '/api/ai/cases',
            predict: '/api/ai/predict'
        }
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 API endpoints:`);
    console.log(`   - Health: http://localhost:${PORT}/api/health`);
    console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
    console.log(`   - Tasks: http://localhost:${PORT}/api/tasks`);
    console.log(`   - AI Tasks: http://localhost:${PORT}/api/ai-tasks`);
    console.log(`   - OCR: http://localhost:${PORT}/api/ocr/scan`);
    console.log(`   - AI Cases: http://localhost:${PORT}/api/ai/cases`);
    console.log(`   - AI Predict: http://localhost:${PORT}/api/ai/predict`);
});