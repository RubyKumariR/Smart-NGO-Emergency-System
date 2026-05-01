// const mongoose = require('mongoose');

// const caseSchema = new mongoose.Schema({
//   text: {
//     type: String,
//     required: true
//   },
//   type: {
//     type: String,
//     default: "Other"
//   },
//   urgency_level: {
//     type: String,
//     enum: ['Low', 'Medium', 'High'],
//     default: 'Medium'
//   },
//   people_affected: {
//     type: Number,
//     default: 0
//   },
//   priority_score: {
//     type: Number,
//     default: 5
//   },
//   summary: {
//     type: String
//   },
//   keywords: {
//     type: [String],
//     default: []
//   },
//   skills_required: {
//     type: [String],
//     default: []
//   },
//   status: {
//     type: String,
//     enum: ['open', 'accepted', 'in-progress', 'completed'],
//     default: 'open'
//   },
//   assignedTo: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     default: null
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('Case', caseSchema);


const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: "Other"
  },
  urgency_level: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  people_affected: {
    type: Number,
    default: 0
  },
  priority_score: {
    type: Number,
    default: 5
  },
  summary: {
    type: String
  },
  keywords: {
    type: [String],
    default: []
  },
  skills_required: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'accepted', 'in-progress', 'completed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // ========== NEW FIELDS FOR MAPPING ==========
  location_name: {
    type: String,        // e.g., "Mizoram, India", "Kerala coastal areas"
    default: null
  },
  latitude: {
    type: Number,        // e.g., 23.1645
    default: null
  },
  longitude: {
    type: Number,        // e.g., 92.9376
    default: null
  },
  // ===========================================
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Case', caseSchema);