const mongoose = require("mongoose");

const taskAssignmentSchema = new mongoose.Schema({
    
    task_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",   // or "Case" if you're linking to Case model
        required: true
    },

    volunteer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",   // assuming volunteers are stored in User model
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "in-progress", "completed"],
        default: "pending"
    },

    assigned_at: {
        type: Date,
        default: Date.now
    },

    completed_at: {
        type: Date,
        default: null
    }

}, { timestamps: true });

module.exports = mongoose.model("TaskAssignment", taskAssignmentSchema);