const mongoose = require('mongoose');

const BuildYourOwnConfigSchema = new mongoose.Schema(
	{
		minimumWeeklyOrderAmount: { type: Number, required: true, min: 0, default: 0 },
		minimumMonthlyOrderAmount: { type: Number, required: true, min: 0, default: 0 },
		maximumWeeklyOrderAmount: { type: Number, required: true, min: 0, default: 0 },
		maximumMonthlyOrderAmount: { type: Number, required: true, min: 0, default: 0 },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('BuildYourOwnConfig', BuildYourOwnConfigSchema);
