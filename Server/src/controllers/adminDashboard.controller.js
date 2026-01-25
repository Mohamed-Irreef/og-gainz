const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Consultation = require('../models/Consultation.model');
const CustomMealSubscription = require('../models/CustomMealSubscription.model');
const AddonSubscription = require('../models/AddonSubscription.model');

const startOfDay = (d) => {
	const dt = new Date(d);
	dt.setHours(0, 0, 0, 0);
	return dt;
};

const startOfMonth = (d) => {
	const dt = new Date(d);
	dt.setDate(1);
	dt.setHours(0, 0, 0, 0);
	return dt;
};

const addDays = (d, n) => {
	const dt = new Date(d);
	dt.setDate(dt.getDate() + n);
	return dt;
};

const percentChange = (current, previous) => {
	const c = Number(current || 0);
	const p = Number(previous || 0);
	if (p <= 0) return c <= 0 ? 0 : 100;
	return Math.round(((c - p) / p) * 100);
};

const getAdminDashboard = async (req, res, next) => {
	try {
		const now = new Date();
		const todayStart = startOfDay(now);
		const tomorrowStart = addDays(todayStart, 1);

		const weekStart = startOfDay(addDays(now, -6)); // last 7 days inclusive
		const prevWeekStart = startOfDay(addDays(weekStart, -7));
		const prevWeekEnd = weekStart;

		const monthStart = startOfMonth(now);
		const nextMonthStart = startOfMonth(addDays(monthStart, 35));
		const prevMonthStart = startOfMonth(addDays(monthStart, -1));
		const prevMonthEnd = monthStart;

		const paidClause = {
			$or: [{ paymentStatus: 'PAID' }, { status: 'PAID' }, { status: 'paid' }],
		};

		const revenueAgg = await Order.aggregate([
			{ $match: paidClause },
			{ $addFields: { paidAtEffective: { $ifNull: ['$payment.paidAt', '$createdAt'] } } },
			{
				$facet: {
					today: [
						{ $match: { paidAtEffective: { $gte: todayStart, $lt: tomorrowStart } } },
						{ $group: { _id: null, total: { $sum: '$total' } } },
					],
					week: [
						{ $match: { paidAtEffective: { $gte: weekStart, $lt: tomorrowStart } } },
						{ $group: { _id: null, total: { $sum: '$total' } } },
					],
					month: [
						{ $match: { paidAtEffective: { $gte: monthStart, $lt: nextMonthStart } } },
						{ $group: { _id: null, total: { $sum: '$total' } } },
					],
				},
			},
		]);

		const revenueDoc = Array.isArray(revenueAgg) && revenueAgg.length ? revenueAgg[0] : {};
		const revenueToday = Number(revenueDoc?.today?.[0]?.total || 0);
		const revenueWeek = Number(revenueDoc?.week?.[0]?.total || 0);
		const revenueMonth = Number(revenueDoc?.month?.[0]?.total || 0);

		const [
			totalOrders,
			activeCustomMealSubscriptions,
			activeAddonSubscriptions,
			totalUsers,
			pendingConsultations,
			ordersThisWeek,
			ordersPrevWeek,
			customSubsThisMonth,
			customSubsPrevMonth,
			addonSubsThisMonth,
			addonSubsPrevMonth,
			newUsersToday,
			recentConsultations,
		] = await Promise.all([
			Order.countDocuments({}),
			CustomMealSubscription.countDocuments({ status: 'active' }),
			AddonSubscription.countDocuments({ status: 'active' }),
			User.countDocuments({}),
			Consultation.countDocuments({ isRead: false, isArchived: false }),
			Order.countDocuments({ createdAt: { $gte: weekStart, $lt: tomorrowStart } }),
			Order.countDocuments({ createdAt: { $gte: prevWeekStart, $lt: prevWeekEnd } }),
			CustomMealSubscription.countDocuments({ createdAt: { $gte: monthStart, $lt: nextMonthStart } }),
			CustomMealSubscription.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: prevMonthEnd } }),
			AddonSubscription.countDocuments({ createdAt: { $gte: monthStart, $lt: nextMonthStart } }),
			AddonSubscription.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: prevMonthEnd } }),
			User.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
			Consultation.find({ isArchived: false })
				.sort({ isRead: 1, createdAt: -1 })
				.limit(5)
				.select({
					_id: 1,
					fullName: 1,
					whatsappNumber: 1,
					fitnessGoal: 1,
					createdAt: 1,
					isRead: 1,
				})
				.lean(),
		]);

		const activeSubscriptions = Number(activeCustomMealSubscriptions || 0) + Number(activeAddonSubscriptions || 0);
		const subsThisMonth = Number(customSubsThisMonth || 0) + Number(addonSubsThisMonth || 0);
		const subsPrevMonth = Number(customSubsPrevMonth || 0) + Number(addonSubsPrevMonth || 0);

		return res.json({
			stats: {
				totalOrders: Number(totalOrders || 0),
				activeSubscriptions,
				totalUsers: Number(totalUsers || 0),
				pendingConsultations: Number(pendingConsultations || 0),
			},
			growth: {
				ordersWeeklyPercent: percentChange(ordersThisWeek, ordersPrevWeek),
				subscriptionsMonthlyPercent: percentChange(subsThisMonth, subsPrevMonth),
				newUsersToday: Number(newUsersToday || 0),
			},
			revenue: {
				today: revenueToday,
				thisWeek: revenueWeek,
				thisMonth: revenueMonth,
			},
			recentConsultations: (recentConsultations || []).map((c) => ({
				_id: String(c._id),
				fullName: c.fullName,
				whatsappNumber: c.whatsappNumber,
				fitnessGoal: c.fitnessGoal,
				createdAt: c.createdAt,
				isRead: Boolean(c.isRead),
			})),
		});
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	getAdminDashboard,
};
