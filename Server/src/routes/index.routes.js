const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const mealRoutes = require('./meal.routes');
const addonRoutes = require('./addon.routes');
const cartRoutes = require('./cart.routes');
const checkoutRoutes = require('./checkout.routes');
const subscriptionRoutes = require('./subscription.routes');
const deliveryRoutes = require('./delivery.routes');
const walletRoutes = require('./wallet.routes');
const consultationRoutes = require('./consultation.routes');
const locationRoutes = require('./location.routes');
const notificationRoutes = require('./notification.routes');
const webhooksRoutes = require('./webhooks.routes');
const ordersRoutes = require('./orders.routes');
const adminRoutes = require('./admin.routes');
const reportRoutes = require('./report.routes');
const commerceRoutes = require('./commerce.routes');

const router = express.Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/meals', mealRoutes);
router.use('/addons', addonRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/orders', ordersRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/wallet', walletRoutes);
router.use('/consultations', consultationRoutes);
router.use('/locations', locationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);
router.use('/commerce', commerceRoutes);

module.exports = router;
