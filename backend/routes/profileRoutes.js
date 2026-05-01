const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Update profile
router.put('/profile/update', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                fullName: req.body.fullName,
                phoneNumber: req.body.phoneNumber,
                location: req.body.location
            },
            { new: true }
        );
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
});

module.exports = router;