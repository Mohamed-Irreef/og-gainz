const mongoose = require('mongoose');

const FOOD_PREFERENCES = ['VEG', 'NON_VEG', 'EGGETARIAN'];

const ConsultationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: undefined, index: true },

    fullName: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    fitnessGoal: { type: String, required: true, trim: true },
    workRoutine: { type: String, required: true, trim: true },
    foodPreference: { type: String, required: true, enum: FOOD_PREFERENCES, index: true },
    notes: { type: String, required: false, trim: true, default: undefined },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, required: false, default: undefined },
    readBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: undefined, index: true },

    // Soft-delete / archive
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, required: false, default: undefined },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: undefined, index: true },
  },
  { timestamps: true }
);

ConsultationSchema.index({ createdAt: -1 });
ConsultationSchema.index({ isRead: 1, createdAt: -1 });
ConsultationSchema.index({ isArchived: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Consultation', ConsultationSchema);
