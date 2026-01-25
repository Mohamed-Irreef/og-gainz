const express = require('express');

const { handleRazorpayWebhook } = require('../controllers/webhooks.controller');

const router = express.Router();

// Razorpay webhooks (Phase 5A)
router.post('/razorpay', handleRazorpayWebhook);

module.exports = router;
