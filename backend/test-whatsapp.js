const twilio = require('twilio');

// Use environment variables - NO HARDCODED SECRETS!
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const toNumber = process.env.TEST_PHONE_NUMBER || '+918050035131';

client.messages
    .create({
        from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
        to: `whatsapp:${toNumber}`,
        body: 'Hello from Smart NGO! Your WhatsApp integration is WORKING! 🎉'
    })
    .then(message => console.log('✅ Message sent! SID:', message.sid))
    .catch(error => console.error('❌ Error:', error));