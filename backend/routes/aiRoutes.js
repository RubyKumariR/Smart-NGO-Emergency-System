const express = require('express');
const router = express.Router();
const axios = require('axios');
const Case = require('../models/Case');

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ 
        message: 'AI routes are working!',
        timestamp: new Date().toISOString()
    });
});

// Get all cases
router.get('/cases', async (req, res) => {
    try {
        const cases = await Case.find().sort({ createdAt: -1 });
        console.log(`📋 Found ${cases.length} cases`);
        res.json(cases);
    } catch (err) {
        console.error('Error fetching cases:', err);
        res.status(500).json({ error: 'Failed to fetch cases', details: err.message });
    }
});

// Predict endpoint
router.post('/predict', async (req, res) => {
    try {
        const { text, skills, people, address } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log('📡 Calling ML API with text:', text.substring(0, 100));

        // Call Python ML API on port 5001
        const aiRes = await axios.post('http://127.0.0.1:5001/predict', {
            text: text
        });

        const result = aiRes.data;
        console.log('✅ ML API response:', result.type, '-', result.urgency_level);

        const skills_required = skills
            ? skills.split(',').map(s => s.trim())
            : result.recommended_volunteer_type || [];

        // Save to database
        const savedCase = await Case.create({
            text: text,
            type: result.type,
            urgency_level: result.urgency_level,
            people_affected: people || result.people_affected,
            priority_score: result.priority_score,
            summary: result.summary,
            keywords: result.keywords || [],
            skills_required: skills_required,
            location_name: result.location_name || address || 'Unknown',
            latitude: result.location?.lat || null,
            longitude: result.location?.lng || null,
            status: 'open'
        });

        console.log('💾 Case saved with ID:', savedCase._id);

        // Return response
        res.json({
            success: true,
            type: result.type,
            urgency_level: result.urgency_level,
            people_affected: people || result.people_affected,
            priority_score: result.priority_score,
            summary: result.summary,
            keywords: result.keywords,
            skills_required: skills_required,
            location: {
                name: result.location_name,
                lat: result.location?.lat,
                lng: result.location?.lng
            },
            saved_id: savedCase._id,
            message: 'Emergency reported successfully!'
        });

    } catch (err) {
        console.error('❌ Prediction error:', err.message);
        
        if (err.code === 'ECONNREFUSED') {
            res.status(500).json({ 
                error: 'ML API is not running. Please start it with: python ml_api.py',
                details: 'Make sure ML API is running on port 5001'
            });
        } else if (err.response) {
            res.status(err.response.status).json({ 
                error: 'ML API error', 
                details: err.response.data 
            });
        } else {
            res.status(500).json({ 
                error: 'Internal server error', 
                details: err.message 
            });
        }
    }
});

// Get single case by ID
router.get('/cases/:id', async (req, res) => {
    try {
        const caseData = await Case.findById(req.params.id);
        if (!caseData) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json(caseData);
    } catch (err) {
        console.error('Error fetching case:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update case status
router.put('/cases/:id', async (req, res) => {
    try {
        const { status, assignedTo } = req.body;
        const updated = await Case.findByIdAndUpdate(
            req.params.id,
            { status, assignedTo },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json(updated);
    } catch (err) {
        console.error('Error updating case:', err);
        res.status(500).json({ error: err.message });
    }
});

// Gemini AI endpoint
router.post('/gemini', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        console.log('🤖 Gemini request:', message.substring(0, 100));
        
        // You can integrate actual Gemini API here
        // For now, return a helpful response
        res.json({ 
            reply: `🤖 I understand you're asking about: "${message}".\n\nI'm your AI assistant for emergency response. I can help you with:\n- Emergency reporting\n- Resource allocation\n- Volunteer coordination\n- Disaster management tips\n\nHow can I assist you further?`,
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        console.error('Gemini error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;