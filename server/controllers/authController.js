const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (should be Admin only in production)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, badge } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { badge }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or badge already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      badge
    });

    sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Log the activity
    await ActivityLog.create({
      user: user._id,
      action: 'LOGIN',
      details: 'User logged in successfully',
      ipAddress: req.ip,
      status: 'success'
    });

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    await ActivityLog.create({
      user: req.user._id,
      action: 'LOGOUT',
      details: 'User logged out',
      ipAddress: req.ip,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      badge: user.badge,
      department: user.department
    }
  });
};
