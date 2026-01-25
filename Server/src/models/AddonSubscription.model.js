const mongoose = require('mongoose');

const AddonSubscriptionSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		addonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Addon', required: true, index: true },
		frequency: { type: String, required: true, enum: ['weekly', 'monthly', 'trial'] },
		servings: { type: Number, required: true, min: 1 },
		price: { type: Number, required: true, min: 0 },
		startDate: { type: String, required: true },
		status: { type: String, required: true, enum: ['active', 'paused'], default: 'active' },
		pauseStartDate: { type: String, required: false, default: undefined }, // YYYY-MM-DD
		pauseEndDate: { type: String, required: false, default: undefined }, // YYYY-MM-DD
		pauseReason: { type: String, required: false, trim: true, default: undefined },
		pauseRequestId: { type: String, required: false, default: undefined },
	},
	{ timestamps: true }
);

AddonSubscriptionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AddonSubscription', AddonSubscriptionSchema);
