const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
	{
		url: { type: String, required: true },
		publicId: { type: String, required: true },
		alt: { type: String, required: false },
	},
	{ _id: false }
);

const PricingSchema = new mongoose.Schema(
	{
		single: { type: Number, required: true, min: 0 },
		weekly: { type: Number, required: true, min: 0 },
		monthly: { type: Number, required: true, min: 0 },
	},
	{ _id: false }
);

const ServingsSchema = new mongoose.Schema(
	{
		weekly: { type: Number, required: true, min: 1 },
		monthly: { type: Number, required: true, min: 1 },
	},
	{ _id: false }
);

const UNIT_ENUM = ['g', 'kg', 'ml', 'l', 'pcs'];

const BuildYourOwnItemSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		itemTypeId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'BuildYourOwnItemType',
			required: true,
			index: true,
		},
		quantityValue: { type: Number, required: true, min: 0 },
		quantityUnit: { type: String, required: true, enum: UNIT_ENUM },
		proteinGrams: { type: Number, required: false, min: 0 },
		calories: { type: Number, required: false, min: 0 },
		pricing: { type: PricingSchema, required: true },
		servings: { type: ServingsSchema, required: true },
		image: { type: ImageSchema, required: false },
		displayOrder: { type: Number, default: 0, index: true },
		isActive: { type: Boolean, default: true, index: true },
		deletedAt: { type: Date, required: false },
	},
	{ timestamps: true }
);

BuildYourOwnItemSchema.index({ itemTypeId: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('BuildYourOwnItem', BuildYourOwnItemSchema);
module.exports.UNIT_ENUM = UNIT_ENUM;
