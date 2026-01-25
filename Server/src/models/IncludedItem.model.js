const mongoose = require('mongoose');

const ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'pieces', 'pcs'];

const IncludedItemSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		slug: { type: String, required: true, trim: true, lowercase: true },
		unitType: { type: String, required: false, trim: true },
		defaultUnit: { type: String, required: true, enum: ALLOWED_UNITS, default: 'g' },
		displayOrder: { type: Number, default: 0, index: true },
		isActive: { type: Boolean, default: true, index: true },
		deletedAt: { type: Date, required: false },
	},
	{ timestamps: true }
);

IncludedItemSchema.index({ slug: 1 }, { unique: true });
IncludedItemSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = {
	IncludedItem: mongoose.model('IncludedItem', IncludedItemSchema),
	ALLOWED_UNITS,
};
