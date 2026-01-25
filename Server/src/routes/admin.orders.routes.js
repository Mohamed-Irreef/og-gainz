const express = require('express');

const {
	adminListOrders,
	adminGetOrderDetails,
	adminUpdateOrderAcceptance,
	adminMoveOrderToKitchen,
	adminUpdateOrderStatus,
	adminUpdateOrderNotes,
} = require('../controllers/adminOrders.controller');

const router = express.Router();

// Phase 6A: Admin-only order lifecycle management
router.get('/', adminListOrders);
router.get('/:orderId', adminGetOrderDetails);
router.patch('/:orderId/acceptance', adminUpdateOrderAcceptance);
router.post('/:orderId/move-to-kitchen', adminMoveOrderToKitchen);
router.patch('/:orderId/status', adminUpdateOrderStatus);
router.patch('/:orderId/notes', adminUpdateOrderNotes);

module.exports = router;
