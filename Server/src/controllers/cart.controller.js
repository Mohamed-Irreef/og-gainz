const MealPack = require('../models/MealPack.model');
const Addon = require('../models/Addon.model');
const BuildYourOwnItem = require('../models/BuildYourOwnItem.model');
const BuildYourOwnConfig = require('../models/BuildYourOwnConfig.model');
const Order = require('../models/Order.model');
const User = require('../models/User.model');
const { ENV } = require('../config/env.config');
const {
  validateLatLng,
  haversineDistanceKm,
  applyBufferFactor,
  roundToDecimals,
} = require('../utils/distance.util');

const CART_ITEM_TYPES = new Set(['meal', 'addon', 'byo']);
const PLAN_TYPES = new Set(['single', 'trial', 'weekly', 'monthly']);

const DEFAULTS = {
	kitchenLatitude: 12.89245,
	kitchenLongitude: 80.204236,
  bufferFactor: 1.1,
	roundDecimals: 2,
  freeDeliveryDistanceKm: 5,
  maxDeliveryDistanceKm: 10,
  baseDeliveryFee: 0,
  deliveryFeePerKm: 10,
};

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const getDeliverySettings = () => {
  const kitchenLatitude = toFiniteNumber(process.env.KITCHEN_LAT) ?? DEFAULTS.kitchenLatitude;
  const kitchenLongitude = toFiniteNumber(process.env.KITCHEN_LNG) ?? DEFAULTS.kitchenLongitude;
  const bufferFactor = toFiniteNumber(process.env.DELIVERY_DISTANCE_BUFFER_FACTOR) ?? DEFAULTS.bufferFactor;
  const roundDecimals = toFiniteNumber(process.env.DELIVERY_DISTANCE_ROUND_DECIMALS) ?? DEFAULTS.roundDecimals;
  const freeDeliveryDistanceKm = toFiniteNumber(process.env.FREE_DELIVERY_DISTANCE_KM) ?? DEFAULTS.freeDeliveryDistanceKm;
  const maxDeliveryDistanceKm = ENV.MAX_DELIVERY_DISTANCE_KM ?? DEFAULTS.maxDeliveryDistanceKm;
  const baseDeliveryFee = ENV.BASE_DELIVERY_FEE ?? DEFAULTS.baseDeliveryFee;
  const deliveryFeePerKm = ENV.DELIVERY_FEE_PER_KM ?? DEFAULTS.deliveryFeePerKm;

  return {
    kitchen: { latitude: kitchenLatitude, longitude: kitchenLongitude },
    bufferFactor,
    roundDecimals,
    freeDeliveryDistanceKm,
    maxDeliveryDistanceKm,
    baseDeliveryFee,
    deliveryFeePerKm,
  };
};

const computeDeliveryFee = ({ distanceKm, freeDeliveryDistanceKm, baseDeliveryFee, deliveryFeePerKm }) => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  if (distanceKm <= freeDeliveryDistanceKm) return 0;
  const payableKm = Math.max(0, distanceKm - freeDeliveryDistanceKm);
  return Math.ceil(baseDeliveryFee + payableKm * deliveryFeePerKm);
};

const computeDistanceKmFromLocation = ({ latitude, longitude }) => {
  const settings = getDeliverySettings();
  const to = { latitude, longitude };
  if (!validateLatLng(to)) {
		return { distanceKm: undefined, feeRules: settings };
  }
  const raw = haversineDistanceKm({ from: settings.kitchen, to });
  const buffered = applyBufferFactor(raw, settings.bufferFactor);
  const distanceKm = roundToDecimals(buffered, settings.roundDecimals);
	return { distanceKm, feeRules: settings };
};

