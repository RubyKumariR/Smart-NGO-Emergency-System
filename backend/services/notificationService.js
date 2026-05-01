const twilio = require('twilio');

// Twilio Configuration (for WhatsApp/SMS)
// Sign up at https://www.twilio.com for free trial
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'your_account_sid';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'your_auth_token';
const client = require('twilio')(accountSid, authToken);

// For development without Twilio, we'll use console logs
const USE_TWILIO = false; // Set to true when you have Twilio credentials

// Send WhatsApp Message
async function sendWhatsAppMessage(to, message) {
    // Format phone number (remove any non-digit characters)
    const phoneNumber = to.replace(/\D/g, '');
    
    // For development, just log
    if (!USE_TWILIO) {
        console.log(`📱 WhatsApp to ${phoneNumber}: ${message}`);
        return { success: true, message: 'Message logged (development mode)' };
    }
    
    try {
        const response = await client.messages.create({
            body: message,
            from: 'whatsapp:+14155238886', // Twilio WhatsApp sandbox number
            to: `whatsapp:+${phoneNumber}`
        });
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error('WhatsApp error:', error);
        return { success: false, error: error.message };
    }
}

// Send SMS Message
async function sendSMS(to, message) {
    const phoneNumber = to.replace(/\D/g, '');
    
    if (!USE_TWILIO) {
        console.log(`📱 SMS to ${phoneNumber}: ${message}`);
        return { success: true, message: 'Message logged (development mode)' };
    }
    
    try {
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            to: `+${phoneNumber}`
        });
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error('SMS error:', error);
        return { success: false, error: error.message };
    }
}

// Send Email (using nodemailer)
const nodemailer = require('nodemailer');

const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your_app_password'
    }
});

async function sendEmail(to, subject, text) {
    try {
        const info = await emailTransporter.sendMail({
            from: process.env.EMAIL_USER || 'smartngo@example.com',
            to: to,
            subject: subject,
            text: text,
            html: text.replace(/\n/g, '<br>')
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

// Send task assignment notification
async function notifyVolunteer(volunteer, task) {
    const message = `
🚨 SMART NGO TASK ASSIGNMENT 🚨

📋 Task: ${task.type || 'Emergency Task'}
📍 Location: ${task.location_name || 'Unknown'}
👥 People Affected: ${task.people_affected || 0}
⚠️ Priority: ${task.urgency_level || 'Medium'}

📝 Description: ${task.summary || task.text || 'No description'}

🛠️ Skills Required: ${task.skills_required?.join(', ') || 'None'}

🎯 Your Match Score: ${task.matchPercentage || 85}%

Please respond to accept or reject this task.

Reply: ACCEPT or REJECT
    `;
    
    // Send via SMS/WhatsApp
    if (volunteer.phoneNumber) {
        await sendSMS(volunteer.phoneNumber, message);
        await sendWhatsAppMessage(volunteer.phoneNumber, message);
    }
    
    // Send email
    if (volunteer.email) {
        await sendEmail(volunteer.email, `New Task Assignment: ${task.type}`, message);
    }
    
    return { success: true };
}

module.exports = {
    sendWhatsAppMessage,
    sendSMS,
    sendEmail,
    notifyVolunteer
};