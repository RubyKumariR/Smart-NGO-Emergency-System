const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const taskMessage = `🚨 *SMART NGO - TASK ASSIGNMENT* 🚨

📋 *Task:* Emergency Flood Rescue
📍 *Location:* Mumbai, Andheri East
👥 *People Affected:* 5000
⚠️ *Priority:* HIGH
🎯 *AI Match:* 94%

Skills Needed: Rescue, Medical, First Aid

━━━━━━━━━━━━━━━━━━
⏰ Reply: ACCEPT or REJECT
━━━━━━━━━━━━━━━━━━`;

client.messages.create({
    body: taskMessage,
    from: 'whatsapp:+14155238886',
    to: 'whatsapp:+918050035131'
}).then(() => console.log('✅ Task message sent!'))
.catch(e => console.error('❌ Error:', e.message));