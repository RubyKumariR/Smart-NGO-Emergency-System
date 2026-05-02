const twilio = require('twilio');

// Use environment variables - NO HARDCODED SECRETS!
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Function to send task assignment to volunteer
async function sendTaskAssignment(volunteerPhone, taskDetails, matchScore) {
    const message = `🚨 *SMART NGO - NEW TASK* 🚨

📋 *Task:* ${taskDetails.title}
📍 *Location:* ${taskDetails.location}
👥 *People Affected:* ${taskDetails.people_affected}
⚠️ *Priority:* ${taskDetails.urgency_level}
🎯 *AI Match:* ${matchScore}%

*Skills Needed:* ${taskDetails.skills_required?.join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━
⏰ *Reply: ACCEPT or REJECT*
━━━━━━━━━━━━━━━━━━

Smart NGO - Helping Faster 🚀`;

    try {
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
            to: `whatsapp:${volunteerPhone}`
        });
        
        console.log(`✅ WhatsApp sent to ${volunteerPhone}`);
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error(`❌ WhatsApp failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// Function to send confirmation when task is accepted
async function sendAcceptanceConfirmation(volunteerPhone, taskDetails) {
    const message = `✅ *TASK ACCEPTED!* ✅

📍 *Location:* ${taskDetails.location}
📋 *Instructions:* Please reach the location and update status on the dashboard.

Thank you for your service! 🙏

Smart NGO 🚀`;

    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
            to: `whatsapp:${volunteerPhone}`
        });
        return { success: true };
    } catch (error) {
        console.error(`❌ Confirmation failed:`, error.message);
        return { success: false };
    }
}

module.exports = { sendTaskAssignment, sendAcceptanceConfirmation };