const computeDeliveryFromLocation = ({ latitude, longitude }) => {
	const { distanceKm, feeRules } = computeDistanceKmFromLocation({ latitude, longitude });
	if (!Number.isFinite(distanceKm)) {
		return { distanceKm: undefined, isServiceable: false, deliveryFee: 0, feeRules };
	}

	const isServiceable = distanceKm <= feeRules.maxDeliveryDistanceKm;
	const deliveryFee = isServiceable
		? computeDeliveryFee({
			distanceKm,
			freeDeliveryDistanceKm: feeRules.freeDeliveryDistanceKm,
			baseDeliveryFee: feeRules.baseDeliveryFee,
			deliveryFeePerKm: feeRules.deliveryFeePerKm,
		})
		: 0;
	return { distanceKm, isServiceable, deliveryFee, feeRules };
};

const getByoConfig = async () => {
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

const parsePositiveInt = (value, fieldName) => {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    const err = new Error(`${fieldName} must be a positive integer`);
    err.statusCode = 400;
    throw err;
  }
  return n;
};

const computeByoQuote = async ({ plan, selections }) => {
  if (plan !== 'single' && plan !== 'weekly' && plan !== 'monthly') {
    const err = new Error('Invalid BYO plan');
    err.statusCode = 400;
    throw err;
  }
  const normalizedSelections = Array.isArray(selections) ? selections : [];
  if (!normalizedSelections.length) {
    return { total: 0, lineItems: [], proteinGrams: 0, calories: 0 };
  }

  const ids = normalizedSelections.map((s) => String(s?.itemId || '').trim()).filter(Boolean);
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

  for (const sel of normalizedSelections) {
    const itemId = String(sel?.itemId || '').trim();
    const quantity = parsePositiveInt(sel?.quantity, 'quantity');
    const item = byId.get(itemId);
    if (!item) {
      const err = new Error(`Unavailable itemId: ${itemId}`);
      err.statusCode = 400;
      throw err;
    }
    const unitPrice = Number(item?.pricing?.[plan] ?? 0);
    const lineTotal = unitPrice * quantity;
    total += lineTotal;
    if (typeof item.proteinGrams === 'number') proteinGrams += item.proteinGrams * quantity;
    if (typeof item.calories === 'number') calories += item.calories * quantity;
    lineItems.push({ itemId, quantity, unitPrice, lineTotal });
  }

  return { total, lineItems, proteinGrams, calories };
};

const getPricingPlanPrice = (pricing, plan) => {
	if (!pricing || !plan) return 0;
	const tier = pricing?.[plan];
	// Legacy compatibility: some older docs stored numbers directly.
	if (typeof tier === 'number') return Number.isFinite(tier) ? tier : 0;
	return Number(tier?.price ?? 0);
};

const getMealUnitPrice = ({ meal, plan }) => {
	// Pricing authority is server-side. We try default pricing first, then fall back
	// to protein-mode pricing if default pricing is missing/zero.
	if (!meal) return 0;

	const fromDefault = getPricingPlanPrice(meal.pricing, plan);
	if (fromDefault > 0) return fromDefault;

	// Backward-safe fallback: if admins configured only proteinPricing, don’t return 0.
	const fromWith = getPricingPlanPrice(meal.proteinPricing?.withProtein, plan);
	if (fromWith > 0) return fromWith;
	const fromWithout = getPricingPlanPrice(meal.proteinPricing?.withoutProtein, plan);
	if (fromWithout > 0) return fromWithout;

	return 0;
};

