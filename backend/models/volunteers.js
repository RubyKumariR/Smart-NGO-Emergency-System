const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    role: {
        type: String,
        enum: ["ngo", "volunteer"],
        required: true
    },

    fullName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    phoneNumber: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    // 🌍 GEO LOCATION
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number], // [lng, lat]
            default: [0, 0]
        }
    },

    // 👇 VOLUNTEER FIELDS
    skills: [{
        type: String
    }],

    availability: {
        type: String,
        enum: ["part-time", "full-time"],
        default: "part-time"
    },

    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },

    // 👇 NGO FIELDS (optional)
    organizationName: String,
    registrationNumber: String,
    ngoDescription: String

}, { timestamps: true });


// 🔥 for location-based search (VERY IMPORTANT)
userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);