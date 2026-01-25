const Addon = require('../models/Addon.model');
const AddonCategory = require('../models/AddonCategory.model');
const { getPagination } = require('../utils/pagination.util');
const { uploadImage, deleteImage } = require('../config/cloudinary.config');

const ADDON_PUBLIC_PROJECTION = {
  name: 1,
  category: 1,
  categoryId: 1,
  description: 1,
  image: 1,
  images: 1,
  pricing: 1,
  servings: 1,
  proteinGrams: 1,
  servingSizeText: 1,
  displayOrder: 1,
  createdAt: 1,
};

const ADDON_ADMIN_PROJECTION = {
  ...ADDON_PUBLIC_PROJECTION,
  isActive: 1,
  deletedAt: 1,
  updatedAt: 1,
};

const ADDON_CATEGORY_POPULATE = {
  path: 'categoryId',
  select: { name: 1, slug: 1, isActive: 1, displayOrder: 1 },
};

const getAddonImagesArray = (addon) => {
  if (!addon) return [];
  if (Array.isArray(addon.images) && addon.images.length) return addon.images;
  return addon.image ? [addon.image] : [];
};

const normalizeAddon = (addon) => {
  if (!addon) return addon;
  const categoryPopulated =
    addon.categoryId && typeof addon.categoryId === 'object' && addon.categoryId._id
      ? {
        id: String(addon.categoryId._id),
        name: addon.categoryId.name,
        slug: addon.categoryId.slug,
        isActive: addon.categoryId.isActive,
        displayOrder: addon.categoryId.displayOrder,
      }
      : null;

  const categoryIdString = categoryPopulated?.id
    ? categoryPopulated.id
    : addon.categoryId
      ? String(addon.categoryId)
      : undefined;

  const images = getAddonImagesArray(addon);
  return {
    ...addon,
    categoryId: categoryIdString,
    categoryRef: categoryPopulated,
    images,
    image: images[0] || addon.image,
    // Backward-compat alias for older clients
    price: addon.pricing?.single,
  };
};

const applyCategoryIdToPayload = async (payload) => {
  if (!payload || !payload.categoryId) return payload;
  const cat = await AddonCategory.findById(payload.categoryId).select({ slug: 1 }).lean();
  if (!cat) return payload;
  return { ...payload, category: String(cat.slug).trim().toLowerCase() };
};

