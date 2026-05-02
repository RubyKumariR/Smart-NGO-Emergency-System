const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect('mongodb://127.0.0.1:27017/hackathon');

// Wait for connection to be ready
mongoose.connection.once('open', async () => {
    console.log('✅ MongoDB connected');
    
    try {
        // Get the database directly
        const db = mongoose.connection.db;
        
        // Find volunteer
        const volunteer = await db.collection('users').findOne({ 
            phoneNumber: '918050035131' 
        });
        
        if (!volunteer) {
            console.log('❌ Volunteer not found! Please register first.');
            mongoose.disconnect();
            return;
        }
        
        console.log('✅ Volunteer found:', volunteer.fullName);
        console.log('Volunteer ID:', volunteer._id);
        
        // Create task directly (bypass schema issues)
        const task = {
            title: 'Emergency Flood Rescue',
            location: 'Mumbai, Andheri East',
            people_affected: 5000,
            urgency_level: 'High',
            skills_required: ['Rescue', 'Medical', 'First Aid'],
            assignedTo: volunteer._id,
            status: 'pending_confirmation',
            match_score: 94,
            createdAt: new Date()
        };
        
        const result = await db.collection('tasks').insertOne(task);
        console.log('✅ Test task created!');
        console.log('Task ID:', result.insertedId);
        console.log('Status: pending_confirmation');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        mongoose.disconnect();
    }
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});