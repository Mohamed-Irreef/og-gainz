const express = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const { quoteDelivery, getFeeForDistance, listMyDailyDeliveries } = require('../controllers/delivery.controller');

const router = express.Router();

// Public: delivery distance + fee estimation (backend-only)
router.post('/quote', quoteDelivery);
router.get('/fee', getFeeForDistance);

// Phase 6C: User delivery timeline (read-only)
router.get('/my', authMiddleware, listMyDailyDeliveries);

module.exports = router;
