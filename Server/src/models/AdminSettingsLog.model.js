const mongoose = require('mongoose');

const AdminSettingsLogSchema = new mongoose.Schema(
  {
    settingsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settings', required: true },
    action: { type: String, enum: ['create', 'update'], required: true },
    changedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changes: { type: Object, default: {} },
    before: { type: Object, default: {} },
    after: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSettingsLog', AdminSettingsLogSchema);