const quoteCartData = async ({ userId, items, creditsToApply, deliveryLocation }) => {
	const normalizedItems = Array.isArray(items) ? items : [];
	const creditsRequested = toFiniteNumber(creditsToApply) ?? 0;
	const location = deliveryLocation && typeof deliveryLocation === 'object' ? deliveryLocation : null;
	const latitude = location ? toFiniteNumber(location.latitude) : undefined;
	const longitude = location ? toFiniteNumber(location.longitude) : undefined;
	const addressText = location && typeof location.address === 'string' ? location.address.trim() : '';

	if (!normalizedItems.length) {
		return {
			items: [],
			subtotal: 0,
			deliveryFee: 0,
			distanceKm: undefined,
			isServiceable: true,
			creditsApplied: 0,
			total: 0,
			deliveryLocation: undefined,
		};
	}

	const invalid = normalizedItems.find((i) => !i || !CART_ITEM_TYPES.has(String(i.type)) || !PLAN_TYPES.has(String(i.plan)));
	if (invalid) {
		const err = new Error('Invalid cart item in request');
		err.statusCode = 400;
		throw err;
	}

	const mealIds = normalizedItems.filter((i) => i.type === 'meal').map((i) => String(i.mealId || '').trim()).filter(Boolean);
	const addonIds = normalizedItems.filter((i) => i.type === 'addon').map((i) => String(i.addonId || '').trim()).filter(Boolean);

	const [meals, addons, byoCfg] = await Promise.all([
		mealIds.length
			? MealPack.find({ _id: { $in: mealIds }, isActive: true, deletedAt: { $exists: false } })
					.select({ name: 1, pricing: 1, proteinPricingMode: 1, proteinPricing: 1, isTrialEligible: 1 })
					.lean()
			: Promise.resolve([]),
		addonIds.length
			? Addon.find({ _id: { $in: addonIds }, isActive: true, deletedAt: { $exists: false } }).select({ name: 1, pricing: 1 }).lean()
			: Promise.resolve([]),
		getByoConfig(),
	]);

	const mealsById = new Map(meals.map((m) => [String(m._id), m]));
	const addonsById = new Map(addons.map((a) => [String(a._id), a]));

	let delivery = { distanceKm: undefined, isServiceable: true, deliveryFee: 0, feeRules: undefined };
	if (latitude !== undefined && longitude !== undefined) {
		delivery = computeDeliveryFromLocation({ latitude, longitude });
		if (!delivery.isServiceable) {
			return {
				items: [],
				subtotal: 0,
				deliveryFee: 0,
				distanceKm: delivery.distanceKm,
				isServiceable: false,
				creditsApplied: 0,
				total: 0,
				deliveryLocation: { latitude, longitude, address: addressText },
				reason: 'outside_delivery_area',
			};
		}
	}

	// Trial enforcement (only if authenticated)
	const trialMealIds = normalizedItems
		.filter((i) => i.type === 'meal' && i.plan === 'trial')
		.map((i) => String(i.mealId || '').trim())
		.filter(Boolean);

	let usedTrialMealIds = new Set();
	if (userId && trialMealIds.length) {
		const prev = await Order.find({
			userId,
			status: { $ne: 'cancelled' },
			items: { $elemMatch: { type: 'meal', plan: 'trial', mealId: { $in: trialMealIds } } },
		})
			.select({ items: 1 })
			.lean();

		for (const o of prev) {
			for (const it of o.items || []) {
				if (it && it.type === 'meal' && it.plan === 'trial' && it.mealId) {
					usedTrialMealIds.add(String(it.mealId));
				}
			}
		}
	}

	const quotedItems = [];
	let subtotal = 0;

	for (const item of normalizedItems) {
		const cartItemId = String(item.cartItemId || item.id || '').trim() || `cart-item-${Math.random().toString(36).slice(2)}`;
		const type = String(item.type);
		const plan = String(item.plan);
		const requestedQuantity = parsePositiveInt(item.quantity, 'quantity');
		// Subscriptions are priced as totals per period; quantity must not multiply by servings.
		const quantity = (plan === 'weekly' || plan === 'monthly') ? 1 : requestedQuantity;

		if (type === 'meal') {
			const mealId = String(item.mealId || '').trim();
			const meal = mealsById.get(mealId);
			if (!meal) {
				const err = new Error(`Invalid or unavailable mealId: ${mealId}`);
				err.statusCode = 400;
				throw err;
			}
			if (plan === 'trial' && !meal.isTrialEligible) {
				const err = new Error('Trial is not available for this meal');
				err.statusCode = 400;
				throw err;
			}
			if (plan === 'trial' && userId && usedTrialMealIds.has(mealId)) {
				const err = new Error('Trial already used for this meal');
				err.statusCode = 400;
				throw err;
			}

			const unitPrice = getMealUnitPrice({ meal, plan });
			if (!(unitPrice > 0)) {
				const err = new Error(`Meal not available for ${plan}`);
				err.statusCode = 400;
				throw err;
			}
			const lineTotal = unitPrice * quantity;
			subtotal += lineTotal;
			quotedItems.push({
				cartItemId,
				type,
				plan,
				mealId,
				quantity,
				title: meal.name,
				unitPrice,
				lineTotal,
			});
			continue;
		}

		if (type === 'addon') {
			const addonId = String(item.addonId || '').trim();
			const addon = addonsById.get(addonId);
			if (!addon) {
				const err = new Error(`Invalid or unavailable addonId: ${addonId}`);
				err.statusCode = 400;
				throw err;
			}

			let unitPrice = 0;
			if (plan === 'single') unitPrice = Number(addon.pricing?.single ?? 0);
			if (plan === 'weekly') unitPrice = Number(addon.pricing?.weekly ?? 0);
			if (plan === 'monthly') unitPrice = Number(addon.pricing?.monthly ?? 0);
			if (!(unitPrice > 0)) {
				const err = new Error(`Add-on not available for ${plan}`);
				err.statusCode = 400;
				throw err;
			}

			const lineTotal = unitPrice * quantity;
			subtotal += lineTotal;
			quotedItems.push({
				cartItemId,
				type,
				plan,
				addonId,
				quantity,
				title: addon.name,
				unitPrice,
				lineTotal,
			});
			continue;
		}

		if (type === 'byo') {
			const selections = Array.isArray(item.selections) ? item.selections : [];
			const quote = await computeByoQuote({ plan, selections });
			if (plan === 'weekly' || plan === 'monthly') {
				const minimumRequired =
					plan === 'weekly' ? Number(byoCfg.minimumWeeklyOrderAmount || 0) : Number(byoCfg.minimumMonthlyOrderAmount || 0);
				if (quote.total < minimumRequired) {
					const err = new Error(`Minimum ${plan} BYO order is ${minimumRequired}`);
					err.statusCode = 400;
					throw err;
				}
			}

			const unitPrice = quote.total;
			const lineTotal = unitPrice * quantity;
			subtotal += lineTotal;
			quotedItems.push({
				cartItemId,
				type,
				plan,
				quantity,
				title: 'Build Your Own',
				unitPrice,
				lineTotal,
				meta: {
					proteinGrams: quote.proteinGrams,
					calories: quote.calories,
					lineItems: quote.lineItems,
				},
			});
			continue;
		}
	}

	const deliveryFee = Number(delivery.deliveryFee || 0);
	let creditsApplied = Math.max(0, creditsRequested);
	creditsApplied = Math.min(creditsApplied, subtotal + deliveryFee);
	if (userId) {
		const user = await User.findById(userId).select({ walletBalance: 1 }).lean();
		const wallet = typeof user?.walletBalance === 'number' ? user.walletBalance : 0;
		creditsApplied = Math.min(creditsApplied, wallet);
	}
	const total = Math.max(0, subtotal + deliveryFee - creditsApplied);

	return {
		items: quotedItems,
		subtotal,
		deliveryFee,
		distanceKm: delivery.distanceKm,
		isServiceable: delivery.isServiceable,
		creditsApplied,
		total,
		deliveryLocation:
			latitude !== undefined && longitude !== undefined ? { latitude, longitude, address: addressText } : undefined,
	};
};

const quoteCart = async (req, res, next) => {
	try {
		const data = await quoteCartData({
			userId: req.user?.id,
			items: req.body?.items,
			creditsToApply: req.body?.creditsToApply,
			deliveryLocation: req.body?.deliveryLocation,
		});
		return res.json({ status: 'success', data });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
  quoteCart,
	quoteCartData,
};
