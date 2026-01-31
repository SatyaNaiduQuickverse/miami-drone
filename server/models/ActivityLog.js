const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  drone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drone'
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  ipAddress: {
    type: String
  },
  response: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ user: 1, timestamp: -1 });
ActivityLogSchema.index({ drone: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
