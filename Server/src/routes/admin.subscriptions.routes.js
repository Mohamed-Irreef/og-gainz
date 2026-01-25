const express = require('express');

const { adminListSubscriptions, adminSetSubscriptionStatus } = require('../controllers/adminSubscriptions.controller');

const router = express.Router();

// Phase 6C: admin subscriptions module (minimal list + pause/resume)
router.get('/', adminListSubscriptions);
router.patch('/:kind/:id/status', adminSetSubscriptionStatus);

module.exports = router;
