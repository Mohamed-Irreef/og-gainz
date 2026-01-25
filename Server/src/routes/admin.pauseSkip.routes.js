const express = require('express');

const {
	adminListPauseSkipRequests,
	adminDecidePauseSkipRequest,
} = require('../controllers/adminPauseSkip.controller');

const router = express.Router();

// Phase 7: Pause/Skip requests (admin approvals)
router.get('/requests', adminListPauseSkipRequests);
router.patch('/requests/:requestId', adminDecidePauseSkipRequest);

module.exports = router;
