const { sendTaskAssignment } = require('./services/whatsappService');
require('dotenv').config();

const taskDetails = {
    title: 'Emergency Flood Rescue',
    location: 'Mumbai, Andheri East',
    people_affected: 5000,
    urgency_level: 'High',
    skills_required: ['Rescue', 'Medical', 'First Aid']
};

sendTaskAssignment('918050035131', taskDetails, 94);