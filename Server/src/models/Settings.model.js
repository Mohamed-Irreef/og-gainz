const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    freeDeliveryRadius: { type: Number, required: true, min: 0, default: 0 },
    extraChargePerKm: { type: Number, required: true, min: 0, default: 0 },
    maxDeliveryRadius: { type: Number, required: true, min: 0, default: 0 },
    signupBonusCredits: { type: Number, required: true, min: 0, default: 0 },
    deliveryCutoffMinutes: { type: Number, required: true, min: 0, default: 0 },
    maxOrdersPerShift: {
      MORNING: { type: Number, required: false, min: 0, default: undefined },
      AFTERNOON: { type: Number, required: false, min: 0, default: undefined },
      EVENING: { type: Number, required: false, min: 0, default: undefined },
    },
    walletRefundPolicy: { type: String, required: true, trim: true, default: 'Pending update' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
