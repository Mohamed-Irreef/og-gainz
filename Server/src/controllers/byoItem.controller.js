const BuildYourOwnItem = require('../models/BuildYourOwnItem.model');
const BuildYourOwnItemType = require('../models/BuildYourOwnItemType.model');
const { uploadImage, deleteImage } = require('../config/cloudinary.config');
const { getPagination } = require('../utils/pagination.util');

const toNumberOrUndefined = (value) => {
	if (value === undefined || value === null || value === '') return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
};

const toBooleanOrUndefined = (value) => {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'boolean') return value;
	const s = String(value).toLowerCase().trim();
	if (s === 'true') return true;
	if (s === 'false') return false;
	return undefined;
};

const normalizeNestedGroup = (payload, groupKey) => {
	// Accept any of:
	// - payload[groupKey] as object
	// - payload[groupKey] as JSON string
	// - multipart keys: `${groupKey}[single]`, `${groupKey}.single` etc
	let group = payload[groupKey];

	if (typeof group === 'string') {
		try {
			group = JSON.parse(group);
		} catch {
			// ignore
		}
	}

	const bracketKeys = Object.keys(payload).filter((k) => k.startsWith(`${groupKey}[`) && k.endsWith(']'));
	const dotKeys = Object.keys(payload).filter((k) => k.startsWith(`${groupKey}.`));

	if ((!group || typeof group !== 'object') && (bracketKeys.length > 0 || dotKeys.length > 0)) {
		group = {};
	}

	for (const k of bracketKeys) {
		const inner = k.slice(groupKey.length + 1, -1);
		group[inner] = payload[k];
		delete payload[k];
	}

	for (const k of dotKeys) {
		const inner = k.slice(groupKey.length + 1);
		group[inner] = payload[k];
		delete payload[k];
	}

	if (group && typeof group === 'object') {
		payload[groupKey] = group;
	}
};

const normalizeByoItemPayload = (payload) => {
	const p = { ...payload };

	normalizeNestedGroup(p, 'pricing');
	normalizeNestedGroup(p, 'servings');

	if (p.pricing && typeof p.pricing === 'object') {
		p.pricing = {
			single: toNumberOrUndefined(p.pricing.single),
			weekly: toNumberOrUndefined(p.pricing.weekly),
			monthly: toNumberOrUndefined(p.pricing.monthly),
		};
	}

	if (p.servings && typeof p.servings === 'object') {
		p.servings = {
			weekly: toNumberOrUndefined(p.servings.weekly),
			monthly: toNumberOrUndefined(p.servings.monthly),
		};
	}

	p.quantityValue = toNumberOrUndefined(p.quantityValue);
	p.proteinGrams = toNumberOrUndefined(p.proteinGrams);
	p.calories = toNumberOrUndefined(p.calories);
	p.displayOrder = toNumberOrUndefined(p.displayOrder);

	const isActive = toBooleanOrUndefined(p.isActive);
	if (typeof isActive === 'boolean') p.isActive = isActive;

	return p;
};

const ITEM_ADMIN_PROJECTION = {
	name: 1,
	itemTypeId: 1,
	quantityValue: 1,
	quantityUnit: 1,
	proteinGrams: 1,
	calories: 1,
	pricing: 1,
	servings: 1,
	image: 1,
	displayOrder: 1,
	isActive: 1,
	deletedAt: 1,
	createdAt: 1,
	updatedAt: 1,
};

const assertActiveItemType = async (itemTypeId) => {
	if (!itemTypeId) {
		const err = new Error('itemTypeId is required');
		err.statusCode = 400;
		throw err;
	}
	const type = await BuildYourOwnItemType.findOne({ _id: itemTypeId }).lean();
	if (!type) {
		const err = new Error('Item type not found');
		err.statusCode = 404;
		throw err;
	}
	if (!type.isActive) {
		const err = new Error('Item type is inactive');
		err.statusCode = 400;
		throw err;
	}
	return type;
};

const adminListByoItems = async (req, res, next) => {
	try {
		const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
		const { q, isActive, itemTypeId } = req.query;

		const filter = {};
		if (typeof isActive === 'string') {
			filter.isActive = isActive.toLowerCase() === 'true';
		}
		if (itemTypeId && String(itemTypeId).trim()) {
			filter.itemTypeId = String(itemTypeId).trim();
		}
		if (q && String(q).trim()) {
			filter.$or = [
				{ name: { $regex: String(q).trim(), $options: 'i' } },
			];
		}

		const [items, total] = await Promise.all([
			BuildYourOwnItem.find(filter)
				.select(ITEM_ADMIN_PROJECTION)
				.populate({ path: 'itemTypeId', select: { name: 1, slug: 1, isActive: 1, displayOrder: 1 } })
				.sort({ displayOrder: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			BuildYourOwnItem.countDocuments(filter),
		]);

		return res.json({
			status: 'success',
			data: items.map((m) => ({
				...m,
				id: String(m._id),
				itemTypeRef: m.itemTypeId
					? {
						id: String(m.itemTypeId._id),
						name: m.itemTypeId.name,
						slug: m.itemTypeId.slug,
						isActive: m.itemTypeId.isActive,
						displayOrder: m.itemTypeId.displayOrder,
					}
					: null,
				itemTypeId: m.itemTypeId ? String(m.itemTypeId._id) : String(m.itemTypeId),
			})),
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

const adminCreateByoItem = async (req, res, next) => {
	try {
		const payload = normalizeByoItemPayload(req.body || {});
		await assertActiveItemType(payload.itemTypeId);

		if (!req.file) {
			const err = new Error('Image is required');
			err.statusCode = 400;
			throw err;
		}

		const uploaded = await uploadImage(req.file, 'og-gainz/build-your-own');
		payload.image = { url: uploaded.url, publicId: uploaded.publicId };

		const created = await BuildYourOwnItem.create(payload);
		const obj = created.toObject({ versionKey: false });
		return res.status(201).json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminUpdateByoItem = async (req, res, next) => {
	try {
		const { id } = req.params;
		const payload = { ...req.body };

		if (payload.itemTypeId) {
			await assertActiveItemType(payload.itemTypeId);
		}

		// Image is managed via the dedicated image endpoint.
		delete payload.image;

		const updated = await BuildYourOwnItem.findByIdAndUpdate(id, payload, {
			new: true,
			runValidators: true,
		});
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Build-your-own item not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminDeleteByoItem = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updated = await BuildYourOwnItem.findByIdAndUpdate(
			id,
			{ isActive: false, deletedAt: new Date() },
			{ new: true }
		);
		if (!updated) {
			return res.status(404).json({ status: 'error', message: 'Build-your-own item not found' });
		}
		const obj = updated.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

const adminUploadByoItemImage = async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!req.file) {
			const err = new Error('Image is required');
			err.statusCode = 400;
			throw err;
		}

		const item = await BuildYourOwnItem.findById(id);
		if (!item) {
			return res.status(404).json({ status: 'error', message: 'Build-your-own item not found' });
		}

		const prevPublicId = item.image?.publicId;
		const uploaded = await uploadImage(req.file, 'og-gainz/build-your-own');
		item.image = { url: uploaded.url, publicId: uploaded.publicId };
		await item.save();

		if (prevPublicId) {
			// best-effort cleanup
			await deleteImage(prevPublicId);
		}

		const obj = item.toObject({ versionKey: false });
		return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	adminListByoItems,
	adminCreateByoItem,
	adminUpdateByoItem,
	adminDeleteByoItem,
	adminUploadByoItemImage,
};
