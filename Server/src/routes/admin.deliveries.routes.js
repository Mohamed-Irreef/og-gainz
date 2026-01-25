const express = require('express');

const {
	adminListDailyDeliveries,
	adminGetDailyDelivery,
	adminUpdateDailyDeliveryStatus,
} = require('../controllers/adminDeliveries.controller');

const router = express.Router();

// Phase 6C: DailyDelivery admin APIs (secured by admin.routes.js)
router.get('/', adminListDailyDeliveries);
router.get('/:deliveryId', adminGetDailyDelivery);
router.patch('/:deliveryId/status', adminUpdateDailyDeliveryStatus);

module.exports = router;
