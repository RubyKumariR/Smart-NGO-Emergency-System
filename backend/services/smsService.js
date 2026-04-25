// Option 1: Using Twilio (recommended for production)
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send SMS using Twilio
 */
async function sendSMS_Twilio(phoneNumber, message) {
  try {
    await client.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    console.log(`📱 SMS sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return false;
  }
}

// Option 2: Using Textbelt (free tier available)
async function sendSMS_Textbelt(phoneNumber, message) {
  const response = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: phoneNumber,
      message: message,
      key: process.env.SMS_API_KEY
    })
  });
  const data = await response.json();
  return data.success;
}

// Main SMS sender (choose one based on your setup)
async function sendTaskAssignmentSMS(volunteer, task) {
  const message = `Smart NGO: Hi ${volunteer.fullName}, new task assigned: "${task.text}" (${task.urgency_level} urgency). Required skills: ${task.skills_required.join(', ')}. Login to dashboard for details.`;
  
  // Clean phone number (remove spaces, ensure country code)
  let phone = volunteer.phoneNumber;
  if (!phone.startsWith('+')) {
    phone = '+91' + phone; // Default to India, adjust as needed
  }
  
  // Try Twilio first, fallback to Textbelt
  const success = await sendSMS_Twilio(phone, message);
  if (!success) {
    await sendSMS_Textbelt(phone, message);
  }
  
  return success;
}

module.exports = { sendTaskAssignmentSMS };