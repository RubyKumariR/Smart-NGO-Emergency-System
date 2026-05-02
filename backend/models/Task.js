const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    skills_required: [{ type: String }],
    location: { type: String, default: '' },
    coordinates: { lat: { type: Number }, lng: { type: Number } },
    urgency_level: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    priority_score: { type: Number, default: 50 },
    people_affected: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['open', 'pending_confirmation', 'accepted', 'rejected', 'in_progress', 'reached', 'completed'], default: 'open' },
    match_score: { type: Number, default: 0 },
    assignedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    reachedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completion_notes: { type: String, default: '' },
    people_helped: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ⚠️ NO pre-save middleware - DELETE this block if it exists
// Do NOT add any pre('save') functions

module.exports = mongoose.model('Task', taskSchema);