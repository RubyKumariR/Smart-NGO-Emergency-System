const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        return res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Registration route
router.post('/register', async (req, res) => {
    try {
        const {
            role,
            fullName,
            email,
            phoneNumber,
            password,
            location,
            organizationName,
            ngoDescription,
            registrationNumber,
            skills,
            availability
        } = req.body;

        if (!role || !fullName || !email || !phoneNumber || !password || !location) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        if (role === 'ngo') {
            if (!organizationName || !ngoDescription || !registrationNumber) {
                return res.status(400).json({ error: 'NGO fields missing' });
            }
        } else if (role === 'volunteer') {
            if (!skills || !availability) {
                return res.status(400).json({ error: 'Volunteer fields missing' });
            }
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            role,
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            location,
            organizationName,
            ngoDescription,
            registrationNumber,
            skills: skills ? skills.split(',').map(skill => skill.trim()) : [],
            availability
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        return res.status(201).json({
            message: 'User registered successfully',
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update volunteer skills
router.put('/skills', authMiddleware, async (req, res) => {
    try {
        const { skills } = req.body;
        const user = await User.findById(req.user.id);
        if (user.role !== 'volunteer') {
            return res.status(403).json({ error: 'Only volunteers can update skills' });
        }
        
        user.skills = skills;
        await user.save();
        res.json({ message: 'Skills updated successfully', skills: user.skills });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;