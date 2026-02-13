const Settings = require('../models/Settings.model');
const AdminSettingsLog = require('../models/AdminSettingsLog.model');

const getSingleton = async () => {
  let doc = await Settings.findOne({}).lean();
  if (!doc) {
    doc = await Settings.create({});
    doc = doc.toObject({ versionKey: false });
  }
  return doc;
};

const buildPayload = (body) => {
  const payload = {};
  const fields = [
    'freeDeliveryRadius',
    'extraChargePerKm',
    'maxDeliveryRadius',
    'signupBonusCredits',
    'deliveryCutoffMinutes',
    'walletRefundPolicy',
  ];

  for (const key of fields) {
    if (body && Object.prototype.hasOwnProperty.call(body, key)) {
      payload[key] = body[key];
    }
  }

  return payload;
};

const getAdminSettings = async (req, res, next) => {
  try {
    const doc = await getSingleton();
    return res.json({ status: 'success', data: { ...doc, id: String(doc._id) } });
  } catch (err) {
    return next(err);
  }
};

const updateAdminSettings = async (req, res, next) => {
  try {
    const existing = await Settings.findOne({});
    const payload = buildPayload(req.body || {});

    const before = existing ? existing.toObject({ versionKey: false }) : null;

    const updated = existing
      ? await Settings.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true })
      : await Settings.create(payload);

    const obj = updated.toObject({ versionKey: false });
    const after = obj;

    const changes = {};
    const keys = Object.keys(payload);
    for (const key of keys) {
      const prev = before ? before[key] : undefined;
      const nextValue = after[key];
      if (prev !== nextValue) {
        changes[key] = { before: prev, after: nextValue };
      }
    }

    if (Object.keys(changes).length > 0) {
      await AdminSettingsLog.create({
        settingsId: updated._id,
        action: existing ? 'update' : 'create',
        changedByUserId: req.user?.id || undefined,
        changes,
        before: before || {},
        after,
      });
    }

    return res.json({ status: 'success', data: { ...obj, id: String(obj._id) } });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAdminSettings,
  updateAdminSettings,
};
