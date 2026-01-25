const CustomMealSubscription = require('../models/CustomMealSubscription.model');
const AddonSubscription = require('../models/AddonSubscription.model');

const FREQUENCIES = new Set(['weekly', 'monthly', 'trial']);
const STATUSES = new Set(['active', 'paused']);
const TYPES = new Set(['customMeal', 'addon', 'all']);

const normalize = (kind, doc) => {
	if (!doc) return doc;
	const obj = typeof doc.toObject === 'function' ? doc.toObject({ versionKey: false }) : doc;

	const base = {
		kind,
		id: String(obj._id),
		userId: String(obj.userId),
		frequency: obj.frequency,
		status: obj.status,
		startDate: obj.startDate,
		createdAt: obj.createdAt,
		updatedAt: obj.updatedAt,
	};

	if (kind === 'customMeal') {
		return {
			...base,
			selections: Array.isArray(obj.selections) ? obj.selections : [],
			totals: obj.totals,
		};
	}

	return {
		...base,
		addonId: obj.addonId != null ? String(obj.addonId) : undefined,
		servings: obj.servings,
		price: obj.price,
	};
};

const parseLimit = (raw) => {
	const n = Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) return 100;
	return Math.min(Math.max(n, 1), 200);
};

const parseOptional = (value) => {
	const v = String(value || '').trim();
	return v ? v : undefined;
};

const parseFrequency = (value) => {
	const v = parseOptional(value);
	if (!v || v === 'all') return undefined;
	if (!FREQUENCIES.has(v)) {
		const err = new Error('Invalid frequency');
		err.statusCode = 400;
		throw err;
	}
	return v;
};

const parseStatus = (value) => {
	const v = parseOptional(value);
	if (!v || v === 'all') return undefined;
	if (!STATUSES.has(v)) {
		const err = new Error('Invalid status');
		err.statusCode = 400;
		throw err;
	}
	return v;
};

const parseType = (value) => {
	const v = parseOptional(value) || 'all';
	if (!TYPES.has(v)) {
		const err = new Error('Invalid type');
		err.statusCode = 400;
		throw err;
	}
	return v;
};

const sortByCreatedDesc = (a, b) => {
	const ad = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
	const bd = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
	return bd - ad;
};

const localTodayISO = () => {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
};

const adminListSubscriptions = async (req, res, next) => {
	try {
		const today = localTodayISO();
		// Apply pause windows automatically (best-effort; keeps admin filters accurate).
		await Promise.all([
			CustomMealSubscription.updateMany(
				{ pauseStartDate: { $lte: today }, pauseEndDate: { $gte: today }, status: { $ne: 'paused' } },
				{ $set: { status: 'paused' } }
			),
			CustomMealSubscription.updateMany(
				{ pauseEndDate: { $lt: today }, status: 'paused' },
				{ $set: { status: 'active' }, $unset: { pauseStartDate: '', pauseEndDate: '', pauseReason: '', pauseRequestId: '' } }
			),
			AddonSubscription.updateMany(
				{ pauseStartDate: { $lte: today }, pauseEndDate: { $gte: today }, status: { $ne: 'paused' } },
				{ $set: { status: 'paused' } }
			),
			AddonSubscription.updateMany(
				{ pauseEndDate: { $lt: today }, status: 'paused' },
				{ $set: { status: 'active' }, $unset: { pauseStartDate: '', pauseEndDate: '', pauseReason: '', pauseRequestId: '' } }
			),
		]);

		const frequency = parseFrequency(req.query?.frequency);
		const status = parseStatus(req.query?.status);
		const type = parseType(req.query?.type);
		const limit = parseLimit(req.query?.limit);

		const baseFilter = {};
		if (frequency) baseFilter.frequency = frequency;
		if (status) baseFilter.status = status;
		if (type === 'customMeal') {
			const items = await CustomMealSubscription.find(baseFilter).sort({ createdAt: -1 }).limit(limit).lean();
			return res.json({ status: 'success', data: items.map((d) => normalize('customMeal', d)).sort(sortByCreatedDesc) });
		}
		if (type === 'addon') {
			const items = await AddonSubscription.find(baseFilter).sort({ createdAt: -1 }).limit(limit).lean();
			return res.json({ status: 'success', data: items.map((d) => normalize('addon', d)).sort(sortByCreatedDesc) });
		}

		const [customMeal, addon] = await Promise.all([
			CustomMealSubscription.find(baseFilter).sort({ createdAt: -1 }).limit(limit).lean(),
			AddonSubscription.find(baseFilter).sort({ createdAt: -1 }).limit(limit).lean(),
		]);

		const merged = [
			...customMeal.map((d) => normalize('customMeal', d)),
			...addon.map((d) => normalize('addon', d)),
		]
			.sort(sortByCreatedDesc)
			.slice(0, limit);

		return res.json({ status: 'success', data: merged });
	} catch (err) {
		return next(err);
	}
};

const adminSetSubscriptionStatus = async (req, res, next) => {
	try {
		const kind = String(req.params?.kind || '').trim();
		const { id } = req.params;
		const status = String(req.body?.status || '').trim();

		if (kind !== 'customMeal' && kind !== 'addon') {
			const err = new Error('Invalid kind');
			err.statusCode = 400;
			throw err;
		}
		if (!STATUSES.has(status)) {
			const err = new Error('Invalid status');
			err.statusCode = 400;
			throw err;
		}

		const Model = kind === 'customMeal' ? CustomMealSubscription : AddonSubscription;
		const updated = await Model.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Subscription not found' });
		}

		return res.json({ status: 'success', data: normalize(kind, updated) });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	adminListSubscriptions,
	adminSetSubscriptionStatus,
};
