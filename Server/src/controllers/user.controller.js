const User = require('../models/User.model');

const requireAuthUserId = (req) => {
  const userId = req?.user?.id;
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  return userId;
};

const normalizeUserForClient = (userDoc) => {
  if (!userDoc) return null;
  return {
    id: String(userDoc._id),
    email: userDoc.email,
    name: userDoc.name,
    role: userDoc.role,
    avatar: userDoc.avatar,
    provider: userDoc.provider,
    walletBalance: typeof userDoc.walletBalance === 'number' ? userDoc.walletBalance : 0,
    addresses: Array.isArray(userDoc.addresses)
      ? userDoc.addresses.map((a) => ({
        id: String(a._id),
        label: a.label,
        username: a.username,
        contactNumber: a.contactNumber,
        housePlotNo: a.housePlotNo,
        street: a.street,
        area: a.area,
        district: a.district,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        landmark: a.landmark,
        latitude: a.latitude,
        longitude: a.longitude,
			googleMapsLink: a.googleMapsLink,
        isDefault: Boolean(a.isDefault),
      }))
      : [],
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
};

const getMe = async (req, res, next) => {
  try {
    const userId = requireAuthUserId(req);
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    return res.json({ status: 'success', data: normalizeUserForClient(user) });
  } catch (err) {
    return next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const userId = requireAuthUserId(req);

    const patch = req.body && typeof req.body === 'object' ? req.body : {};
    const update = {};

    if (typeof patch.name === 'string') update.name = patch.name.trim();
    if (typeof patch.avatar === 'string') update.avatar = patch.avatar.trim();

    if (Array.isArray(patch.addresses)) {
      const incoming = patch.addresses
        .filter(Boolean)
        .map((a) => ({
          label: String(a.label || 'Home').trim(),
          username: a.username ? String(a.username).trim() : undefined,
          contactNumber: a.contactNumber ? String(a.contactNumber).trim() : undefined,
          housePlotNo: a.housePlotNo ? String(a.housePlotNo).trim() : undefined,
          street: a.street ? String(a.street).trim() : undefined,
          area: a.area ? String(a.area).trim() : undefined,
          district: a.district ? String(a.district).trim() : undefined,
          addressLine1: String(a.addressLine1 || '').trim(),
          addressLine2: a.addressLine2 ? String(a.addressLine2).trim() : undefined,
          city: String(a.city || 'Bangalore').trim(),
          state: String(a.state || 'Karnataka').trim(),
          pincode: String(a.pincode || '').trim(),
          landmark: a.landmark ? String(a.landmark).trim() : undefined,
          latitude: typeof a.latitude === 'number' ? a.latitude : undefined,
          longitude: typeof a.longitude === 'number' ? a.longitude : undefined,
				googleMapsLink: a.googleMapsLink ? String(a.googleMapsLink).trim() : undefined,
          isDefault: Boolean(a.isDefault),
        }))
        .filter((a) => a.addressLine1 && a.pincode);

      if (incoming.length) {
        const hasDefault = incoming.some((a) => a.isDefault);
        if (!hasDefault) incoming[0].isDefault = true;
        if (hasDefault) {
          let defaultAssigned = false;
          for (const a of incoming) {
            if (a.isDefault && !defaultAssigned) {
              defaultAssigned = true;
            } else {
              a.isDefault = false;
            }
          }
        }
      }

      update.addresses = incoming;
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    return res.json({ status: 'success', data: normalizeUserForClient(updated) });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getMe, updateMe };
