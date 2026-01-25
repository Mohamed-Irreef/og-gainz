const mongoose = require('mongoose');

const User = require('../models/User.model');
const Order = require('../models/Order.model');
const DailyDelivery = require('../models/DailyDelivery.model');
const CustomMealSubscription = require('../models/CustomMealSubscription.model');
const AddonSubscription = require('../models/AddonSubscription.model');

const safeString = (v) => String(v || '').trim();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || '').trim());

const parseLimit = (raw, fallback) => {
	const n = Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
	return Math.min(100, Math.max(1, n));
};

const parsePage = (raw) => {
	const n = Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) return 1;
	return Math.max(1, n);
};

const startOfDay = (d) => {
	const dt = new Date(d);
	dt.setHours(0, 0, 0, 0);
	return dt;
};

const localTodayISO = () => {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
};

const listUsers = async (req, res, next) => {
	try {
		const page = parsePage(req.query?.page);
		const limit = parseLimit(req.query?.limit, 20);
		const skip = (page - 1) * limit;
		const status = safeString(req.query?.status || 'all').toLowerCase();
		const search = safeString(req.query?.search || '');

		const match = {};
		if (status === 'active') match.isBlocked = false;
		else if (status === 'blocked') match.isBlocked = true;
		else if (status !== 'all') {
			return res.status(400).json({ status: 'error', message: 'Invalid status. Use all, active, or blocked.' });
		}

		if (search) {
			const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
			match.$or = [{ name: rx }, { email: rx }, { 'addresses.contactNumber': rx }];
		}

		const ordersCollection = Order.collection.name;
		const customSubsCollection = CustomMealSubscription.collection.name;
		const addonSubsCollection = AddonSubscription.collection.name;

		const agg = await User.aggregate([
			{ $match: match },
			{ $sort: { createdAt: -1 } },
			{
				$facet: {
					items: [
						{ $skip: skip },
						{ $limit: limit },
						{
							$addFields: {
								defaultAddress: {
									$first: {
										$filter: {
											input: '$addresses',
											as: 'a',
											cond: { $eq: ['$$a.isDefault', true] },
										},
									},
								},
							},
						},
						{
							$addFields: {
								phone: {
									$ifNull: [
										'$defaultAddress.contactNumber',
										{ $arrayElemAt: ['$addresses.contactNumber', 0] },
									],
								},
							},
						},
						{
							$lookup: {
								from: ordersCollection,
								let: { uid: '$_id' },
								pipeline: [
									{ $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
									{ $count: 'count' },
								],
								as: 'ordersCount',
							},
						},
						{
							$lookup: {
								from: customSubsCollection,
								let: { uid: '$_id' },
								pipeline: [
									{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$uid'] }, { $eq: ['$status', 'active'] }] } } },
									{ $count: 'count' },
								],
								as: 'customActive',
							},
						},
						{
							$lookup: {
								from: addonSubsCollection,
								let: { uid: '$_id' },
								pipeline: [
									{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$uid'] }, { $eq: ['$status', 'active'] }] } } },
									{ $count: 'count' },
								],
								as: 'addonActive',
							},
						},
						{
							$project: {
								_id: 0,
								userId: { $toString: '$_id' },
								name: '$name',
								email: '$email',
								phone: '$phone',
								walletBalance: { $ifNull: ['$walletBalance', 0] },
								isBlocked: { $ifNull: ['$isBlocked', false] },
								createdAt: '$createdAt',
								totalOrders: { $ifNull: [{ $arrayElemAt: ['$ordersCount.count', 0] }, 0] },
								activeSubscriptions: {
									$add: [
										{ $ifNull: [{ $arrayElemAt: ['$customActive.count', 0] }, 0] },
										{ $ifNull: [{ $arrayElemAt: ['$addonActive.count', 0] }, 0] },
									],
								},
							},
						},
					],
					meta: [{ $count: 'total' }],
				},
			},
		]);

		const doc = Array.isArray(agg) && agg.length ? agg[0] : { items: [], meta: [] };
		const total = Number(doc?.meta?.[0]?.total || 0);
		return res.json({
			status: 'success',
			data: {
				items: doc.items || [],
				meta: {
					page,
					limit,
					total,
					hasNextPage: skip + (doc.items?.length || 0) < total,
				},
			},
		});
	} catch (err) {
		return next(err);
	}
};

const getUser = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });

		const user = await User.findById(userId)
			.select({
				name: 1,
				email: 1,
				addresses: 1,
				walletBalance: 1,
				isBlocked: 1,
				blockedAt: 1,
				blockedBy: 1,
				createdAt: 1,
			})
			.lean();
		if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

		const defaultAddr = Array.isArray(user.addresses) ? user.addresses.find((a) => a?.isDefault) : undefined;
		const phone = safeString(defaultAddr?.contactNumber || (Array.isArray(user.addresses) ? user.addresses?.[0]?.contactNumber : '')) || undefined;

		return res.json({
			status: 'success',
			data: {
				userId: String(user._id),
				name: user.name,
				email: user.email,
				phone,
				walletBalance: typeof user.walletBalance === 'number' ? user.walletBalance : 0,
				createdAt: user.createdAt,
				isBlocked: Boolean(user.isBlocked),
				blockedAt: user.blockedAt || undefined,
				blockedBy: user.blockedBy ? String(user.blockedBy) : undefined,
				addresses: Array.isArray(user.addresses) ? user.addresses : [],
			},
		});
	} catch (err) {
		return next(err);
	}
};

