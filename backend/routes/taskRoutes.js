const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { sendTaskAssignmentEmail, sendTaskAssignmentSMS, calculateSkillMatch, autoAssignTask } = require('../services/notificationService');

// Create Task (NGO only)
router.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const { text, type, urgency_level, people_affected, skills_required, summary } = req.body;
        
        const user = await User.findById(req.user.id);
        if (user.role !== 'ngo') {
            return res.status(403).json({ error: 'Only NGOs can create tasks' });
        }
        
        const newTask = new Case({
            text, type: type || 'Other', urgency_level: urgency_level || 'Medium',
            people_affected: people_affected || 0, skills_required: skills_required || [],
            summary, status: 'open', createdBy: req.user.id, createdAt: new Date()
        });
        await newTask.save();
        
        const assignmentResult = await autoAssignTask(newTask._id, user);
        res.status(201).json({ message: 'Task created successfully', task: newTask, assignments: assignmentResult });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get My Assigned Tasks (Volunteer)
router.get('/tasks/my-tasks', authMiddleware, async (req, res) => {
    try {
        const tasks = await Case.find({ assignedTo: req.user.id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Open Tasks (Available for volunteers)
router.get('/tasks/open-tasks', authMiddleware, async (req, res) => {
    try {
        const tasks = await Case.find({ status: 'open', assignedTo: null }).sort({ urgency_level: -1, createdAt: -1 });
        const user = await User.findById(req.user.id);
        
        if (user.role === 'volunteer') {
            const tasksWithMatch = tasks.map(task => ({ ...task.toObject(), ...calculateSkillMatch(user.skills, task.skills_required) }));
            return res.json(tasksWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage));
        }
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Task Status
router.put('/tasks/:taskId/status', authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        const task = await Case.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        const user = await User.findById(req.user.id);
        if (user.role === 'volunteer' && task.assignedTo?.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        task.status = status;
        await task.save();
        res.json({ message: 'Task status updated', task });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual Assign Task (NGO only)
router.post('/tasks/assign', authMiddleware, async (req, res) => {
    try {
        const { taskId, volunteerId } = req.body;
        const user = await User.findById(req.user.id);
        if (user.role !== 'ngo') {
            return res.status(403).json({ error: 'Only NGOs can assign tasks' });
        }
        
        const task = await Case.findById(taskId);
        const volunteer = await User.findById(volunteerId);
        if (!task || !volunteer) {
            return res.status(404).json({ error: 'Task or volunteer not found' });
        }
        
        task.assignedTo = volunteerId;
        task.status = 'accepted';
        await task.save();
        await sendTaskAssignmentEmail(volunteer, task, user);
        await sendTaskAssignmentSMS(volunteer, task);
        res.json({ message: 'Task assigned successfully', task });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Volunteers (NGO only)
router.get('/volunteers', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'ngo') {
            return res.status(403).json({ error: 'Only NGOs can view volunteers' });
        }
        const volunteers = await User.find({ role: 'volunteer' }).select('fullName email phoneNumber location skills availability');
        res.json(volunteers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all cases
router.get('/cases', async (req, res) => {
    try {
        const cases = await Case.find().sort({ createdAt: -1 });
        res.json(cases);
    } catch (err) {
        console.log("Fetch cases error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;