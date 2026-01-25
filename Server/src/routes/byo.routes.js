const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const ensureNotBlocked = require('../middlewares/blocked.middleware');

const {
	listByoItemTypes,
	listByoItems,
	getByoConfig,
	quoteByo,
	createByoSubscription,
	createByoPurchase,
} = require('../controllers/byoPublic.controller');

const router = express.Router();

router.get('/item-types', listByoItemTypes);
router.get('/items', listByoItems);
router.get('/config', getByoConfig);
router.post('/quote', quoteByo);

router.post('/subscriptions', authMiddleware, ensureNotBlocked, createByoSubscription);
router.post('/purchases', authMiddleware, ensureNotBlocked, createByoPurchase);

module.exports = router;
