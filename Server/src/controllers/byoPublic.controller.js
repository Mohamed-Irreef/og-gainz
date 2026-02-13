const BuildYourOwnItemType = require('../models/BuildYourOwnItemType.model');
const BuildYourOwnItem = require('../models/BuildYourOwnItem.model');
const BuildYourOwnConfig = require('../models/BuildYourOwnConfig.model');
const BuildYourOwnPurchase = require('../models/BuildYourOwnPurchase.model');
const CustomMealSubscription = require('../models/CustomMealSubscription.model');

const PURCHASE_MODES = new Set(['single', 'weekly', 'monthly']);

const requireAuthUserId = (req) => {
	const userId = req?.user?.id;
	if (!userId) {
		const err = new Error('Authentication required');
		err.statusCode = 401;
		throw err;
	}
	return userId;
};

const parsePositiveInt = (value, fieldName) => {
	const n = Number(value);
	if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
		const err = new Error(`${fieldName} must be a positive integer`);
		err.statusCode = 400;
		throw err;
	}
	return n;
};

const getConfig = async () => {
	let cfg = await BuildYourOwnConfig.findOne({}).lean();
	if (!cfg) {
		cfg = await BuildYourOwnConfig.create({
			minimumWeeklyOrderAmount: 0,
			minimumMonthlyOrderAmount: 0,
			maximumWeeklyOrderAmount: 0,
			maximumMonthlyOrderAmount: 0,
		});
		cfg = cfg.toObject({ versionKey: false });
	}
	return cfg;
};

const listByoItemTypes = async (req, res, next) => {
	try {
		const types = await BuildYourOwnItemType.find({ isActive: true, deletedAt: { $exists: false } })
			.sort({ displayOrder: 1, createdAt: 1 })
			.lean();
		return res.json({
			status: 'success',
			data: types.map((t) => ({
				id: String(t._id),
				name: t.name,
				slug: t.slug,
				displayOrder: t.displayOrder,
			})),
		});
	} catch (err) {
		return next(err);
	}
};

const listByoItems = async (req, res, next) => {
	try {
		const items = await BuildYourOwnItem.find({ isActive: true, deletedAt: { $exists: false } })
			.populate({ path: 'itemTypeId', select: { name: 1, slug: 1, isActive: 1, displayOrder: 1, deletedAt: 1 } })
			.sort({ displayOrder: 1, createdAt: 1 })
			.lean();

		const filtered = items.filter((i) =>
			i.itemTypeId &&
			i.itemTypeId.isActive &&
			!i.itemTypeId.deletedAt &&
			i.image &&
			typeof i.image.url === 'string' &&
			i.image.url.trim()
		);

		return res.json({
			status: 'success',
			data: filtered.map((i) => ({
				id: String(i._id),
				name: i.name,
				itemTypeId: String(i.itemTypeId._id),
				itemTypeRef: {
					id: String(i.itemTypeId._id),
					name: i.itemTypeId.name,
					slug: i.itemTypeId.slug,
					displayOrder: i.itemTypeId.displayOrder,
				},
				quantityValue: i.quantityValue,
				quantityUnit: i.quantityUnit,
				proteinGrams: i.proteinGrams,
				calories: i.calories,
				pricing: i.pricing,
				servings: i.servings,
				image: i.image,
			})),
		});
	} catch (err) {
		return next(err);
	}
};

const getByoConfig = async (req, res, next) => {
	try {
		const cfg = await getConfig();
		return res.json({
			status: 'success',
			data: {
				id: String(cfg._id),
				minimumWeeklyOrderAmount: Number(cfg.minimumWeeklyOrderAmount || 0),
				minimumMonthlyOrderAmount: Number(cfg.minimumMonthlyOrderAmount || 0),
				maximumWeeklyOrderAmount: Number(cfg.maximumWeeklyOrderAmount || 0),
				maximumMonthlyOrderAmount: Number(cfg.maximumMonthlyOrderAmount || 0),
			},
		});
	} catch (err) {
		return next(err);
	}
};

const computeQuote = async ({ mode, selections }) => {
	if (!PURCHASE_MODES.has(mode)) {
		const err = new Error('Invalid purchase mode');
		err.statusCode = 400;
		throw err;
	}
	if (!Array.isArray(selections) || selections.length === 0) {
		return { total: 0, proteinGrams: 0, calories: 0, lineItems: [] };
	}

	const ids = selections.map((s) => String(s?.itemId || '').trim()).filter(Boolean);
	const items = await BuildYourOwnItem.find({
			_id: { $in: ids },
			isActive: true,
			deletedAt: { $exists: false },
		})
		.populate({
			path: 'itemTypeId',
			select: { isActive: 1, deletedAt: 1 },
			match: { isActive: true, deletedAt: { $exists: false } },
		})
		.lean();

	const activeItems = items.filter((i) => Boolean(i.itemTypeId));
	const byId = new Map(activeItems.map((i) => [String(i._id), i]));

	let total = 0;
	let proteinGrams = 0;
	let calories = 0;
	const lineItems = [];

	for (const sel of selections) {
		const itemId = String(sel?.itemId || '').trim();
		const quantity = parsePositiveInt(sel?.quantity, 'quantity');
		const item = byId.get(itemId);
		if (!item) {
			const err = new Error(`Unavailable itemId: ${itemId}`);
			err.statusCode = 400;
			throw err;
		}

		const unitPrice = Number(item?.pricing?.[mode] ?? 0);
		const lineTotal = unitPrice * quantity;
		total += lineTotal;
		if (typeof item.proteinGrams === 'number') proteinGrams += item.proteinGrams * quantity;
		if (typeof item.calories === 'number') calories += item.calories * quantity;

		lineItems.push({ itemId, quantity, unitPrice, lineTotal });
	}

	return { total, proteinGrams, calories, lineItems };
};

