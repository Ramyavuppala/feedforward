const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getAvailableTasks,
  getMyTasks,
  acceptTask,
  updateTaskStatus,
} = require('../controllers/volunteerController');

const router = express.Router();

// GET /volunteer/tasks/available — tasks with no volunteer yet
router.get('/tasks/available', protect, authorize('volunteer'), getAvailableTasks);

// GET /volunteer/tasks/my — tasks for the logged-in volunteer
router.get('/tasks/my', protect, authorize('volunteer'), getMyTasks);

// Legacy alias: keep /volunteer/tasks for backwards compatibility (maps to "my" tasks)
router.get('/tasks', protect, authorize('volunteer'), getMyTasks);

// POST /volunteer/task/:id/accept — volunteer claims a pending task
router.post('/task/:id/accept', protect, authorize('volunteer'), acceptTask);

// PUT /volunteer/task/:id/status — accepted -> picked -> delivered
router.put('/task/:id/status', protect, authorize('volunteer'), updateTaskStatus);

module.exports = router;

