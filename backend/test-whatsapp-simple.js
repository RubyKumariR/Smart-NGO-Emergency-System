const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const toNumber = process.env.TEST_PHONE_NUMBER || '918050035131';

console.log('Sending WhatsApp message to:', toNumber);

client.messages
    .create({
        body: 'Hello from Smart NGO! WhatsApp is working! 🎉',
        from: 'whatsapp:+14155238886',
        to: `whatsapp:+${toNumber}`
    })
    .then(message => {
        console.log('✅ Sent! SID:', message.sid);
        console.log('📱 Check your WhatsApp now!');
    })
    .catch(error => {
        console.error('❌ Error:', error.message);
    });