const quoteByo = async (req, res, next) => {
	try {
		const mode = String(req.body?.mode || '').trim();
		const selections = Array.isArray(req.body?.selections) ? req.body.selections : [];
		const cfg = await getConfig();

		const quote = await computeQuote({ mode, selections });

		let minimumRequired = 0;
		if (mode === 'weekly') minimumRequired = Number(cfg.minimumWeeklyOrderAmount || 0);
		if (mode === 'monthly') minimumRequired = Number(cfg.minimumMonthlyOrderAmount || 0);
		const meetsMinimum = quote.total >= minimumRequired;

		return res.json({
			status: 'success',
			data: {
				mode,
				total: quote.total,
				proteinGrams: quote.proteinGrams,
				calories: quote.calories,
				minimumRequired,
				meetsMinimum,
				lineItems: quote.lineItems,
			},
		});
	} catch (err) {
		return next(err);
	}
};

const createByoSubscription = async (req, res, next) => {
	try {
		const userId = requireAuthUserId(req);
		const mode = String(req.body?.mode || '').trim();
		const startDate = String(req.body?.startDate || '').trim();
		const selections = Array.isArray(req.body?.selections) ? req.body.selections : [];

		if (mode !== 'weekly' && mode !== 'monthly') {
			const err = new Error('Subscriptions support weekly or monthly only');
			err.statusCode = 400;
			throw err;
		}
		if (!startDate) {
			const err = new Error('startDate is required');
			err.statusCode = 400;
			throw err;
		}
		if (!selections.length) {
			const err = new Error('At least one selection is required');
			err.statusCode = 400;
			throw err;
		}

		const cfg = await getConfig();
		const quote = await computeQuote({ mode, selections });
		const minimumRequired = mode === 'weekly' ? Number(cfg.minimumWeeklyOrderAmount || 0) : Number(cfg.minimumMonthlyOrderAmount || 0);
		if (quote.total < minimumRequired) {
			const err = new Error(`Minimum ${mode} order is ${minimumRequired}`);
			err.statusCode = 400;
			throw err;
		}
		const maximumAllowed = mode === 'weekly' ? Number(cfg.maximumWeeklyOrderAmount || 0) : Number(cfg.maximumMonthlyOrderAmount || 0);
		if (maximumAllowed > 0 && quote.total > maximumAllowed) {
			const err = new Error(`Maximum ${mode} order is ${maximumAllowed}`);
			err.statusCode = 400;
			throw err;
		}

		// Keep CustomMealSubscription for compatibility with dashboard.
		// We store per-mode totals in weeklyPrice/monthlyPrice for consistency.
		const weeklyQuote = mode === 'weekly' ? quote : await computeQuote({ mode: 'weekly', selections });
		const monthlyQuote = mode === 'monthly' ? quote : await computeQuote({ mode: 'monthly', selections });
		const pricePerServing = 0;

		const created = await CustomMealSubscription.create({
			userId,
			frequency: mode,
			startDate,
			selections: selections.map((s) => ({
				componentId: String(s.itemId || '').trim(),
				quantity: parsePositiveInt(s.quantity, 'quantity'),
			})),
			totals: {
				proteinGrams: quote.proteinGrams,
				calories: quote.calories,
				pricePerServing,
				weeklyPrice: weeklyQuote.total,
				monthlyPrice: monthlyQuote.total,
			},
			status: 'active',
		});

		const obj = created.toObject({ versionKey: false });
		return res.status(201).json({
			status: 'success',
			data: {
				...obj,
				id: String(obj._id),
				userId: String(obj.userId),
			},
		});
	} catch (err) {
		return next(err);
	}
};

const createByoPurchase = async (req, res, next) => {
	try {
		const userId = requireAuthUserId(req);
		const mode = String(req.body?.mode || '').trim();
		const selections = Array.isArray(req.body?.selections) ? req.body.selections : [];

		if (mode !== 'single') {
			const err = new Error('Purchase supports single mode only');
			err.statusCode = 400;
			throw err;
		}
		if (!selections.length) {
			const err = new Error('At least one selection is required');
			err.statusCode = 400;
			throw err;
		}

		const quote = await computeQuote({ mode, selections });
		const created = await BuildYourOwnPurchase.create({
			userId,
			selections: selections.map((s) => ({
				itemId: String(s.itemId || '').trim(),
				quantity: parsePositiveInt(s.quantity, 'quantity'),
			})),
			total: quote.total,
			status: 'pending',
		});

		const obj = created.toObject({ versionKey: false });
		return res.status(201).json({
			status: 'success',
			data: {
				...obj,
				id: String(obj._id),
				userId: String(obj.userId),
			},
		});
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	listByoItemTypes,
	listByoItems,
	getByoConfig,
	quoteByo,
	createByoSubscription,
	createByoPurchase,
};
