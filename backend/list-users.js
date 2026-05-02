const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect('mongodb://127.0.0.1:27017/hackathon');

setTimeout(async () => {
    try {
        const users = await mongoose.connection.db.collection('users').find().toArray();
        console.log('Users in database:');
        if (users.length === 0) {
            console.log('No users found!');
        } else {
            users.forEach(u => {
                console.log(`- Name: ${u.fullName}, Phone: ${u.phoneNumber}, Role: ${u.role}`);
            });
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
    mongoose.disconnect();
}, 2000);