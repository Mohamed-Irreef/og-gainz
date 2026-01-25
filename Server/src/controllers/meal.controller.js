const MealPack = require('../models/MealPack.model');
const MealType = require('../models/MealType.model');
const { toSlug } = require('../utils/slug.util');
const { getPagination } = require('../utils/pagination.util');
const { uploadImage, deleteImage } = require('../config/cloudinary.config');

const MEAL_PUBLIC_PROJECTION = {
  name: 1,
  slug: 1,
  image: 1,
  images: 1,
  proteinPerMeal: 1,
	proteinPerMealWith: 1,
	proteinPerMealWithout: 1,
  totalQuantity: 1,
  totalQuantityUnit: 1,
  caloriesRange: 1,
  tags: 1,
  mealTypeId: 1,
  mealType: 1,
  shortDescription: 1,
  detailedDescription: 1,
  hasWithProteinOption: 1,
  hasWithoutProteinOption: 1,
  pricing: 1,
  proteinPricingMode: 1,
  proteinPricing: 1,
  includedItems: 1,
  includedItemAssignments: 1,
  isTrialEligible: 1,
  isFeatured: 1,
  trialBadgeText: 1,
  displayOrder: 1,
  createdAt: 1,
};

const MEAL_ADMIN_PROJECTION = {
  ...MEAL_PUBLIC_PROJECTION,
  isActive: 1,
  deletedAt: 1,
  updatedAt: 1,
};

const MEAL_POPULATE = [
  { path: 'mealTypeId', select: { name: 1, slug: 1, isActive: 1, displayOrder: 1 } },
  {
    path: 'includedItemAssignments.itemId',
    select: { name: 1, slug: 1, defaultUnit: 1, unitType: 1, displayOrder: 1, isActive: 1 },
  },
];

const normalizeMeal = (meal) => {
  if (!meal) return meal;
  const weekly = meal.pricing?.weekly;

  const images = Array.isArray(meal.images) ? meal.images.filter(Boolean) : [];
  const legacyImage = meal.image ? [meal.image] : [];
  const normalizedImages = images.length ? images : legacyImage;
  const primaryImage = normalizedImages[0] || meal.image;

  const normalizedAssignments = Array.isArray(meal.includedItemAssignments)
    ? meal.includedItemAssignments
        .filter(Boolean)
        .map((a) => {
          const rawItem = a.itemId;
          const populated = rawItem && typeof rawItem === 'object' && rawItem._id;
          const itemId = populated ? String(rawItem._id) : rawItem ? String(rawItem) : '';
          return {
            ...a,
            itemId,
            item: populated
              ? {
                id: String(rawItem._id),
                name: rawItem.name,
                slug: rawItem.slug,
                defaultUnit: rawItem.defaultUnit,
                unitType: rawItem.unitType,
                displayOrder: rawItem.displayOrder,
                isActive: rawItem.isActive,
              }
              : undefined,
          };
        })
    : undefined;

  const mealTypePopulated =
    meal.mealTypeId && typeof meal.mealTypeId === 'object' && meal.mealTypeId._id
      ? {
        id: String(meal.mealTypeId._id),
        name: meal.mealTypeId.name,
        slug: meal.mealTypeId.slug,
        isActive: meal.mealTypeId.isActive,
        displayOrder: meal.mealTypeId.displayOrder,
      }
      : undefined;

  const mealTypeIdString = mealTypePopulated?.id
    ? mealTypePopulated.id
    : meal.mealTypeId
      ? String(meal.mealTypeId)
      : undefined;

  return {
    ...meal,
    images: normalizedImages,
    image: primaryImage,
		mealTypeId: mealTypeIdString,
		mealTypeRef: mealTypePopulated,
    includedItemAssignments: normalizedAssignments,
    // Backward-compat aliases for older clients
    description: meal.shortDescription,
    price: weekly?.price,
    servings: weekly?.servings,
  };
};

const getMealImagesArray = (meal) => {
  if (!meal) return [];
  if (Array.isArray(meal.images) && meal.images.length) return meal.images;
  if (meal.image) return [meal.image];
  return [];
};

