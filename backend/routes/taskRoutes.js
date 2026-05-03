const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { notifyVolunteer } = require('../services/notificationService');

// Get tasks assigned to the logged-in volunteer
router.get('/my-tasks', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        // Get tasks assigned to this volunteer
        const tasks = await Case.find({
            assignedTo: req.user.id,
            status: { $ne: 'completed' }
        }).sort({ createdAt: -1 });
        
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching my tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get open tasks (available for volunteers) with skill matching
router.get('/open-tasks', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const volunteerSkills = user.skills || [];
        
        // Get open tasks
        const tasks = await Case.find({
            status: 'open',
            assignedTo: null
        }).sort({ priority_score: -1, createdAt: 1 });
        
        // Calculate match percentage for each task
        const tasksWithMatch = tasks.map(task => {
            const requiredSkills = task.skills_required || [];
            
            if (requiredSkills.length === 0) {
                return { ...task.toObject(), matchPercentage: 50 };
            }
            
            const matchingSkills = requiredSkills.filter(skill => 
                volunteerSkills.some(vSkill => 
                    vSkill.toLowerCase().includes(skill.toLowerCase()) ||
                    skill.toLowerCase().includes(vSkill.toLowerCase())
                )
            );
            
            const matchPercentage = Math.round((matchingSkills.length / requiredSkills.length) * 100);
            
            return {
                ...task.toObject(),
                matchPercentage,
                matchedSkills: matchingSkills,
                suggested: matchPercentage >= 70
            };
        });
        
        // Sort by match percentage (highest first)
        tasksWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
        
        res.json(tasksWithMatch);
    } catch (error) {
        console.error('Error fetching open tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Auto-assign task to best matching volunteer
async function autoAssignTask(taskId) {
    try {
        const task = await Case.findById(taskId);
        if (!task || task.status !== 'open') return null;
        
        // Find all volunteers
        const volunteers = await User.find({ 
            role: 'volunteer',
            skills: { $exists: true, $ne: [] }
        });
        
        if (volunteers.length === 0) return null;
        
        // Calculate match scores
        const scores = volunteers.map(vol => {
            const requiredSkills = task.skills_required || [];
            const volunteerSkills = vol.skills || [];
            
            const matchedSkills = requiredSkills.filter(reqSkill =>
                volunteerSkills.some(vSkill =>
                    vSkill.toLowerCase().includes(reqSkill.toLowerCase()) ||
                    reqSkill.toLowerCase().includes(vSkill.toLowerCase())
                )
            );
            
            const score = matchedSkills.length;
            return { volunteer: vol, score, matchedSkills };
        });
        
        // Get top 3 matches
        const topMatches = scores.sort((a, b) => b.score - a.score).slice(0, 3);
        
        if (topMatches.length === 0 || topMatches[0].score === 0) return null;
        
        // Notify top matches
        for (const match of topMatches) {
            await notifyVolunteer(match.volunteer, {
                ...task.toObject(),
                matchPercentage: (match.matchedSkills.length / (task.skills_required?.length || 1)) * 100
            });
        }
        
        return topMatches;
    } catch (error) {
        console.error('Auto-assign error:', error);
        return null;
    }
}

// Accept a task (volunteer accepts assignment)
router.post('/:taskId/accept', authMiddleware, async (req, res) => {
    try {
        const task = await Case.findById(req.params.taskId);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        if (task.status !== 'open') {
            return res.status(400).json({ error: 'Task already assigned' });
        }
        
        // Assign task to volunteer
        task.status = 'accepted';
        task.assignedTo = req.user.id;
        await task.save();
        
        // Send confirmation
        const volunteer = await User.findById(req.user.id);
        const notificationMessage = `
✅ Task Accepted Successfully!

Task: ${task.type || 'Emergency Task'}
Location: ${task.location_name || 'Unknown'}

Instructions will be provided shortly.

Thank you for your service! 🙏
        `;
        
        await notifyVolunteer(volunteer, { ...task.toObject(), matchPercentage: 100 });
        
        res.json({ success: true, message: 'Task accepted successfully' });
    } catch (error) {
        console.error('Error accepting task:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update task status (start working, complete)
router.put('/:taskId/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Case.findById(req.params.taskId);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Verify volunteer owns this task
        if (task.assignedTo !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const validStatuses = ['accepted', 'in-progress', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        task.status = status;
        await task.save();
        
        // Send completion notification
        if (status === 'completed') {
            const volunteer = await User.findById(req.user.id);
            const completionMessage = `
🎉 Congratulations! You've completed a task!

Task: ${task.type || 'Emergency Task'}
Location: ${task.location_name || 'Unknown'}

Your contribution helped ${task.people_affected || 0} people.

✨ You've earned 100 points!
            `;
            await notifyVolunteer(volunteer, { ...task.toObject(), completion: true });
        }
        
        res.json({ success: true, task });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Auto-assign endpoint (for testing/admin)
router.post('/:taskId/auto-assign', authMiddleware, async (req, res) => {
    try {
        const matches = await autoAssignTask(req.params.taskId);
        res.json({ success: true, matches });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;