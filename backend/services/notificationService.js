const nodemailer = require('nodemailer');
const Case = require('../models/Case');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendTaskAssignmentEmail(volunteer, task, ngo) {
    const mailOptions = {
        from: `"Smart NGO" <${process.env.EMAIL_USER}>`,
        to: volunteer.email,
        subject: `🎯 New Task Assigned: ${task.text}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #b71c1c;">🌟 New Volunteer Task Assigned!</h2>
                <p>Dear <strong>${volunteer.fullName}</strong>,</p>
                <p>Your skills match a new emergency task created by <strong>${ngo?.organizationName || ngo?.fullName || 'NGO'}</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">📋 Task Details:</h3>
                    <p><strong>Task:</strong> ${task.text}</p>
                    <p><strong>Type:</strong> ${task.type}</p>
                    <p><strong>Urgency:</strong> ${task.urgency_level}</p>
                    <p><strong>People Affected:</strong> ${task.people_affected}</p>
                    <p><strong>Required Skills:</strong> ${task.skills_required?.join(', ') || 'None'}</p>
                </div>
                <a href="http://localhost:3000/volunteertasks.html" style="background: #b71c1c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View My Tasks</a>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${volunteer.email}`);
    } catch (error) {
        console.error('Email error:', error);
    }
}

async function sendTaskAssignmentSMS(volunteer, task) {
    const message = `Smart NGO: Hi ${volunteer.fullName}, new task: "${task.text}" (${task.urgency_level}). Required skills: ${task.skills_required?.join(', ') || 'None'}. Login to dashboard.`;
    let phone = volunteer.phoneNumber;
    if (!phone.startsWith('+')) phone = '+91' + phone;
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
            const twilio = require('twilio');
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            await client.messages.create({ body: message, to: phone, from: process.env.TWILIO_PHONE_NUMBER });
            console.log(`📱 SMS sent to ${phone}`);
        } catch (error) {
            console.error('SMS error:', error);
        }
    } else {
        console.log(`📱 [SMS Simulated] To: ${phone}, Message: ${message}`);
    }
}

function calculateSkillMatch(volunteerSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) {
        return { matchedSkills: [], missingSkills: [], matchPercentage: 100 };
    }
    if (!volunteerSkills || volunteerSkills.length === 0) {
        return { matchedSkills: [], missingSkills: requiredSkills, matchPercentage: 0 };
    }
    
    const normalizedVolunteer = volunteerSkills.map(s => s.toLowerCase().trim());
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
    const matchedSkills = normalizedVolunteer.filter(skill => normalizedRequired.includes(skill));
    const matchPercentage = (matchedSkills.length / normalizedRequired.length) * 100;
    
    return { matchedSkills, missingSkills: normalizedRequired.filter(s => !normalizedVolunteer.includes(s)), matchPercentage: Math.round(matchPercentage) };
}

async function autoAssignTask(taskId, ngoUser) {
    const task = await Case.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    const volunteers = await User.find({ role: 'volunteer' });
    if (volunteers.length === 0) return { message: 'No volunteers registered yet' };
    
    const matches = volunteers.map(volunteer => ({ volunteer, ...calculateSkillMatch(volunteer.skills, task.skills_required) }))
        .filter(m => m.matchPercentage >= 50)
        .sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    const assignments = [];
    for (const match of matches) {
        task.assignedTo = match.volunteer._id;
        task.status = 'accepted';
        await task.save();
        await sendTaskAssignmentEmail(match.volunteer, task, ngoUser);
        await sendTaskAssignmentSMS(match.volunteer, task);
        assignments.push({ volunteer: match.volunteer.fullName, email: match.volunteer.email, matchPercentage: match.matchPercentage, matchedSkills: match.matchedSkills });
        break;
    }
    return { taskAssigned: assignments.length > 0, assignments };
}

module.exports = {
    sendTaskAssignmentEmail,
    sendTaskAssignmentSMS,
    calculateSkillMatch,
    autoAssignTask
};