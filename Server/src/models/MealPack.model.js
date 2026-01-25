const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, required: false, trim: true },
  },
  { _id: false }
);

const PricingTierSchema = new mongoose.Schema(
  {
    price: { type: Number, required: true, min: 0 },
    servings: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const PricingSchema = new mongoose.Schema(
  {
    monthly: { type: PricingTierSchema, required: true, default: () => ({ price: 0, servings: 20 }) },
    weekly: { type: PricingTierSchema, required: true, default: () => ({ price: 0, servings: 5 }) },
    trial: { type: PricingTierSchema, required: false, default: undefined },
  },
  { _id: false }
);

const IncludedItemsSchema = new mongoose.Schema(
  {
    rice: { type: Boolean, default: false },
    chapati: { type: Boolean, default: false },
    sweetPotato: { type: Boolean, default: false },
    egg: { type: Boolean, default: false },
    veggies: { type: Boolean, default: false },
    chicken: { type: Boolean, default: false },
    paneer: { type: Boolean, default: false },
    yogurt: { type: Boolean, default: false },
    proteinCurd: { type: Boolean, default: false },
    fruitSalad: { type: Boolean, default: false },
    boiledLegumesSprouts: { type: Boolean, default: false },
    nutsDryFruits: { type: Boolean, default: false },
  },
  { _id: false }
);

const PROTEIN_PRICING_MODES = ['default', 'with-only', 'without-only', 'both'];
const INCLUDED_ITEM_VISIBILITY = ['both', 'with-protein', 'without-protein'];
const INCLUDED_ITEM_UNITS = ['g', 'kg', 'ml', 'l', 'pieces', 'pcs'];

const IncludedItemAssignmentSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncludedItem', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: INCLUDED_ITEM_UNITS },
    visibility: { type: String, required: true, enum: INCLUDED_ITEM_VISIBILITY, default: 'both' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const MealPackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    shortDescription: { type: String, required: true, trim: true },
    detailedDescription: { type: String, required: false, trim: true },
    image: { type: ImageSchema, required: false },
    images: { type: [ImageSchema], required: false, default: undefined },
    proteinPerMeal: { type: Number, required: true, min: 0 },
    // Optional: total quantity of the meal pack
    totalQuantity: { type: Number, required: false, min: 0, default: undefined },
    totalQuantityUnit: { type: String, required: false, enum: INCLUDED_ITEM_UNITS, default: undefined },
    // Phase 4 extension: allow different protein grams for with/without options.
    // Backward compat: if not set, clients should fall back to proteinPerMeal.
    proteinPerMealWith: { type: Number, required: false, min: 0, default: undefined },
    proteinPerMealWithout: { type: Number, required: false, min: 0, default: undefined },
    caloriesRange: { type: String, required: false, trim: true },
    // Phase 3/4: backend-managed meal types. Keep `mealType` string for backward compatibility.
    mealTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealType', required: false, index: true },
    mealType: { type: String, required: true, trim: true, lowercase: true, index: true },
    hasWithProteinOption: { type: Boolean, default: false },
    hasWithoutProteinOption: { type: Boolean, default: false },
    tags: { type: [String], required: false, default: undefined },
    // Default pricing (used when proteinPricingMode is 'default')
    pricing: { type: PricingSchema, required: true, default: () => ({}) },

    // Phase 4: protein-mode pricing (optional)
    proteinPricingMode: { type: String, required: false, enum: PROTEIN_PRICING_MODES, default: 'default' },
    proteinPricing: {
		withProtein: { type: PricingSchema, required: false, default: undefined },
		withoutProtein: { type: PricingSchema, required: false, default: undefined },
	},

    includedItems: { type: IncludedItemsSchema, required: false, default: () => ({}) },

    // Phase 4: dynamic included items (optional)
    includedItemAssignments: { type: [IncludedItemAssignmentSchema], required: false, default: undefined },
    isTrialEligible: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    trialBadgeText: { type: String, required: false, trim: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

MealPackSchema.index({ slug: 1 }, { unique: true });
MealPackSchema.index({ isActive: 1, displayOrder: 1 });
MealPackSchema.index({ mealType: 1, isActive: 1, displayOrder: 1 });
MealPackSchema.index({ isFeatured: 1, isActive: 1, displayOrder: 1 });
MealPackSchema.index({ isTrialEligible: 1, isActive: 1, displayOrder: 1 });

MealPackSchema.pre('validate', function ensureTrialPricing() {
  if (!this.isTrialEligible) return;

  const mode = this.proteinPricingMode || 'default';

  const validateTrial = (pricing, pathPrefix) => {
    if (!pricing || !pricing.trial) {
      this.invalidate(`${pathPrefix}.trial`, 'Trial pricing is required when trial is enabled');
      return;
    }

    // Trial always 1 serving
    pricing.trial.servings = 1;

    if (!(pricing.trial.price > 0)) {
      this.invalidate(`${pathPrefix}.trial.price`, 'Trial price must be greater than 0');
    }

    if (pricing.weekly && pricing.trial.price > pricing.weekly.price) {
      this.invalidate(
        `${pathPrefix}.trial.price`,
        'Trial price must be less than or equal to weekly price'
      );
    }
  };

  if (mode === 'default') {
    validateTrial(this.pricing, 'pricing');
    return;
  }

  if (mode === 'with-only') {
    validateTrial(this.proteinPricing?.withProtein, 'proteinPricing.withProtein');
    return;
  }

  if (mode === 'without-only') {
    validateTrial(this.proteinPricing?.withoutProtein, 'proteinPricing.withoutProtein');
    return;
  }

  if (mode === 'both') {
    validateTrial(this.proteinPricing?.withProtein, 'proteinPricing.withProtein');
    validateTrial(this.proteinPricing?.withoutProtein, 'proteinPricing.withoutProtein');
    return;
  }
});

MealPackSchema.pre('validate', function ensureProteinPricingModeConsistency() {
  const mode = this.proteinPricingMode || 'default';

  const hasWith = Boolean(this.hasWithProteinOption);
  const hasWithout = Boolean(this.hasWithoutProteinOption);

  if (mode === 'default') {
    return;
  }

  if (mode === 'with-only') {
    if (!hasWith) this.invalidate('hasWithProteinOption', 'With-protein option must be enabled for with-only pricing mode');
    if (hasWithout) this.invalidate('hasWithoutProteinOption', 'Without-protein option must be disabled for with-only pricing mode');
    if (!this.proteinPricing?.withProtein) this.invalidate('proteinPricing.withProtein', 'withProtein pricing is required for with-only mode');
    return;
  }

  if (mode === 'without-only') {
    if (!hasWithout) this.invalidate('hasWithoutProteinOption', 'Without-protein option must be enabled for without-only pricing mode');
    if (hasWith) this.invalidate('hasWithProteinOption', 'With-protein option must be disabled for without-only pricing mode');
    if (!this.proteinPricing?.withoutProtein) this.invalidate('proteinPricing.withoutProtein', 'withoutProtein pricing is required for without-only mode');
    return;
  }

  if (mode === 'both') {
    if (!hasWith) this.invalidate('hasWithProteinOption', 'With-protein option must be enabled for both mode');
    if (!hasWithout) this.invalidate('hasWithoutProteinOption', 'Without-protein option must be enabled for both mode');
    if (!this.proteinPricing?.withProtein) this.invalidate('proteinPricing.withProtein', 'withProtein pricing is required for both mode');
    if (!this.proteinPricing?.withoutProtein) this.invalidate('proteinPricing.withoutProtein', 'withoutProtein pricing is required for both mode');
    return;
  }
});

MealPackSchema.pre('validate', function ensureIncludedItemAssignmentsValid() {
  if (!Array.isArray(this.includedItemAssignments) || !this.includedItemAssignments.length) return;

  const seen = new Set();
  for (const a of this.includedItemAssignments) {
    if (!a) continue;
    const key = a.itemId ? String(a.itemId) : '';
    if (!key) {
      this.invalidate('includedItemAssignments.itemId', 'included item assignment requires itemId');
      continue;
    }
    if (seen.has(key)) {
      this.invalidate('includedItemAssignments', `Duplicate included item assignment for itemId: ${key}`);
      continue;
    }
    seen.add(key);

    if (a.isActive !== false && !(a.quantity > 0)) {
      this.invalidate('includedItemAssignments.quantity', 'Included item quantity must be greater than 0');
    }
  }
});

module.exports = mongoose.model('MealPack', MealPackSchema);
