const express = require('express');

const auth = require('../middlewares/auth.middleware');
const { listMyOrders, getMyOrderById } = require('../controllers/orders.controller');

const router = express.Router();

// Phase 5B: Orders are backend-authoritative.
router.use(auth);

router.get('/', listMyOrders);
router.get('/:orderId', getMyOrderById);

module.exports = router;