const listAddons = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
    const { category } = req.query;

    const filter = { isActive: true };
    if (category && String(category).trim()) {
      filter.category = String(category).trim();
    }

    const [items, total] = await Promise.all([
      Addon.find(filter)
        .select(ADDON_PUBLIC_PROJECTION)
			.populate(ADDON_CATEGORY_POPULATE)
			.sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Addon.countDocuments(filter),
    ]);

    const normalizedItems = items.map(normalizeAddon);

    return res.json({
      status: 'success',
      data: normalizedItems,
      meta: {
        page,
        limit,
        total,
        hasNextPage: skip + normalizedItems.length < total,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const adminListAddons = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
    const { q, category, isActive } = req.query;

    const filter = {};
    if (typeof isActive === 'string') {
      filter.isActive = isActive.toLowerCase() === 'true';
    }
    if (category && String(category).trim()) {
      filter.category = String(category).trim();
    }
    if (q && String(q).trim()) {
      filter.name = { $regex: String(q).trim(), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Addon.find(filter)
        .select(ADDON_ADMIN_PROJECTION)
			.populate(ADDON_CATEGORY_POPULATE)
			.sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Addon.countDocuments(filter),
    ]);

		const normalizedItems = items.map(normalizeAddon);

    return res.json({
      status: 'success',
			data: normalizedItems,
      meta: {
        page,
        limit,
        total,
			hasNextPage: skip + normalizedItems.length < total,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const adminCreateAddon = async (req, res, next) => {
  try {
		const payload = { ...req.body };
		// Backward-compat: allow older clients to send `price`.
		if (payload.price !== undefined && !payload.pricing) {
			payload.pricing = { single: payload.price };
		}
    const finalPayload = await applyCategoryIdToPayload(payload);
    const created = await Addon.create(finalPayload);
		const obj = created.toObject({ versionKey: false });
    const populated = await Addon.findById(obj._id)
      .select(ADDON_ADMIN_PROJECTION)
      .populate(ADDON_CATEGORY_POPULATE)
      .lean();
    return res.status(201).json({ status: 'success', data: normalizeAddon(populated || obj) });
  } catch (err) {
    return next(err);
  }
};

const adminUpdateAddon = async (req, res, next) => {
  try {
    const { id } = req.params;
		const payload = { ...req.body };
    // Images must be managed via dedicated endpoints.
    delete payload.image;
    delete payload.images;
		// Backward-compat: allow older clients to send `price`.
		if (payload.price !== undefined && !payload.pricing) {
			payload.pricing = { single: payload.price };
		}
    const finalPayload = await applyCategoryIdToPayload(payload);
    const updated = await Addon.findByIdAndUpdate(id, finalPayload, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Add-on not found' });
    }
    const obj = updated.toObject({ versionKey: false });
    const populated = await Addon.findById(obj._id)
      .select(ADDON_ADMIN_PROJECTION)
      .populate(ADDON_CATEGORY_POPULATE)
      .lean();
    return res.json({ status: 'success', data: normalizeAddon(populated || obj) });
  } catch (err) {
    return next(err);
  }
};

const adminDeleteAddon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hard = String(req.query?.hard || '').toLowerCase() === 'true';
    if (hard) {
      const addon = await Addon.findById(id);
      if (!addon) {
        return res.status(404).json({ status: 'error', message: 'Add-on not found' });
      }
      const images = getAddonImagesArray(addon);
      await Addon.deleteOne({ _id: id });

      // Best-effort Cloudinary cleanup (do not fail the request on cleanup issues).
      await Promise.all(
        images
          .map((img) => img?.publicId)
          .filter(Boolean)
          .map(async (publicId) => {
            try {
              await deleteImage(publicId);
            } catch {
              // ignore
            }
          })
      );

      return res.json({ status: 'success', data: addon.toObject({ versionKey: false }) });
    }

    const updated = await Addon.findByIdAndUpdate(
      id,
      { isActive: false, deletedAt: new Date() },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Add-on not found' });
    }
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return next(err);
  }
};

const adminUploadAddonImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addon = await Addon.findById(id);
    if (!addon) {
      return res.status(404).json({ status: 'error', message: 'Add-on not found' });
    }

    const uploaded = await uploadImage(req.file, 'og-gainz/addons');
    const alt = req.body?.alt ? String(req.body.alt).trim() : undefined;
    const newImage = { url: uploaded.url, publicId: uploaded.publicId, ...(alt ? { alt } : {}) };

    const current = getAddonImagesArray(addon);
    const oldPublicId = current[0]?.publicId;
    const nextImages = [...current];
    if (nextImages.length) nextImages[0] = newImage;
    else nextImages.push(newImage);

    addon.images = nextImages;
    addon.image = nextImages[0];
    await addon.save();
    await deleteImage(oldPublicId);
    const obj = addon.toObject({ versionKey: false });
    const populated = await Addon.findById(obj._id)
      .select(ADDON_ADMIN_PROJECTION)
      .populate(ADDON_CATEGORY_POPULATE)
      .lean();

    return res.json({ status: 'success', data: normalizeAddon(populated || obj) });
  } catch (err) {
    return next(err);
  }
};

const adminAddAddonImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addon = await Addon.findById(id);
    if (!addon) {
      return res.status(404).json({ status: 'error', message: 'Add-on not found' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ status: 'error', message: 'At least one image file is required' });
    }

    const alt = req.body?.alt ? String(req.body.alt).trim() : undefined;
    const current = getAddonImagesArray(addon);
    const uploaded = [];
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      const up = await uploadImage(file, 'og-gainz/addons');
      uploaded.push({ url: up.url, publicId: up.publicId, ...(alt ? { alt } : {}) });
    }

    const nextImages = [...current, ...uploaded];
    addon.images = nextImages;
    addon.image = nextImages[0];
    await addon.save();

    const obj = addon.toObject({ versionKey: false });
    const populated = await Addon.findById(obj._id)
      .select(ADDON_ADMIN_PROJECTION)
      .populate(ADDON_CATEGORY_POPULATE)
      .lean();
    return res.json({ status: 'success', data: normalizeAddon(populated || obj) });
  } catch (err) {
    return next(err);
  }
};

