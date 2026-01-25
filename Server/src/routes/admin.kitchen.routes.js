const express = require('express');

const { adminKitchenListDeliveries, adminKitchenUpdateDeliveryStatus } = require('../controllers/adminKitchen.controller');

const router = express.Router();

// Phase 6D: Kitchen operations (secured by admin.routes.js)
router.get('/deliveries', adminKitchenListDeliveries);
router.patch('/deliveries/:deliveryId/status', adminKitchenUpdateDeliveryStatus);

module.exports = router;
