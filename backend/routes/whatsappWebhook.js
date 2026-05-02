const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');

// Twilio credentials - NOW USING ENV VARIABLES (NOT HARDCODED!)
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Function to send WhatsApp message
async function sendWhatsAppMessage(to, message) {
    try {
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
            to: `whatsapp:${to}`
        });
        console.log(`✅ WhatsApp sent to ${to}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ WhatsApp failed:`, error.message);
        return { success: false };
    }
}

// Twilio webhook - receives WhatsApp replies
router.post('/webhook', async (req, res) => {
    try {
        const incomingMsg = req.body.Body;
        const fromNumber = req.body.From;
        const phoneNumber = fromNumber.replace('whatsapp:+', '');
        
        console.log(`📩 WhatsApp from ${phoneNumber}: ${incomingMsg}`);
        
        // Find volunteer by phone number
        const volunteer = await User.findOne({ 
            phoneNumber: { $regex: phoneNumber.slice(-10) } 
        });
        
        if (!volunteer) {
            console.log(`❌ No volunteer found for ${phoneNumber}`);
            return res.status(200).send('<Response></Response>');
        }
        
        // Find pending task for this volunteer
        const pendingTask = await Task.findOne({
            assignedTo: volunteer._id,
            status: 'pending_confirmation'
        });
        
        if (!pendingTask) {
            console.log(`❌ No pending task for ${volunteer.fullName}`);
            return res.status(200).send('<Response></Response>');
        }
        
        const response = incomingMsg.trim().toUpperCase();
        const twiml = new twilio.twiml.MessagingResponse();
        
        if (response === 'ACCEPT') {
            // Update task status
            pendingTask.status = 'accepted';
            pendingTask.acceptedAt = new Date();
            await pendingTask.save();
            
            // Update volunteer status
            await User.findByIdAndUpdate(volunteer._id, { status: 'busy' });
            
            // Send confirmation
            await sendWhatsAppMessage(phoneNumber, `✅ Task Accepted!\n\n📍 Location: ${pendingTask.location}\n\nPlease update status on dashboard when you reach and complete.`);
            
            console.log(`✅ ${volunteer.fullName} ACCEPTED task: ${pendingTask.title}`);
            
            twiml.message(`✅ Task Accepted! Please proceed to location.`);
            
        } else if (response === 'REJECT') {
            pendingTask.status = 'rejected';
            pendingTask.assignedTo = null;
            await pendingTask.save();
            
            console.log(`❌ ${volunteer.fullName} REJECTED task: ${pendingTask.title}`);
            
            twiml.message(`❌ Task rejected. Thank you for letting us know.`);
            
        } else {
            twiml.message(`Reply with ACCEPT or REJECT`);
        }
        
        res.set('Content-Type', 'text/xml').send(twiml.toString());
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).send('<Response></Response>');
    }
});

module.exports = router;