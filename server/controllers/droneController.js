const Drone = require('../models/Drone');
const ActivityLog = require('../models/ActivityLog');
const axios = require('axios');

// @desc    Get all drones
// @route   GET /api/drones
// @access  Private
exports.getDrones = async (req, res) => {
  try {
    const drones = await Drone.find({ isActive: true })
      .populate('assignedTo', 'name badge')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: drones.length,
      data: drones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single drone
// @route   GET /api/drones/:id
// @access  Private
exports.getDrone = async (req, res) => {
  try {
    const drone = await Drone.findById(req.params.id)
      .populate('assignedTo', 'name badge email')
      .populate('flightHistory.operator', 'name badge');

    if (!drone) {
      return res.status(404).json({
        success: false,
        message: 'Drone not found'
      });
    }

    res.status(200).json({
      success: true,
      data: drone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create drone
// @route   POST /api/drones
// @access  Private/Admin
exports.createDrone = async (req, res) => {
  try {
    const drone = await Drone.create(req.body);

    await ActivityLog.create({
      user: req.user._id,
      drone: drone._id,
      action: 'DRONE_CREATED',
      details: `Drone ${drone.name} (${drone.droneId}) created`,
      ipAddress: req.ip,
      status: 'success'
    });

    res.status(201).json({
      success: true,
      data: drone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update drone
// @route   PUT /api/drones/:id
// @access  Private/Admin
exports.updateDrone = async (req, res) => {
  try {
    const drone = await Drone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!drone) {
      return res.status(404).json({
        success: false,
        message: 'Drone not found'
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      drone: drone._id,
      action: 'DRONE_UPDATED',
      details: `Drone ${drone.name} updated`,
      ipAddress: req.ip,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      data: drone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update drone telemetry
// @route   PUT /api/drones/:id/telemetry
// @access  Private
exports.updateTelemetry = async (req, res) => {
  try {
    const { location, batteryLevel, speed, heading, satellites, signalStrength } = req.body;

    const drone = await Drone.findByIdAndUpdate(
      req.params.id,
      {
        location,
        batteryLevel,
        lastTelemetry: {
          speed,
          heading,
          satellites,
          signalStrength,
          timestamp: Date.now()
        }
      },
      { new: true }
    );

    if (!drone) {
      return res.status(404).json({
        success: false,
        message: 'Drone not found'
      });
    }

    res.status(200).json({
      success: true,
      data: drone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Execute drone command
// @route   POST /api/drones/:id/command
// @access  Private
exports.executeCommand = async (req, res) => {
  try {
    const { command, params } = req.body;
    const drone = await Drone.findById(req.params.id);

    if (!drone) {
      return res.status(404).json({
        success: false,
        message: 'Drone not found'
      });
    }

    // Forward command to the Flask gateway
    let response;
    try {
      const gatewayUrl = drone.apiEndpoint || process.env.GATEWAY_URL;
      response = await axios.post(`${gatewayUrl}/api/${command}`, params || {}, {
        timeout: 10000
      });
    } catch (gatewayError) {
      // Log the failed attempt
      await ActivityLog.create({
        user: req.user._id,
        drone: drone._id,
        action: `COMMAND_${command.toUpperCase()}`,
        details: `Command ${command} failed`,
        ipAddress: req.ip,
        response: gatewayError.message,
        status: 'failed'
      });

      return res.status(502).json({
        success: false,
        message: `Gateway error: ${gatewayError.message}`
      });
    }

    // Log the activity
    await ActivityLog.create({
      user: req.user._id,
      drone: drone._id,
      action: `COMMAND_${command.toUpperCase()}`,
      details: `Executed ${command} command`,
      ipAddress: req.ip,
      response: JSON.stringify(response.data),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get drone activity logs
// @route   GET /api/drones/:id/logs
// @access  Private
exports.getDroneLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({ drone: req.params.id })
      .populate('user', 'name badge')
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
