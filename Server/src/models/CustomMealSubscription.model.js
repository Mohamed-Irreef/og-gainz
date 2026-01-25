const mongoose = require('mongoose');

const SelectionSchema = new mongoose.Schema(
	{
		componentId: { type: String, required: true, trim: true },
		quantity: { type: Number, required: true, min: 0 },
	},
	{ _id: false }
);

const TotalsSchema = new mongoose.Schema(
	{
		proteinGrams: { type: Number, required: true, min: 0 },
		calories: { type: Number, required: false, min: 0 },
		pricePerServing: { type: Number, required: true, min: 0 },
		weeklyPrice: { type: Number, required: true, min: 0 },
		monthlyPrice: { type: Number, required: true, min: 0 },
	},
	{ _id: false }
);

const CustomMealSubscriptionSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		frequency: { type: String, required: true, enum: ['weekly', 'monthly', 'trial'] },
		startDate: { type: String, required: true },
		selections: { type: [SelectionSchema], required: true, default: [] },
		totals: { type: TotalsSchema, required: true },
		status: { type: String, required: true, enum: ['active', 'paused'], default: 'active' },
		pauseStartDate: { type: String, required: false, default: undefined }, // YYYY-MM-DD
		pauseEndDate: { type: String, required: false, default: undefined }, // YYYY-MM-DD
		pauseReason: { type: String, required: false, trim: true, default: undefined },
		pauseRequestId: { type: String, required: false, default: undefined },
	},
	{ timestamps: true }
);

CustomMealSubscriptionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CustomMealSubscription', CustomMealSubscriptionSchema);
