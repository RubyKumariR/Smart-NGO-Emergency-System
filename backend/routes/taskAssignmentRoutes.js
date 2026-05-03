const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Case = require('../models/Case');
const authMiddleware = require('../middleware/authMiddleware');
const twilio = require('twilio');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Task assignment routes are working!' });
});

// Get my assigned tasks
router.get('/my-tasks', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create task from case
router.post('/create-from-case/:caseId', authMiddleware, async (req, res) => {
    try {
        const emergencyCase = await Case.findById(req.params.caseId);
        if (!emergencyCase) {
            return res.status(404).json({ error: 'Case not found' });
        }
        
        const task = new Task({
            caseId: emergencyCase._id,
            title: `${emergencyCase.type || 'Emergency'} - ${emergencyCase.location_name || 'Unknown'}`,
            description: emergencyCase.summary || emergencyCase.text,
            skills_required: emergencyCase.skills_required || [],
            location: emergencyCase.location_name,
            urgency_level: emergencyCase.urgency_level,
            priority_score: emergencyCase.priority_score,
            people_affected: emergencyCase.people_affected,
            assignedBy: req.user.id,
            status: 'open'
        });
        
        await task.save();
        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto-assign with WhatsApp - FIXED VERSION
router.post('/:taskId/auto-assign', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        if (task.status !== 'open') {
            return res.status(400).json({ error: 'Task already assigned' });
        }
        
        const volunteer = await User.findById(req.user.id);
        if (!volunteer) {
            return res.status(404).json({ error: 'Volunteer not found' });
        }
        
        // Check if volunteer has phone number
        if (!volunteer.phoneNumber) {
            return res.status(400).json({ error: 'Volunteer has no phone number' });
        }
        
        // Update task
        task.assignedTo = req.user.id;
        task.status = 'pending_confirmation';
        task.assignedAt = new Date();
        await task.save();
        
        // Prepare WhatsApp message
        const message = `🚨 *SMART NGO - TASK ASSIGNMENT* 🚨

📋 *Task:* ${task.title}
📍 *Location:* ${task.location || 'Unknown'}
👥 *People Affected:* ${task.people_affected || 0}
⚠️ *Priority:* ${task.urgency_level || 'Medium'}

*Skills Required:* ${task.skills_required?.join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━
⏰ *Please respond within 5 minutes*

REPLY: *ACCEPT* or *REJECT*
━━━━━━━━━━━━━━━━━━

Smart NGO - Helping Faster 🚀`;

        let whatsappSent = false;
        let messageSid = null;
        let formattedPhone = null;
        
        // Send WhatsApp message
        try {
            const client = twilio(
                process.env.TWILIO_ACCOUNT_SID, 
                process.env.TWILIO_AUTH_TOKEN
            );
            
            // FIXED: Better phone number handling for Indian numbers
            let rawPhone = volunteer.phoneNumber.replace(/\D/g, '');
            let cleanPhone = rawPhone;
            
            // Handle different phone number formats
            if (cleanPhone.length === 10) {
                // 10-digit number (e.g., 9980493417) - add 91
                cleanPhone = `91${cleanPhone}`;
            } else if (cleanPhone.length === 11 && cleanPhone.startsWith('91')) {
                // 11-digit starting with 91 (e.g., 919980035131)
                cleanPhone = cleanPhone;
            } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
                // 12-digit with 91 (rare case)
                cleanPhone = cleanPhone;
            } else if (cleanPhone.length === 13 && cleanPhone.startsWith('919')) {
                // 13-digit with country code
                cleanPhone = cleanPhone;
            } else if (!cleanPhone.startsWith('91') && cleanPhone.length > 10) {
                // If it has country code other than 91, keep as is but ensure + prefix
                cleanPhone = cleanPhone;
            } else {
                // Default: add 91 prefix
                cleanPhone = `91${cleanPhone}`;
            }
            
            // Ensure the number starts with 91 for India
            if (!cleanPhone.startsWith('91')) {
                cleanPhone = `91${cleanPhone}`;
            }
            
            // Format for WhatsApp (must be in international format with +)
            formattedPhone = `whatsapp:+${cleanPhone}`;
            
            console.log('=== WHATSAPP SEND DEBUG ===');
            console.log(`Volunteer: ${volunteer.fullName}`);
            console.log(`Original phone: ${volunteer.phoneNumber}`);
            console.log(`Raw cleaned: ${rawPhone}`);
            console.log(`Final cleaned: ${cleanPhone}`);
            console.log(`WhatsApp formatted: ${formattedPhone}`);
            console.log(`Message length: ${message.length} chars`);
            
            const msg = await client.messages.create({
                body: message,
                from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
                to: formattedPhone
            });
            
            whatsappSent = true;
            messageSid = msg.sid;
            console.log(`✅ WhatsApp sent successfully!`);
            console.log(`✅ SID: ${messageSid}`);
            console.log(`✅ Status: ${msg.status}`);
            
        } catch (twilioError) {
            console.error('❌ Twilio Error Details:');
            console.error(`Message: ${twilioError.message}`);
            console.error(`Code: ${twilioError.code}`);
            console.error(`Status: ${twilioError.status}`);
            whatsappSent = false;
        }
        
        res.json({ 
            success: true, 
            message: 'Task assigned successfully',
            whatsappSent: whatsappSent,
            messageSid: messageSid,
            volunteerName: volunteer.fullName,
            volunteerPhone: volunteer.phoneNumber,
            formattedPhone: formattedPhone
        });
        
    } catch (error) {
        console.error('Auto-assign error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Accept task
router.post('/:taskId/accept', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not assigned to you' });
        }
        
        task.status = 'accepted';
        task.acceptedAt = new Date();
        await task.save();
        
        res.json({ success: true, message: 'Task accepted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark task as reached location
router.post('/:taskId/reached', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Check if task is assigned to this volunteer
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Task not assigned to you' });
        }
        
        // Check if task is in correct state
        if (task.status !== 'accepted') {
            return res.status(400).json({ error: 'Task must be accepted first' });
        }
        
        // Update task status
        task.status = 'reached';
        task.reachedAt = new Date();
        await task.save();
        
        console.log(`📍 Volunteer reached location for task: ${task.title}`);
        
        res.json({ success: true, message: 'Location reached!' });
        
    } catch (error) {
        console.error('Reached error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Complete task
router.post('/:taskId/complete', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not assigned to you' });
        }
        
        task.status = 'completed';
        task.completedAt = new Date();
        await task.save();
        
        res.json({ success: true, message: 'Task completed!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add completion notes endpoint
router.post('/:taskId/notes', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Task not assigned to you' });
        }
        
        task.completion_notes = req.body.completion_notes;
        await task.save();
        
        res.json({ success: true, message: 'Notes added!' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get detailed volunteer statistics for NGO dashboard
router.get('/volunteer-stats', authMiddleware, async (req, res) => {
    try {
        // Only NGOs can access this
        const requestingUser = await User.findById(req.user.id);
        if (requestingUser.role !== 'ngo') {
            return res.status(403).json({ error: 'Access denied. Only NGOs can view volunteer stats.' });
        }
        
        // Get all volunteers
        const volunteers = await User.find({ role: 'volunteer' }).select('-password');
        
        // Get statistics for each volunteer
        const volunteerStats = await Promise.all(volunteers.map(async (volunteer) => {
            // Get all tasks for this volunteer
            const tasks = await Task.find({ assignedTo: volunteer._id });
            
            // Calculate stats
            const assignedTasks = tasks.filter(t => t.status === 'pending_confirmation').length;
            const acceptedTasks = tasks.filter(t => t.status === 'accepted').length;
            const reachedTasks = tasks.filter(t => t.status === 'reached').length;
            const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
            const completedTasks = tasks.filter(t => t.status === 'completed').length;
            const rejectedTasks = tasks.filter(t => t.status === 'rejected').length;
            
            // Calculate completion rate
            const totalAssigned = assignedTasks + acceptedTasks + reachedTasks + inProgressTasks + completedTasks;
            const completionRate = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;
            
            // Get latest task info
            const latestTask = tasks.sort((a, b) => b.createdAt - a.createdAt)[0];
            
            return {
                volunteerId: volunteer._id,
                name: volunteer.fullName,
                email: volunteer.email,
                phone: volunteer.phoneNumber,
                location: volunteer.location,
                skills: volunteer.skills || [],
                availability: volunteer.availability,
                rating: volunteer.rating || 0,
                totalTasksCompleted: volunteer.totalTasksCompleted || 0,
                status: volunteer.status || 'active',
                stats: {
                    assigned: assignedTasks,
                    accepted: acceptedTasks,
                    reached: reachedTasks,
                    inProgress: inProgressTasks,
                    completed: completedTasks,
                    rejected: rejectedTasks,
                    completionRate: completionRate
                },
                latestTask: latestTask ? {
                    title: latestTask.title,
                    status: latestTask.status,
                    assignedAt: latestTask.assignedAt,
                    acceptedAt: latestTask.acceptedAt,
                    reachedAt: latestTask.reachedAt,
                    completedAt: latestTask.completedAt
                } : null
            };
        }));
        
        // Calculate overall statistics
        const overallStats = {
            totalVolunteers: volunteers.length,
            activeVolunteers: volunteers.filter(v => v.status === 'active').length,
            busyVolunteers: volunteers.filter(v => v.status === 'busy').length,
            totalTasksAssigned: volunteerStats.reduce((sum, v) => sum + v.stats.assigned, 0),
            totalTasksAccepted: volunteerStats.reduce((sum, v) => sum + v.stats.accepted, 0),
            totalTasksCompleted: volunteerStats.reduce((sum, v) => sum + v.stats.completed, 0),
            totalTasksRejected: volunteerStats.reduce((sum, v) => sum + v.stats.rejected, 0),
            averageCompletionRate: Math.round(volunteerStats.reduce((sum, v) => sum + v.stats.completionRate, 0) / (volunteerStats.length || 1))
        };
        
        res.json({
            success: true,
            volunteers: volunteerStats,
            overallStats: overallStats
        });
        
    } catch (error) {
        console.error('Error fetching volunteer stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test WhatsApp endpoint (for debugging)
router.post('/test-whatsapp', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({ error: 'Phone number and message required' });
        }
        
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        // Format phone number
        let rawPhone = phoneNumber.replace(/\D/g, '');
        let cleanPhone = rawPhone;
        
        if (cleanPhone.length === 10) {
            cleanPhone = `91${cleanPhone}`;
        }
        if (!cleanPhone.startsWith('91')) {
            cleanPhone = `91${cleanPhone}`;
        }
        
        const to = `whatsapp:+${cleanPhone}`;
        
        console.log(`Test send to: ${to}`);
        
        const msg = await client.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
            to: to
        });
        
        res.json({ 
            success: true, 
            messageSid: msg.sid,
            to: to,
            status: msg.status
        });
        
    } catch (error) {
        console.error('Test WhatsApp error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;