const express = require('express');

const { quoteCart } = require('../controllers/cart.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

const authOptional = (req, res, next) => {
	const header = req.headers.authorization;
	if (!header) return next();
	return auth(req, res, next);
};

// Quote a mixed cart (meals, add-ons, BYO) with backend-only pricing & delivery.
// Auth is optional, but if present we can enforce trial-usage and wallet credit caps.
router.post('/quote', authOptional, quoteCart);

module.exports = router;
