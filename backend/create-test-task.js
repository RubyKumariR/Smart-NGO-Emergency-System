const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const Case = require('./models/Case');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/smartngo');

// Wait for connection
setTimeout(async () => {
    try {
        console.log('Creating test data...');
        
        // Create test case
        const testCase = new Case({
            text: 'Test flood emergency',
            type: 'Flood',
            urgency_level: 'High',
            people_affected: 5000,
            skills_required: ['Rescue', 'Medical'],
            location_name: 'Mumbai',
            priority_score: 95
        });
        await testCase.save();
        console.log('✅ Test case created');

        // Find volunteer
        const volunteer = await User.findOne({ phoneNumber: '918050035131' });
        if (!volunteer) {
            console.log('❌ Volunteer not found');
            mongoose.disconnect();
            return;
        }
        console.log('✅ Volunteer found:', volunteer.fullName);

        // Create task
        const task = new Task({
            caseId: testCase._id,
            title: 'Emergency Flood Rescue',
            description: 'People stranded in flood waters need immediate rescue',
            skills_required: ['Rescue', 'Medical'],
            location: 'Mumbai, Andheri East',
            urgency_level: 'High',
            people_affected: 5000,
            assignedTo: volunteer._id,
            status: 'pending_confirmation',
            match_score: 94
        });

        await task.save();
        console.log('✅ Task created!');
        console.log('Task ID:', task._id.toString());
        console.log('Status:', task.status);

    } catch (err) {
        console.error('Error:', err.message);
    }
    
    setTimeout(() => {
        mongoose.disconnect();
        console.log('✅ Done');
    }, 1000);
}, 2000);