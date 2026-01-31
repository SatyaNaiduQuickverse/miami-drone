const express = require('express');
const router = express.Router();
const {
  getDrones,
  getDrone,
  createDrone,
  updateDrone,
  updateTelemetry,
  executeCommand,
  getDroneLogs
} = require('../controllers/droneController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .get(getDrones)
  .post(authorize('admin', 'supervisor'), createDrone);

router.route('/:id')
  .get(getDrone)
  .put(authorize('admin', 'supervisor'), updateDrone);

router.put('/:id/telemetry', updateTelemetry);
router.post('/:id/command', executeCommand);
router.get('/:id/logs', getDroneLogs);

module.exports = router;
