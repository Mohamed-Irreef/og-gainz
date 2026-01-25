const express = require('express');
const auth = require('../middlewares/auth.middleware');
const ensureNotBlocked = require('../middlewares/blocked.middleware');
const {
	listCustomMealComponents,
	listCustomMealSubscriptions,
	createCustomMealSubscription,
	setCustomMealSubscriptionStatus,
	listAddonSubscriptions,
	createAddonSubscription,
	setAddonSubscriptionStatus,
	listAddonPurchases,
	createAddonPurchase,
} = require('../controllers/commerce.controller');

const byoRoutes = require('./byo.routes');

const router = express.Router();

// Phase 4 Commerce (kept separate from existing meal pack subscription flows)
router.get('/custom-meal-components', listCustomMealComponents);

// Build-your-own (backend-driven catalog + quote + create)
// Public endpoints (types/items/config/quote) should remain accessible without auth.
// Auth is applied per-route inside byo.routes.js for subscription/purchase creation.
router.use('/build-your-own', byoRoutes);

// Everything below is user-specific and requires auth
router.use(auth);

// Custom meal subscriptions
router.get('/custom-meal-subscriptions', listCustomMealSubscriptions);
router.post('/custom-meal-subscriptions', ensureNotBlocked, createCustomMealSubscription);
router.patch('/custom-meal-subscriptions/:id/status', setCustomMealSubscriptionStatus);

// Add-on subscriptions
router.get('/addon-subscriptions', listAddonSubscriptions);
router.post('/addon-subscriptions', ensureNotBlocked, createAddonSubscription);
router.patch('/addon-subscriptions/:id/status', setAddonSubscriptionStatus);

// Add-on purchases
router.get('/addon-purchases', listAddonPurchases);
router.post('/addon-purchases', ensureNotBlocked, createAddonPurchase);

module.exports = router;
