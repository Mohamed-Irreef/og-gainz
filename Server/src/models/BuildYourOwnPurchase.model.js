const mongoose = require('mongoose');

const SelectionSchema = new mongoose.Schema(
	{
		itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuildYourOwnItem', required: true },
		quantity: { type: Number, required: true, min: 1 },
	},
	{ _id: false }
);

const BuildYourOwnPurchaseSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		selections: { type: [SelectionSchema], required: true, default: [] },
		total: { type: Number, required: true, min: 0 },
		status: { type: String, required: true, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
	},
	{ timestamps: true }
);

BuildYourOwnPurchaseSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BuildYourOwnPurchase', BuildYourOwnPurchaseSchema);
