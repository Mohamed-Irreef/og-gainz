const AddonCategory = require('../models/AddonCategory.model');
const { toSlug } = require('../utils/slug.util');
const { getPagination } = require('../utils/pagination.util');

const ADDON_CATEGORY_ADMIN_PROJECTION = {
	name: 1,
	slug: 1,
	description: 1,
	displayOrder: 1,
	isActive: 1,
	deletedAt: 1,
	createdAt: 1,
	updatedAt: 1,
};

const adminListAddonCategories = async (req, res, next) => {
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
			AddonCategory.find(filter)
				.select(ADDON_CATEGORY_ADMIN_PROJECTION)
				.sort({ displayOrder: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			AddonCategory.countDocuments(filter),
		]);

		return res.json({
			status: 'success',
			data: items.map((c) => ({ ...c, id: String(c._id) })),
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

const adminCreateAddonCategory = async (req, res, next) => {
	try {
		const payload = { ...req.body };
		if (!payload.slug && payload.name) {
			payload.slug = toSlug(payload.name);
		}
		if (payload.slug) payload.slug = String(payload.slug).trim().toLowerCase();
		const created = await AddonCategory.create(payload);
		const obj = created.toObject({ versionKey: false });
		return res.status(201).json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminUpdateAddonCategory = async (req, res, next) => {
	try {
		const { id } = req.params;
		const payload = { ...req.body };
		if (payload.slug) payload.slug = String(payload.slug).trim().toLowerCase();
		const updated = await AddonCategory.findByIdAndUpdate(id, payload, {
			new: true,
			runValidators: true,
		});
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Add-on category not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminDeleteAddonCategory = async (req, res, next) => {
	try {
		const { id } = req.params;

		const hard = String(req.query?.hard || '').toLowerCase() === 'true';
		if (hard) {
			const deleted = await AddonCategory.findByIdAndDelete(id);
			if (!deleted) {
				return res.status(404).json({ status: 'error', message: 'Add-on category not found' });
			}
			const obj = deleted.toObject({ versionKey: false });
			return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
		}

		const updated = await AddonCategory.findByIdAndUpdate(
			id,
			{ isActive: false, deletedAt: new Date() },
			{ new: true }
		);
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Add-on category not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	adminListAddonCategories,
	adminCreateAddonCategory,
	adminUpdateAddonCategory,
	adminDeleteAddonCategory,
};
