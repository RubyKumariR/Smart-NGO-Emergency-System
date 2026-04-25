const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true
    },

    location: {
        type: {
            type: String,
            enum: ["Point"],   // GeoJSON format
            default: "Point"
        },
        coordinates: {
            type: [Number],   // [lng, lat]
            required: true
        }
    },

    urgency: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },

    people_affected: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: ["pending", "in-progress", "completed"],
        default: "pending"
    }

}, { timestamps: true });


// 🔥 IMPORTANT for location-based queries (nearby tasks)
taskSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Task", taskSchema);