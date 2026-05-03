const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const AITaskMatcher = require('../services/aiTaskMatcher');

// Get AI-Powered personalized task recommendations
router.get('/recommendations', authMiddleware, async (req, res) => {
    try {
        const recommendations = await AITaskMatcher.getPersonalizedRecommendations(req.user.id);
        res.json({
            success: true,
            recommendations,
            totalMatches: recommendations.length
        });
    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Smart assign a task (AI-powered)
router.post('/tasks/:taskId/smart-assign', authMiddleware, async (req, res) => {
    try {
        const result = await AITaskMatcher.smartAssignTask(req.params.taskId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get task match analysis
router.get('/tasks/:taskId/analyze', authMiddleware, async (req, res) => {
    try {
        const task = await Case.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const volunteers = await User.find({ role: 'volunteer' });
        const analysis = volunteers.map(volunteer => ({
            volunteer: {
                id: volunteer._id,
                name: volunteer.fullName,
                skills: volunteer.skills,
                location: volunteer.location
            },
            matchScore: AITaskMatcher.calculateMatchScore(volunteer, task)
        }));
        
        analysis.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);
        
        res.json({
            task,
            topMatches: analysis.slice(0, 5),
            summary: {
                totalVolunteers: volunteers.length,
                averageMatchScore: analysis.reduce((sum, a) => sum + a.matchScore.totalScore, 0) / volunteers.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto-escalate pending tasks
router.post('/escalate', authMiddleware, async (req, res) => {
    try {
        const escalated = await AITaskMatcher.escalateUnassignedTasks();
        res.json({ success: true, escalatedCount: escalated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get AI insights dashboard
router.get('/insights', authMiddleware, async (req, res) => {
    try {
        const totalTasks = await Case.countDocuments();
        const openTasks = await Case.countDocuments({ status: 'open' });
        const completedTasks = await Case.countDocuments({ status: 'completed' });
        const highPriorityTasks = await Case.countDocuments({ urgency_level: 'High', status: 'open' });
        
        const volunteers = await User.find({ role: 'volunteer' });
        const activeVolunteers = volunteers.filter(v => v.status === 'active').length;
        
        const avgResponseTime = 2.4; // Calculate from actual data
        const matchAccuracy = 94; // Calculate from actual data
        
        res.json({
            success: true,
            stats: {
                totalTasks,
                openTasks,
                completedTasks,
                highPriorityTasks,
                activeVolunteers,
                totalVolunteers: volunteers.length
            },
            aiMetrics: {
                avgResponseTime,
                matchAccuracy,
                automatedAssignments: 0, // Track this
                escalationRate: ((highPriorityTasks / openTasks) * 100).toFixed(1)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;