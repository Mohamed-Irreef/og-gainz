const { IncludedItem, ALLOWED_UNITS } = require('../models/IncludedItem.model');
const { toSlug } = require('../utils/slug.util');
const { getPagination } = require('../utils/pagination.util');

const INCLUDEDITEM_ADMIN_PROJECTION = {
	name: 1,
	slug: 1,
	unitType: 1,
	defaultUnit: 1,
	displayOrder: 1,
	isActive: 1,
	deletedAt: 1,
	createdAt: 1,
	updatedAt: 1,
};

const adminListIncludedItems = async (req, res, next) => {
	try {
		const { page, limit, skip } = getPagination(req.query, { defaultLimit: 100 });
		const { q, isActive } = req.query;

		const filter = {};
		if (typeof isActive === 'string') {
			filter.isActive = isActive.toLowerCase() === 'true';
		}
		if (q && String(q).trim()) {
			filter.$or = [
				{ name: { $regex: String(q).trim(), $options: 'i' } },
				{ slug: { $regex: String(q).trim(), $options: 'i' } },
			];
		}

		const [items, total] = await Promise.all([
			IncludedItem.find(filter)
				.select(INCLUDEDITEM_ADMIN_PROJECTION)
				.sort({ displayOrder: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			IncludedItem.countDocuments(filter),
		]);

		return res.json({
			status: 'success',
			data: items.map((m) => ({ ...m, id: String(m._id) })),
			meta: {
				page,
				limit,
				total,
				hasNextPage: skip + items.length < total,
			},
		});
	} catch (err) {
		return next(err);
	}
};

const adminCreateIncludedItem = async (req, res, next) => {
	try {
		const payload = { ...req.body };
		if (!payload.slug && payload.name) {
			payload.slug = toSlug(payload.name);
		}
		if (payload.defaultUnit) payload.defaultUnit = String(payload.defaultUnit).trim().toLowerCase();
		if (payload.defaultUnit && !ALLOWED_UNITS.includes(payload.defaultUnit)) {
			const err = new Error('Invalid defaultUnit');
			err.statusCode = 400;
			throw err;
		}
		const created = await IncludedItem.create(payload);
		const obj = created.toObject({ versionKey: false });
		return res.status(201).json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminUpdateIncludedItem = async (req, res, next) => {
	try {
		const { id } = req.params;
		const payload = { ...req.body };
		if (payload.slug) payload.slug = String(payload.slug).trim().toLowerCase();
		if (payload.defaultUnit) payload.defaultUnit = String(payload.defaultUnit).trim().toLowerCase();
		if (payload.defaultUnit && !ALLOWED_UNITS.includes(payload.defaultUnit)) {
			const err = new Error('Invalid defaultUnit');
			err.statusCode = 400;
			throw err;
		}
		const updated = await IncludedItem.findByIdAndUpdate(id, payload, {
			new: true,
			runValidators: true,
		});
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Included item not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminDeleteIncludedItem = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updated = await IncludedItem.findByIdAndUpdate(
			id,
			{ isActive: false, deletedAt: new Date() },
			{ new: true }
		);
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Included item not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	ALLOWED_UNITS,
	adminListIncludedItems,
	adminCreateIncludedItem,
	adminUpdateIncludedItem,
	adminDeleteIncludedItem,
};
