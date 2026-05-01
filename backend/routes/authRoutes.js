const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== LOGIN ROUTE ====================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
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

// ==================== REGISTRATION ROUTE ====================
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

        // Validation
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
            organizationName: organizationName || '',
            ngoDescription: ngoDescription || '',
            registrationNumber: registrationNumber || '',
            skills: skills ? skills.split(',').map(skill => skill.trim()) : [],
            availability: availability || ''
        });

        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== GET PROFILE (FETCH REAL DATA FROM DATABASE) ====================
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        console.log('Fetching profile for user ID:', req.user.id);
        
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const profileData = {
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            location: user.location,
            role: user.role,
            organization: user.organizationName || '',
            bio: user.role === 'ngo' ? (user.ngoDescription || '') : (user.skills ? `Skills: ${user.skills.join(', ')}` : ''),
            skills: user.skills || [],
            availability: user.availability || '',
            createdAt: user.createdAt
        };
        
        console.log('✅ Profile fetched successfully for:', user.email);
        res.json(profileData);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        console.log('Updating profile for user ID:', req.user.id);
        
        const { fullName, phoneNumber, location, organization, bio, skills, availability } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update common fields
        if (fullName) user.fullName = fullName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (location) user.location = location;
        
        // Update role-specific fields
        if (user.role === 'ngo') {
            if (organization) user.organizationName = organization;
            if (bio) user.ngoDescription = bio;
        } else if (user.role === 'volunteer') {
            if (skills) {
                user.skills = typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : skills;
            }
            if (availability) user.availability = availability;
        }
        
        await user.save();
        
        const updatedProfile = {
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            location: user.location,
            role: user.role,
            organization: user.organizationName || '',
            bio: user.role === 'ngo' ? (user.ngoDescription || '') : (user.skills ? user.skills.join(', ') : ''),
            skills: user.skills || [],
            availability: user.availability || '',
            createdAt: user.createdAt
        };
        
        console.log('✅ Profile updated successfully for:', user.email);
        res.json(updatedProfile);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ==================== UPDATE SKILLS (Volunteer only) ====================
router.put('/skills', authMiddleware, async (req, res) => {
    try {
        const { skills } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.role !== 'volunteer') {
            return res.status(403).json({ error: 'Only volunteers can update skills' });
        }
        
        user.skills = typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : skills;
        await user.save();
        
        res.json({ message: 'Skills updated successfully', skills: user.skills });
    } catch (error) {
        console.error('Skills update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all volunteers (for NGO dashboard)
router.get('/volunteers', authMiddleware, async (req, res) => {
    try {
        // Only NGOs can access this endpoint
        const requestingUser = await User.findById(req.user.id);
        if (requestingUser.role !== 'ngo') {
            return res.status(403).json({ error: 'Access denied. Only NGOs can view volunteers.' });
        }
        
        // Find all users with role 'volunteer'
        const volunteers = await User.find({ role: 'volunteer' }).select('-password');
        
        res.json(volunteers);
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get volunteers with filtering options
router.get('/volunteers/filter', authMiddleware, async (req, res) => {
    try {
        const { skill, location, availability } = req.query;
        let query = { role: 'volunteer' };
        
        if (skill) {
            query.skills = { $in: [new RegExp(skill, 'i')] };
        }
        if (location) {
            query.location = new RegExp(location, 'i');
        }
        if (availability) {
            query.availability = availability;
        }
        
        const volunteers = await User.find(query).select('-password');
        res.json(volunteers);
    } catch (error) {
        console.error('Error filtering volunteers:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;