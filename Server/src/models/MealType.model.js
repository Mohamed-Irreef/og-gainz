const mongoose = require('mongoose');

const MealTypeSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		slug: { type: String, required: true, trim: true, lowercase: true },
		description: { type: String, required: false, trim: true },
		displayOrder: { type: Number, default: 0, index: true },
		isActive: { type: Boolean, default: true, index: true },
		deletedAt: { type: Date, required: false },
	},
	{ timestamps: true }
);

MealTypeSchema.index({ slug: 1 }, { unique: true });
MealTypeSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('MealType', MealTypeSchema);