const listMeals = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

		const { mealType, isFeatured, trialEligible } = req.query;

    const filter = { isActive: true };
		if (mealType && String(mealType).trim()) {
			filter.mealType = String(mealType).trim().toLowerCase();
		}
		if (typeof isFeatured === 'string') {
			filter.isFeatured = isFeatured.toLowerCase() === 'true';
		}
		if (typeof trialEligible === 'string') {
			filter.isTrialEligible = trialEligible.toLowerCase() === 'true';
		}

    const [items, total] = await Promise.all([
      MealPack.find(filter)
        .select(MEAL_PUBLIC_PROJECTION)
			.populate(MEAL_POPULATE)
			.sort({ displayOrder: 1, isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MealPack.countDocuments(filter),
    ]);

    const normalizedItems = items.map(normalizeMeal);

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

const getMealBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const meal = await MealPack.findOne({ slug, isActive: true })
      .select(MEAL_PUBLIC_PROJECTION)
      .populate(MEAL_POPULATE)
      .lean();

    if (!meal) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }

    return res.json({ status: 'success', data: normalizeMeal(meal) });
  } catch (err) {
    return next(err);
  }
};

const adminListMeals = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
    const { q, isActive, mealType, isFeatured, isTrialEligible } = req.query;

    const filter = {};
    if (typeof isActive === 'string') {
      filter.isActive = isActive.toLowerCase() === 'true';
    }
		if (mealType && String(mealType).trim()) {
			filter.mealType = String(mealType).trim().toLowerCase();
		}
		if (typeof isFeatured === 'string') {
			filter.isFeatured = isFeatured.toLowerCase() === 'true';
		}
		if (typeof isTrialEligible === 'string') {
			filter.isTrialEligible = isTrialEligible.toLowerCase() === 'true';
		}
    if (q && String(q).trim()) {
      filter.$or = [
        { name: { $regex: String(q).trim(), $options: 'i' } },
        { slug: { $regex: String(q).trim(), $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      MealPack.find(filter)
        .select(MEAL_ADMIN_PROJECTION)
			.populate(MEAL_POPULATE)
			.sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MealPack.countDocuments(filter),
    ]);

    const normalizedItems = items.map(normalizeMeal);

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

const adminCreateMeal = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.slug && payload.name) {
      payload.slug = toSlug(payload.name);
    }

		// Backward-compat: allow older clients to send `description`.
		if (!payload.shortDescription && payload.description) {
			payload.shortDescription = payload.description;
		}

    if (payload.mealTypeId) {
      const mt = await MealType.findById(payload.mealTypeId).select({ slug: 1 }).lean();
      if (!mt) {
        return res.status(400).json({ status: 'error', message: 'Invalid mealTypeId' });
      }
      payload.mealType = String(mt.slug).trim().toLowerCase();
    } else if (payload.mealType) {
      payload.mealType = String(payload.mealType).trim().toLowerCase();
    }

    const created = await MealPack.create(payload);
		const obj = created.toObject({ versionKey: false });
    return res.status(201).json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

const adminUpdateMeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

		// Images are managed via dedicated upload endpoints; avoid accidental overwrite/wipe.
		delete payload.image;
		delete payload.images;

		// Backward-compat: allow older clients to send `description`.
		if (!payload.shortDescription && payload.description) {
			payload.shortDescription = payload.description;
		}

    if (payload.mealTypeId) {
      const mt = await MealType.findById(payload.mealTypeId).select({ slug: 1 }).lean();
      if (!mt) {
        return res.status(400).json({ status: 'error', message: 'Invalid mealTypeId' });
      }
      payload.mealType = String(mt.slug).trim().toLowerCase();
    } else if (payload.mealType) {
      payload.mealType = String(payload.mealType).trim().toLowerCase();
    }

    const updated = await MealPack.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }
		const obj = updated.toObject({ versionKey: false });

    return res.json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

const adminDeleteMeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meal = await MealPack.findById(id);

    if (!meal) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }

    // capture payload for response before deleting
    const obj = meal.toObject({ versionKey: false });

    // best-effort Cloudinary cleanup
    const images = getMealImagesArray(meal);
    const publicIds = Array.from(
      new Set(
        images
          .map((img) => img?.publicId)
          .filter((pid) => typeof pid === 'string' && pid.trim())
      )
    );

    await meal.deleteOne();

    await Promise.all(
      publicIds.map(async (publicId) => {
        try {
          await deleteImage(publicId);
        } catch {
          // ignore cleanup failures; DB delete already succeeded
        }
      })
    );

    return res.json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

const adminUploadMealImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meal = await MealPack.findById(id);
    if (!meal) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }

    const uploaded = await uploadImage(req.file, 'og-gainz/meals');
		const alt = req.body?.alt ? String(req.body.alt).trim() : undefined;
    const newImage = { url: uploaded.url, publicId: uploaded.publicId, ...(alt ? { alt } : {}) };

    const current = getMealImagesArray(meal);
    const oldPublicId = current[0]?.publicId;
    const nextImages = [...current];
    if (nextImages.length) nextImages[0] = newImage;
    else nextImages.push(newImage);

    meal.images = nextImages;
    meal.image = nextImages[0];
    await meal.save();
    await deleteImage(oldPublicId);
		const obj = meal.toObject({ versionKey: false });

    return res.json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

const adminAddMealImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meal = await MealPack.findById(id);
    if (!meal) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ status: 'error', message: 'At least one image file is required' });
    }

    const alt = req.body?.alt ? String(req.body.alt).trim() : undefined;
    const current = getMealImagesArray(meal);
    const uploaded = [];
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      const up = await uploadImage(file, 'og-gainz/meals');
      uploaded.push({ url: up.url, publicId: up.publicId, ...(alt ? { alt } : {}) });
    }

    const nextImages = [...current, ...uploaded];
    meal.images = nextImages;
    meal.image = nextImages[0];
    await meal.save();

    const obj = meal.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

const adminReplaceMealImageAtIndex = async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid image index' });
    }

    const meal = await MealPack.findById(id);
    if (!meal) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }

    const current = getMealImagesArray(meal);
    if (idx >= current.length) {
      return res.status(404).json({ status: 'error', message: 'Image not found at that index' });
    }

    const alt = req.body?.alt ? String(req.body.alt).trim() : undefined;
    const uploaded = await uploadImage(req.file, 'og-gainz/meals');
    const oldPublicId = current[idx]?.publicId;
    const nextImages = [...current];
    nextImages[idx] = { url: uploaded.url, publicId: uploaded.publicId, ...(alt ? { alt } : {}) };
    meal.images = nextImages;
    meal.image = nextImages[0];
    await meal.save();
    await deleteImage(oldPublicId);

    const obj = meal.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

const adminDeleteMealImageAtIndex = async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid image index' });
    }

    const meal = await MealPack.findById(id);
    if (!meal) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }

    const current = getMealImagesArray(meal);
    if (idx >= current.length) {
      return res.status(404).json({ status: 'error', message: 'Image not found at that index' });
    }

    const removed = current[idx];
    const nextImages = current.filter((_, i) => i !== idx);
    meal.images = nextImages.length ? nextImages : undefined;
    meal.image = nextImages[0];
    await meal.save();
    await deleteImage(removed?.publicId);

    const obj = meal.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

const adminMakeMealImagePrimary = async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid image index' });
    }

    const meal = await MealPack.findById(id);
    if (!meal) {
      return res.status(404).json({ status: 'error', message: 'Meal not found' });
    }

    const current = getMealImagesArray(meal);
    if (!current.length) {
      return res.status(404).json({ status: 'error', message: 'No images on this meal' });
    }
    if (idx >= current.length) {
      return res.status(404).json({ status: 'error', message: 'Image not found at that index' });
    }
    if (idx === 0) {
      const obj = meal.toObject({ versionKey: false });
      return res.json({ status: 'success', data: normalizeMeal(obj) });
    }

    const nextImages = [...current];
    const tmp = nextImages[0];
    nextImages[0] = nextImages[idx];
    nextImages[idx] = tmp;
    meal.images = nextImages;
    meal.image = nextImages[0];
    await meal.save();

    const obj = meal.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeMeal(obj) });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listMeals,
  getMealBySlug,
  adminListMeals,
  adminCreateMeal,
  adminUpdateMeal,
  adminDeleteMeal,
  adminUploadMealImage,
  adminAddMealImages,
  adminReplaceMealImageAtIndex,
  adminDeleteMealImageAtIndex,
  adminMakeMealImagePrimary,
};