const adminReplaceAddonImageAtIndex = async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid image index' });
    }

    const addon = await Addon.findById(id);
    if (!addon) {
      return res.status(404).json({ status: 'error', message: 'Add-on not found' });
    }

    const current = getAddonImagesArray(addon);
    if (idx >= current.length) {
      return res.status(404).json({ status: 'error', message: 'Image not found at that index' });
    }

    const alt = req.body?.alt ? String(req.body.alt).trim() : undefined;
    const uploaded = await uploadImage(req.file, 'og-gainz/addons');
    const oldPublicId = current[idx]?.publicId;
    const nextImages = [...current];
    nextImages[idx] = { url: uploaded.url, publicId: uploaded.publicId, ...(alt ? { alt } : {}) };
    addon.images = nextImages;
    addon.image = nextImages[0];
    await addon.save();
    await deleteImage(oldPublicId);

    const obj = addon.toObject({ versionKey: false });
    const populated = await Addon.findById(obj._id)
      .select(ADDON_ADMIN_PROJECTION)
      .populate(ADDON_CATEGORY_POPULATE)
      .lean();
    return res.json({ status: 'success', data: normalizeAddon(populated || obj) });
  } catch (err) {
    return next(err);
  }
};

const adminDeleteAddonImageAtIndex = async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid image index' });
    }

    const addon = await Addon.findById(id);
    if (!addon) {
      return res.status(404).json({ status: 'error', message: 'Add-on not found' });
    }

    const current = getAddonImagesArray(addon);
    if (idx >= current.length) {
      return res.status(404).json({ status: 'error', message: 'Image not found at that index' });
    }

    const removed = current[idx];
    const nextImages = current.filter((_, i) => i !== idx);
    addon.images = nextImages.length ? nextImages : undefined;
    addon.image = nextImages[0];
    await addon.save();
    await deleteImage(removed?.publicId);

    const obj = addon.toObject({ versionKey: false });
    const populated = await Addon.findById(obj._id)
      .select(ADDON_ADMIN_PROJECTION)
      .populate(ADDON_CATEGORY_POPULATE)
      .lean();
    return res.json({ status: 'success', data: normalizeAddon(populated || obj) });
  } catch (err) {
    return next(err);
  }
};

const adminMakeAddonImagePrimary = async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid image index' });
    }

    const addon = await Addon.findById(id);
    if (!addon) {
      return res.status(404).json({ status: 'error', message: 'Add-on not found' });
    }

    const current = getAddonImagesArray(addon);
    if (!current.length) {
      return res.status(404).json({ status: 'error', message: 'No images on this add-on' });
    }
    if (idx >= current.length) {
      return res.status(404).json({ status: 'error', message: 'Image not found at that index' });
    }
    if (idx === 0) {
      const obj = addon.toObject({ versionKey: false });
      const populated = await Addon.findById(obj._id)
        .select(ADDON_ADMIN_PROJECTION)
        .populate(ADDON_CATEGORY_POPULATE)
        .lean();
      return res.json({ status: 'success', data: normalizeAddon(populated || obj) });
    }

    const nextImages = [...current];
    const tmp = nextImages[0];
    nextImages[0] = nextImages[idx];
    nextImages[idx] = tmp;
    addon.images = nextImages;
    addon.image = nextImages[0];
    await addon.save();

    const obj = addon.toObject({ versionKey: false });
    const populated = await Addon.findById(obj._id)
      .select(ADDON_ADMIN_PROJECTION)
      .populate(ADDON_CATEGORY_POPULATE)
      .lean();
    return res.json({ status: 'success', data: normalizeAddon(populated || obj) });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listAddons,
  adminListAddons,
  adminCreateAddon,
  adminUpdateAddon,
  adminDeleteAddon,
  adminUploadAddonImage,
	adminAddAddonImages,
	adminReplaceAddonImageAtIndex,
	adminDeleteAddonImageAtIndex,
	adminMakeAddonImagePrimary,
};
