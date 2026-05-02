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

// Auto-assign with WhatsApp - THIS IS THE CRITICAL FUNCTION
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
        
        // Send WhatsApp message
        try {
            const client = twilio(
                process.env.TWILIO_ACCOUNT_SID, 
                process.env.TWILIO_AUTH_TOKEN
            );
            
            // Clean phone number
            let phone = volunteer.phoneNumber.replace(/\D/g, '');
            if (phone.length === 10) {
                const to = `whatsapp:+91${phone}`;
                console.log(`📱 Sending WhatsApp to: ${to}`);
                
                const msg = await client.messages.create({
                    body: message,
                    from: 'whatsapp:+14155238886',
                    to: to
                });
                
                whatsappSent = true;
                messageSid = msg.sid;
                console.log(`✅ WhatsApp sent! SID: ${messageSid}`);
            } else {
                console.log(`❌ Invalid phone: ${phone} (length: ${phone.length})`);
            }
            
        } catch (twilioError) {
            console.error('❌ Twilio Error:', twilioError.message);
            whatsappSent = false;
        }
        
        res.json({ 
            success: true, 
            message: 'Task assigned successfully',
            whatsappSent: whatsappSent,
            messageSid: messageSid,
            volunteerPhone: volunteer.phoneNumber
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

module.exports = router;