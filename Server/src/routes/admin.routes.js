const express = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const adminMealRoutes = require('./admin.meal.routes');
const adminAddonRoutes = require('./admin.addon.routes');
const adminMealTypeRoutes = require('./admin.mealType.routes');
const adminIncludedItemRoutes = require('./admin.includedItem.routes');
const adminAddonCategoryRoutes = require('./admin.addonCategory.routes');
const adminByoItemTypeRoutes = require('./admin.byoItemType.routes');
const adminByoItemRoutes = require('./admin.byoItem.routes');
const adminByoConfigRoutes = require('./admin.byoConfig.routes');
const adminOrdersRoutes = require('./admin.orders.routes');
const adminDeliveriesRoutes = require('./admin.deliveries.routes');
const adminSubscriptionsRoutes = require('./admin.subscriptions.routes');
const adminKitchenRoutes = require('./admin.kitchen.routes');
const adminPauseSkipRoutes = require('./admin.pauseSkip.routes');
const adminConsultationRoutes = require('./admin.consultation.routes');
const adminDashboardRoutes = require('./admin.dashboard.routes');
const adminUsersRoutes = require('./admin.users.routes');
const adminWalletRoutes = require('./admin.wallet.routes');

const router = express.Router();

// Phase 2: Admin routes are server-protected (no business logic in Phase 2)
router.use(authMiddleware);
router.use(adminMiddleware);

// Phase 3: Meals & Add-ons (secured)
router.use('/meals', adminMealRoutes);
router.use('/addons', adminAddonRoutes);
router.use('/meal-types', adminMealTypeRoutes);
router.use('/included-items', adminIncludedItemRoutes);
router.use('/addon-categories', adminAddonCategoryRoutes);

// Build-your-own (secured)
router.use('/byo-item-types', adminByoItemTypeRoutes);
router.use('/byo-items', adminByoItemRoutes);
router.use('/byo-config', adminByoConfigRoutes);

// Phase 6A: Orders lifecycle (secured)
router.use('/orders', adminOrdersRoutes);

// Phase 6C: DailyDelivery kitchen execution (secured)
router.use('/deliveries', adminDeliveriesRoutes);

// Phase 6C: Subscriptions module (secured)
router.use('/subscriptions', adminSubscriptionsRoutes);

// Phase 7: Pause/Skip request approvals (secured)
router.use('/pause-skip', adminPauseSkipRoutes);

// Phase 6D: Kitchen operations (secured)
router.use('/kitchen', adminKitchenRoutes);

// Consultations (secured)
router.use('/consultations', adminConsultationRoutes);

// Admin dashboard (secured)
router.use('/dashboard', adminDashboardRoutes);

// Users (secured)
router.use('/users', adminUsersRoutes);
router.use('/wallet', adminWalletRoutes);

// Minimal protected stub endpoint
router.get('/status', (req, res) => {
	return res.status(501).json({
		status: 'error',
		message: 'Not Implemented: admin API (future phase)',
	});
});

module.exports = router;
