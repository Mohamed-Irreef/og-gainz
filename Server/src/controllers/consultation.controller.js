const mongoose = require('mongoose');

const Consultation = require('../models/Consultation.model');

const safeString = (v) => String(v || '').trim();

const normalizeWhatsappNumber = (value) => {
  const raw = safeString(value);
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Accept common inputs like +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

const submitConsultation = async (req, res, next) => {
  try {
    const userId = safeString(req.user?.id);
    if (!userId) return res.status(401).json({ status: 'error', message: 'Authentication required' });

    const fullName = safeString(req.body?.fullName);
    const whatsappNumberRaw = normalizeWhatsappNumber(req.body?.whatsappNumber);
    const fitnessGoal = safeString(req.body?.fitnessGoal);
    const workRoutine = safeString(req.body?.workRoutine);
    const foodPreference = safeString(req.body?.foodPreference);
    const notes = safeString(req.body?.notes) || undefined;

    if (!fullName) return res.status(400).json({ status: 'error', message: 'fullName is required' });
    if (!whatsappNumberRaw) return res.status(400).json({ status: 'error', message: 'whatsappNumber is required' });
    if (!/^\d{10}$/.test(whatsappNumberRaw)) {
      return res.status(400).json({ status: 'error', message: 'whatsappNumber must be 10 digits' });
    }
    if (!fitnessGoal) return res.status(400).json({ status: 'error', message: 'fitnessGoal is required' });
    if (!workRoutine) return res.status(400).json({ status: 'error', message: 'workRoutine is required' });
    if (!foodPreference) return res.status(400).json({ status: 'error', message: 'foodPreference is required' });
    if (!['VEG', 'NON_VEG', 'EGGETARIAN'].includes(foodPreference)) {
      return res.status(400).json({ status: 'error', message: 'foodPreference must be one of VEG, NON_VEG, EGGETARIAN' });
    }

    const doc = await Consultation.create({
      userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined,
      fullName,
      whatsappNumber: whatsappNumberRaw,
      fitnessGoal,
      workRoutine,
      foodPreference,
      notes,
      isRead: false,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Consultation submitted',
      data: {
        id: String(doc._id),
        isRead: Boolean(doc.isRead),
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  submitConsultation,
};
