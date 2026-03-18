const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createRequest,
  getMyRequests,
  getProviderRequests,
  updateRequestStatus,
} = require('../controllers/requestController');

// POST /request — seeker requests food
router.post('/', protect, authorize('seeker'), createRequest);

// GET /request/my — seeker's own requests
router.get('/my', protect, authorize('seeker'), getMyRequests);

// GET /request/provider — provider sees requests for their food
router.get('/provider', protect, authorize('provider'), getProviderRequests);

// PUT /request/:id — accept/reject/complete
router.put('/:id', protect, authorize('provider'), updateRequestStatus);

module.exports = router;
