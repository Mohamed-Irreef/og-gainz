const mongoose = require('mongoose');

const USER_ROLES = ['user', 'admin'];
const AUTH_PROVIDERS = ['email', 'google'];

const AddressSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, default: 'Home' },
    // Phase 4 address spec fields
    // Phase 7D: recipient/contact fields (additive)
    username: { type: String, required: false, trim: true },
    contactNumber: { type: String, required: false, trim: true },
    housePlotNo: { type: String, required: false, trim: true },
    street: { type: String, required: false, trim: true },
    area: { type: String, required: false, trim: true },
    district: { type: String, required: false, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, required: false, trim: true },
    city: { type: String, required: true, trim: true, default: 'Bangalore' },
    state: { type: String, required: true, trim: true, default: 'Karnataka' },
    pincode: { type: String, required: true, trim: true },
    landmark: { type: String, required: false, trim: true },
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
		googleMapsLink: { type: String, required: false, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    // Phase 1 baseline fields (extend safely in Phase 2+)
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: AUTH_PROVIDERS,
      default: 'email',
      index: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    googleId: {
      type: String,
      index: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'user',
      index: true,
    },

		// Phase 4: address + wallet snapshot for checkout.
		addresses: { type: [AddressSchema], default: () => [] },
		walletBalance: { type: Number, default: 0, min: 0 },

    // Admin: soft-block user (non-destructive)
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date, required: false, default: undefined },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: undefined, index: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
