const mongoose = require('mongoose');

const BuildYourOwnItemTypeSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		slug: { type: String, required: true, trim: true, lowercase: true },
		displayOrder: { type: Number, default: 0, index: true },
		isActive: { type: Boolean, default: true, index: true },
		deletedAt: { type: Date, required: false },
	},
	{ timestamps: true }
);

BuildYourOwnItemTypeSchema.index({ slug: 1 }, { unique: true });
BuildYourOwnItemTypeSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('BuildYourOwnItemType', BuildYourOwnItemTypeSchema);
