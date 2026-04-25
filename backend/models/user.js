const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['ngo', 'volunteer'],
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
    lowercase: true,
    trim: true
  },

  phoneNumber: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  location: {
    type: String,
    required: true
  },

  // NGO fields (optional)
  organizationName: {
    type: String,
    default: null
  },

  ngoDescription: {
    type: String,
    default: null
  },

  registrationNumber: {
    type: String,
    default: null
  },

  // Volunteer fields (optional)
  skills: {
    type: [String],
    default: []
  },

  availability: {
    type: String,
    default: null
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);