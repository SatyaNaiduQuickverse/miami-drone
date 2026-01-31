const mongoose = require('mongoose');

const DroneSchema = new mongoose.Schema({
  droneId: {
    type: String,
    required: [true, 'Please provide a drone ID'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a drone name'],
    trim: true
  },
  model: {
    type: String,
    required: true,
    default: 'Standard Patrol Drone'
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'deployed', 'returning'],
    default: 'offline'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  location: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    altitude: { type: Number, default: 0 }
  },
  homeLocation: {
    latitude: { type: Number, default: 25.7617 },
    longitude: { type: Number, default: -80.1918 },
    altitude: { type: Number, default: 0 }
  },
  apiEndpoint: {
    type: String,
    required: true,
    default: 'http://localhost:8081'
  },
  cameraStreamUrl: {
    type: String,
    default: ''
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastTelemetry: {
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    satellites: { type: Number, default: 0 },
    signalStrength: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  },
  flightHistory: [{
    startTime: Date,
    endTime: Date,
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mission: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
DroneSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Drone', DroneSchema);
