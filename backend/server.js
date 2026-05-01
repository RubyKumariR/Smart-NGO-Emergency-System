require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Import routes
const apiRoutes = require('./routes');

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
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Make upload available globally in routes
app.locals.upload = upload;
console.log('✅ File upload system ready');

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.DB_CONNECT_STRING || 'mongodb://127.0.0.1:27017/hackathon')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==================== ROUTES ====================
app.use('/api', apiRoutes);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});