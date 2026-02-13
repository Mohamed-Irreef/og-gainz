const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    freeDeliveryRadius: { type: Number, required: true, min: 0, default: 0 },
    extraChargePerKm: { type: Number, required: true, min: 0, default: 0 },
    maxDeliveryRadius: { type: Number, required: true, min: 0, default: 0 },
    signupBonusCredits: { type: Number, required: true, min: 0, default: 0 },
    deliveryCutoffMinutes: { type: Number, required: true, min: 0, default: 0 },
    walletRefundPolicy: { type: String, required: true, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
