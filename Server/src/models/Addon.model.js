const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, required: false, trim: true },
  },
  { _id: false }
);

const PricingSchema = new mongoose.Schema(
	{
		single: { type: Number, required: true, min: 0 },
    weekly: { type: Number, required: false, min: 0 },
    monthly: { type: Number, required: false, min: 0 },
	},
	{ _id: false }
);

const ServingsSchema = new mongoose.Schema(
  {
    weekly: { type: Number, required: true, min: 1, default: 5 },
    monthly: { type: Number, required: true, min: 1, default: 20 },
  },
  { _id: false }
);

const AddonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Backend-driven category slug (kept as string for filtering/back-compat)
    category: { type: String, required: true, trim: true, lowercase: true },
    // Optional reference to a managed category entity
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AddonCategory', required: false },
    description: { type: String, required: false, trim: true },
    image: { type: ImageSchema, required: false },
    images: { type: [ImageSchema], required: false },
    proteinGrams: { type: Number, required: false, min: 0 },
    servingSizeText: { type: String, required: false, trim: true },
    pricing: { type: PricingSchema, required: true, default: () => ({ single: 0 }) },
    servings: { type: ServingsSchema, required: true, default: () => ({ weekly: 5, monthly: 20 }) },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    deletedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

AddonSchema.index({ category: 1, isActive: 1, displayOrder: 1 });
AddonSchema.index({ isActive: 1, displayOrder: 1 });
AddonSchema.index({ displayOrder: 1 });

module.exports = mongoose.model('Addon', AddonSchema);
