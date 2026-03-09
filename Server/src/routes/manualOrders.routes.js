const express = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const {
  createManualOrder,
  updateManualOrder,
  cancelManualOrder,
  getManualOrder,
  generateManualOrderBill,
  getManualOrderBill,
  markManualOrderPaid,
} = require('../controllers/manualOrders.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/', createManualOrder);
router.post('/generate-bill', generateManualOrderBill);
router.get('/:id/bill', getManualOrderBill);
router.get('/:id', getManualOrder);
router.patch('/:id', updateManualOrder);
router.patch('/:id/cancel', cancelManualOrder);
router.patch('/:id/mark-paid', markManualOrderPaid);

module.exports = router;