const listUserSubscriptions = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });
		const uid = new mongoose.Types.ObjectId(userId);

		const [customMeal, addon] = await Promise.all([
			CustomMealSubscription.find({ userId: uid }).sort({ createdAt: -1 }).limit(200).lean(),
			AddonSubscription.find({ userId: uid }).sort({ createdAt: -1 }).limit(200).lean(),
		]);

		const normalizeCustom = (s) => ({
			id: String(s._id),
			kind: 'customMeal',
			frequency: s.frequency,
			status: s.status,
			startDate: s.startDate,
			endDate: undefined,
			mealName: 'Custom Meal Plan',
			servingsDone: undefined,
			totalServings: undefined,
			createdAt: s.createdAt,
		});

		const normalizeAddon = (s) => ({
			id: String(s._id),
			kind: 'addon',
			frequency: s.frequency,
			status: s.status,
			startDate: s.startDate,
			endDate: undefined,
			mealName: 'Add-on Subscription',
			servingsDone: 0,
			totalServings: typeof s.servings === 'number' ? s.servings : undefined,
			createdAt: s.createdAt,
		});

		const merged = [...(customMeal || []).map(normalizeCustom), ...(addon || []).map(normalizeAddon)].sort(
			(a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
		);

		return res.json({ status: 'success', data: merged });
	} catch (err) {
		return next(err);
	}
};

const listUserOrders = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });
		const uid = new mongoose.Types.ObjectId(userId);
		const limit = parseLimit(req.query?.limit, 20);

		const orders = await Order.find({ userId: uid })
			.sort({ createdAt: -1 })
			.limit(limit)
			.select({
				total: 1,
				status: 1,
				paymentStatus: 1,
				currentStatus: 1,
				acceptanceStatus: 1,
				payment: 1,
				createdAt: 1,
			})
			.lean();

		return res.json({
			status: 'success',
			data: (orders || []).map((o) => ({
				orderId: String(o._id),
				createdAt: o.createdAt,
				total: typeof o.total === 'number' ? o.total : 0,
				paymentStatus: o.paymentStatus || (String(o.status || '').toUpperCase() === 'PAID' ? 'PAID' : undefined),
				orderStatus: o.currentStatus || o.status,
				paidAt: o.payment?.paidAt || undefined,
				acceptanceStatus: o.acceptanceStatus || undefined,
			})),
		});
	} catch (err) {
		return next(err);
	}
};

const getUserWallet = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });

		const user = await User.findById(userId).select({ walletBalance: 1 }).lean();
		if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

		// Best-effort: derive recent credit usage from orders until WalletTransaction is implemented.
		const uid = new mongoose.Types.ObjectId(userId);
		const creditOrders = await Order.find({ userId: uid, creditsApplied: { $gt: 0 } })
			.sort({ createdAt: -1 })
			.limit(5)
			.select({ creditsApplied: 1, total: 1, createdAt: 1 })
			.lean();

		return res.json({
			status: 'success',
			data: {
				walletBalance: typeof user.walletBalance === 'number' ? user.walletBalance : 0,
				recentCredits: (creditOrders || []).map((o) => ({
					orderId: String(o._id),
					amount: Number(o.creditsApplied || 0),
					total: Number(o.total || 0),
					createdAt: o.createdAt,
				})),
			},
		});
	} catch (err) {
		return next(err);
	}
};

