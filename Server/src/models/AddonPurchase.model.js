const mongoose = require('mongoose');

const AddonPurchaseSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		addonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Addon', required: true, index: true },
		quantity: { type: Number, required: true, min: 1 },
		price: { type: Number, required: true, min: 0 },
		status: { type: String, required: true, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
	},
	{ timestamps: true }
);

AddonPurchaseSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AddonPurchase', AddonPurchaseSchema);
