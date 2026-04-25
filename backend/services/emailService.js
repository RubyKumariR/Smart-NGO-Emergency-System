const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send task assignment email to volunteer
 */
async function sendTaskAssignmentEmail(volunteer, task, ngo) {
  const mailOptions = {
    from: `"Smart NGO" <${process.env.EMAIL_USER}>`,
    to: volunteer.email,
    subject: `🎯 New Task Assigned: ${task.text}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #b71c1c;">🌟 New Volunteer Task Assigned!</h2>
        
        <p>Dear <strong>${volunteer.fullName}</strong>,</p>
        
        <p>Great news! Your skills match a new emergency task created by <strong>${ngo.organizationName || ngo.fullName}</strong>.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #b71c1c;">📋 Task Details:</h3>
          <p><strong>Task:</strong> ${task.text}</p>
          <p><strong>Type:</strong> ${task.type}</p>
          <p><strong>Urgency:</strong> ${task.urgency_level}</p>
          <p><strong>People Affected:</strong> ${task.people_affected}</p>
          <p><strong>Required Skills:</strong> ${task.skills_required.join(', ')}</p>
          <p><strong>Status:</strong> ${task.status}</p>
        </div>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2e7d32;">✅ Your Matched Skills:</h3>
          <p>${volunteer.skills.filter(skill => task.skills_required.includes(skill)).join(', ')}</p>
        </div>
        
        <p>Please login to your dashboard to view full details and update task status.</p>
        
        <a href="http://localhost:3000/volunteertasks.html" style="display: inline-block; background: #b71c1c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          View My Tasks
        </a>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated message from Smart NGO Platform.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${volunteer.email}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

/**
 * Send task update notification
 */
async function sendTaskUpdateEmail(volunteer, task, status) {
  const mailOptions = {
    from: `"Smart NGO" <${process.env.EMAIL_USER}>`,
    to: volunteer.email,
    subject: `📝 Task Status Update: ${task.text}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
        <h2 style="color: #b71c1c;">Task Status Updated</h2>
        <p>Dear ${volunteer.fullName},</p>
        <p>Your task "<strong>${task.text}</strong>" status has been changed to: <strong style="color: #b71c1c;">${status}</strong></p>
        <a href="http://localhost:3000/volunteertasks.html">View Details</a>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

module.exports = { sendTaskAssignmentEmail, sendTaskUpdateEmail };