const getUserDeliveriesSummary = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });
		const uid = new mongoose.Types.ObjectId(userId);

		const today = startOfDay(new Date());
		const in7 = startOfDay(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
		const todayIso = localTodayISO();

		const [todayItems, upcomingItems, skippedCount] = await Promise.all([
			DailyDelivery.find({ userId: uid, date: todayIso })
				.sort({ deliveryTime: 1, time: 1 })
				.limit(50)
				.select({ date: 1, time: 1, status: 1, items: 1 })
				.lean(),
			DailyDelivery.find({ userId: uid, deliveryDate: { $gt: today, $lte: in7 } })
				.sort({ deliveryDate: 1, deliveryTime: 1, time: 1 })
				.limit(50)
				.select({ date: 1, time: 1, status: 1, items: 1 })
				.lean(),
			DailyDelivery.countDocuments({ userId: uid, status: 'SKIPPED', deliveryDate: { $gte: today } }),
		]);

		return res.json({
			status: 'success',
			data: {
				today: (todayItems || []).map((d) => ({
					id: String(d._id),
					date: d.date,
					time: d.time,
					status: d.status,
					itemsCount: Array.isArray(d.items) ? d.items.length : 0,
				})),
				upcoming: (upcomingItems || []).map((d) => ({
					id: String(d._id),
					date: d.date,
					time: d.time,
					status: d.status,
					itemsCount: Array.isArray(d.items) ? d.items.length : 0,
				})),
				skippedCount: Number(skippedCount || 0),
			},
		});
	} catch (err) {
		return next(err);
	}
};

const pauseAllSubscriptions = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });
		const uid = new mongoose.Types.ObjectId(userId);

		const [custom, addon] = await Promise.all([
			CustomMealSubscription.updateMany({ userId: uid, status: { $ne: 'paused' } }, { $set: { status: 'paused' } }),
			AddonSubscription.updateMany({ userId: uid, status: { $ne: 'paused' } }, { $set: { status: 'paused' } }),
		]);

		return res.json({
			status: 'success',
			data: { pausedCustomMeal: custom?.modifiedCount || 0, pausedAddon: addon?.modifiedCount || 0 },
		});
	} catch (err) {
		return next(err);
	}
};

const resumeAllSubscriptions = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });
		const uid = new mongoose.Types.ObjectId(userId);

		const [custom, addon] = await Promise.all([
			CustomMealSubscription.updateMany(
				{ userId: uid, status: 'paused' },
				{ $set: { status: 'active' }, $unset: { pauseStartDate: '', pauseEndDate: '', pauseReason: '', pauseRequestId: '' } }
			),
			AddonSubscription.updateMany(
				{ userId: uid, status: 'paused' },
				{ $set: { status: 'active' }, $unset: { pauseStartDate: '', pauseEndDate: '', pauseReason: '', pauseRequestId: '' } }
			),
		]);

		return res.json({
			status: 'success',
			data: { resumedCustomMeal: custom?.modifiedCount || 0, resumedAddon: addon?.modifiedCount || 0 },
		});
	} catch (err) {
		return next(err);
	}
};

const blockUser = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });

		const adminId = safeString(req.user?.id);
		const adminObjectId = isValidObjectId(adminId) ? new mongoose.Types.ObjectId(adminId) : undefined;

		const updated = await User.findOneAndUpdate(
			{ _id: userId, isBlocked: { $ne: true } },
			{ $set: { isBlocked: true, blockedAt: new Date(), blockedBy: adminObjectId } },
			{ new: true }
		).select({ name: 1, email: 1, isBlocked: 1, blockedAt: 1, blockedBy: 1 }).lean();

		if (!updated) {
			const existing = await User.findById(userId).select({ name: 1, email: 1, isBlocked: 1, blockedAt: 1, blockedBy: 1 }).lean();
			if (!existing) return res.status(404).json({ status: 'error', message: 'User not found' });
			return res.json({ status: 'success', data: { userId: String(existing._id), isBlocked: Boolean(existing.isBlocked), blockedAt: existing.blockedAt || undefined } });
		}

		return res.json({
			status: 'success',
			data: { userId: String(updated._id), isBlocked: true, blockedAt: updated.blockedAt || undefined },
		});
	} catch (err) {
		return next(err);
	}
};

const unblockUser = async (req, res, next) => {
	try {
		const userId = safeString(req.params?.userId);
		if (!isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });

		const updated = await User.findOneAndUpdate(
			{ _id: userId, isBlocked: true },
			{ $set: { isBlocked: false }, $unset: { blockedAt: 1, blockedBy: 1 } },
			{ new: true }
		).select({ isBlocked: 1 }).lean();

		if (!updated) {
			const existing = await User.findById(userId).select({ isBlocked: 1 }).lean();
			if (!existing) return res.status(404).json({ status: 'error', message: 'User not found' });
			return res.json({ status: 'success', data: { userId: String(existing._id), isBlocked: Boolean(existing.isBlocked) } });
		}

		return res.json({ status: 'success', data: { userId: String(userId), isBlocked: false } });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
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
};
