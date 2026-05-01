const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET user profile
router.get('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Map fields to match what profile page expects
        const profileData = {
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            location: user.location,
            role: user.role,
            organization: user.organizationName || user.organization,
            bio: user.ngoDescription || (user.skills ? `Skills: ${user.skills.join(', ')}` : ''),
            skills: user.skills,
            availability: user.availability,
            createdAt: user.createdAt
        };
        
        res.json(profileData);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT update user profile
router.put('/', verifyToken, async (req, res) => {
    try {
        const { fullName, phoneNumber, location, organization, bio, skills, availability } = req.body;
        
        const updateData = {
            fullName,
            phoneNumber,
            location,
            updatedAt: Date.now()
        };
        
        // Add role-specific fields
        const user = await User.findById(req.userId);
        if (user.role === 'ngo') {
            updateData.organizationName = organization;
            updateData.ngoDescription = bio;
        } else if (user.role === 'volunteer') {
            updateData.skills = skills ? skills.split(',').map(s => s.trim()) : [];
            updateData.availability = availability;
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { new: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;