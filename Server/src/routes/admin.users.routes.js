const express = require('express');

const {
	listUsers,
	getUser,
	listUserSubscriptions,
	listUserOrders,
	getUserWallet,
	getUserDeliveriesSummary,
	pauseAllSubscriptions,
	resumeAllSubscriptions,
	blockUser,
	unblockUser,
} = require('../controllers/adminUsers.controller');

const router = express.Router();

router.get('/', listUsers);
router.get('/:userId', getUser);

router.get('/:userId/subscriptions', listUserSubscriptions);
router.post('/:userId/subscriptions/pause-all', pauseAllSubscriptions);
router.post('/:userId/subscriptions/resume-all', resumeAllSubscriptions);

router.get('/:userId/orders', listUserOrders);
router.get('/:userId/wallet', getUserWallet);
router.get('/:userId/deliveries', getUserDeliveriesSummary);

router.patch('/:userId/block', blockUser);
router.patch('/:userId/unblock', unblockUser);

module.exports = router;
