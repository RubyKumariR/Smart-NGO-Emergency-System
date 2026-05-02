const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect('mongodb://127.0.0.1:27017/hackathon');

setTimeout(async () => {
    try {
        const result = await mongoose.connection.db.collection('users').updateOne(
            { fullName: 'riya kumari' },
            { $set: { phoneNumber: '918050035131' } }
        );
        
        if (result.modifiedCount > 0) {
            console.log('✅ Updated riya kumari\'s phone to: 918050035131');
        } else {
            console.log('⚠️ No user was updated. Check the name.');
        }
        
        // Verify the update
        const user = await mongoose.connection.db.collection('users').findOne({ fullName: 'riya kumari' });
        console.log('📱 Current phone:', user?.phoneNumber);
        
    } catch (err) {
        console.error('Error:', err.message);
    }
    mongoose.disconnect();
}, 2000);