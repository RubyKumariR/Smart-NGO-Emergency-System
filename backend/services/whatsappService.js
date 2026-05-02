const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

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
            from: 'whatsapp:+14155238886',
            to: `whatsapp:+${volunteerPhone}`
        });
        console.log(`✅ WhatsApp sent to ${volunteerPhone}`);
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error(`❌ WhatsApp failed:`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { sendTaskAssignment };