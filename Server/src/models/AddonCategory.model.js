const mongoose = require('mongoose');

const AddonCategorySchema = new mongoose.Schema(
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

AddonCategorySchema.index({ slug: 1 }, { unique: true });
AddonCategorySchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('AddonCategory', AddonCategorySchema);
