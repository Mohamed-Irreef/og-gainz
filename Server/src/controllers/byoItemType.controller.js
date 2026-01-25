const BuildYourOwnItemType = require('../models/BuildYourOwnItemType.model');
const { toSlug } = require('../utils/slug.util');
const { getPagination } = require('../utils/pagination.util');

const ITEMTYPE_ADMIN_PROJECTION = {
	name: 1,
	slug: 1,
	displayOrder: 1,
	isActive: 1,
	deletedAt: 1,
	createdAt: 1,
	updatedAt: 1,
};

const adminListByoItemTypes = async (req, res, next) => {
	try {
		const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
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
			BuildYourOwnItemType.find(filter)
				.select(ITEMTYPE_ADMIN_PROJECTION)
				.sort({ displayOrder: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			BuildYourOwnItemType.countDocuments(filter),
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

const adminCreateByoItemType = async (req, res, next) => {
	try {
		const payload = { ...req.body };
		if (!payload.slug && payload.name) {
			payload.slug = toSlug(payload.name);
		}
		const created = await BuildYourOwnItemType.create(payload);
		const obj = created.toObject({ versionKey: false });
		return res.status(201).json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminUpdateByoItemType = async (req, res, next) => {
	try {
		const { id } = req.params;
		const payload = { ...req.body };
		if (payload.slug) payload.slug = String(payload.slug).trim().toLowerCase();
		const updated = await BuildYourOwnItemType.findByIdAndUpdate(id, payload, {
			new: true,
			runValidators: true,
		});
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Build-your-own item type not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminDeleteByoItemType = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updated = await BuildYourOwnItemType.findByIdAndUpdate(
			id,
			{ isActive: false, deletedAt: new Date() },
			{ new: true }
		);
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Build-your-own item type not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	adminListByoItemTypes,
	adminCreateByoItemType,
	adminUpdateByoItemType,
	adminDeleteByoItemType,
};
