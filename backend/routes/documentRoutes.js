const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fs = require('fs');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Add this at the top of documentRoutes.js
const uploadMiddleware = (req, res, next) => {
    if (req.app.locals.upload) {
        req.app.locals.upload.array('documents', 10)(req, res, next);
    } else {
        next(new Error('Upload middleware not configured'));
    }
};

// Then update the upload route to use:
router.post('/upload-documents', authMiddleware, uploadMiddleware, async (req, res) => {
    // ... rest of the code
});

// Document Schema
const DocumentSchema = new mongoose.Schema({
    needId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filename: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    syncedAt: Date
});

const Document = mongoose.model('Document', DocumentSchema);

// Upload documents endpoint
router.post('/upload-documents', authMiddleware, uploadMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'ngo') {
            return res.status(403).json({ error: 'Only NGOs can upload documents' });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        const documents = [];
        for (const file of req.files) {
            const doc = new Document({
                ngoId: req.user.id,
                filename: file.filename,
                originalName: file.originalname,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
                status: 'synced'
            });
            await doc.save();
            documents.push(doc);
        }
        
        res.json({ 
            success: true, 
            message: `${req.files.length} file(s) uploaded successfully`,
            documents: documents 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all documents for current NGO
router.get('/my-documents', authMiddleware, async (req, res) => {
    try {
        const documents = await Document.find({ ngoId: req.user.id });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete document
router.delete('/delete-document/:docId', authMiddleware, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.docId);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        if (doc.ngoId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        if (fs.existsSync(doc.filePath)) {
            fs.unlinkSync(doc.filePath);
        }
        
        await Document.findByIdAndDelete(req.params.docId);
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download document
router.get('/download-document/:docId', authMiddleware, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.docId);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        if (doc.ngoId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        if (!fs.existsSync(doc.filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        res.download(doc.filePath, doc.originalName);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;