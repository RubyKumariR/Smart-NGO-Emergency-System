const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Test SMS Endpoint
router.post('/test-sms', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number required' });
        }
        
        const testMessage = message || 'Test SMS from Smart NGO!';
        
        let cleaned = phoneNumber.toString().replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
        
        console.log(`📱 Sending test SMS to: ${cleaned}`);
        
        const twilio = require('twilio');
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        const result = await client.messages.create({
            body: testMessage,
            to: cleaned,
            from: process.env.TWILIO_PHONE_NUMBER
        });
        
        console.log(`✅ SMS sent! SID: ${result.sid}`);
        
        res.json({
            success: true,
            message: 'SMS sent successfully!',
            sid: result.sid
        });
        
    } catch (error) {
        console.error('❌ SMS error:', error.message);
        res.json({
            success: false,
            message: 'SMS failed',
            error: error.message
        });
    }
});

// Test Email Endpoint
router.post('/test-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
                user: 'a8ffb4001@smtp-brevo.com',
                pass: process.env.BREVO_API_KEY
            }
        });
        
        await transporter.sendMail({
            from: '"Smart NGO" <a8ffb4001@smtp-brevo.com>',
            to: email,
            subject: 'Test Email',
            html: '<h2>Test Successful!</h2>'
        });
        
        res.json({ message: 'Test email sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check Status Endpoint
router.get('/notification-status', (req, res) => {
    res.json({
        email: { configured: !!process.env.BREVO_API_KEY },
        sms: { 
            configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
            phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'not set'
        }
    });
});

module.exports = router;