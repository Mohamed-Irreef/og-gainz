const mongoose = require('mongoose');

const { ENV } = require('../config/env.config');

const PauseSkipLog = require('../models/PauseSkipLog.model');
const DailyDelivery = require('../models/DailyDelivery.model');

const requireAuthUserId = (req) => {
  const userId = req?.user?.id || req?.user?._id;
  if (!userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  return String(userId);
};

const parseISODate = (value, fieldName) => {
  const s = String(value || '').trim();
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (!m) {
    const err = new Error(`${fieldName} must be YYYY-MM-DD`);
    err.statusCode = 400;
    throw err;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) {
    const err = new Error(`${fieldName} must be a valid date`);
    err.statusCode = 400;
    throw err;
  }
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const localTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseHHmm = (value) => {
  const s = String(value || '').trim();
  const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(s);
  if (!m) return undefined;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return undefined;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
  return { hh, mm };
};

const isBeforeLocalCutoff = (hhmm) => {
  const parsed = parseHHmm(hhmm);
  if (!parsed) return true;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(parsed.hh, parsed.mm, 0, 0);
  return now.getTime() < cutoff.getTime();
};

const normalizeLog = (doc) => {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ versionKey: false }) : doc;
  return {
    id: String(obj._id),
    requestType: obj.requestType,
    status: obj.status,
    kind: obj.kind,
    subscriptionId: obj.subscriptionId,
    deliveryId: obj.deliveryId,
    userId: obj.userId != null ? String(obj.userId) : undefined,
    reason: obj.reason,
    pauseStartDate: obj.pauseStartDate,
    pauseEndDate: obj.pauseEndDate,
    skipDate: obj.skipDate,
    decidedAt: obj.decidedAt,
    adminNote: obj.adminNote,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const listMyPauseSkipRequests = async (req, res, next) => {
  try {
    const userId = requireAuthUserId(req);
    const status = String(req.query?.status || '').trim();
    const requestType = String(req.query?.requestType || '').trim();

    const filter = { userId };
    if (status) filter.status = status.toUpperCase();
    if (requestType) filter.requestType = requestType.toUpperCase();

    const items = await PauseSkipLog.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ status: 'success', data: items.map(normalizeLog) });
  } catch (err) {
    return next(err);
  }
};

const requestPause = async (req, res, next) => {
  try {
    const userId = requireAuthUserId(req);
    const kind = String(req.body?.kind || '').trim();
    const subscriptionId = String(req.body?.subscriptionId || '').trim();
    const reason = String(req.body?.reason || '').trim() || undefined;
    const pauseStartDate = parseISODate(req.body?.pauseStartDate, 'pauseStartDate');
    const pauseEndDate = parseISODate(req.body?.pauseEndDate, 'pauseEndDate');

    if (!subscriptionId) {
      return res.status(400).json({ status: 'error', message: 'subscriptionId is required' });
    }
    if (kind !== 'customMeal' && kind !== 'addon' && kind !== 'mealPack') {
      return res.status(400).json({ status: 'error', message: 'Invalid kind' });
    }
    if (pauseEndDate < pauseStartDate) {
      return res.status(400).json({ status: 'error', message: 'pauseEndDate must be on/after pauseStartDate' });
    }

    const today = localTodayISO();
    if (pauseStartDate < today) {
      return res.status(400).json({ status: 'error', message: 'pauseStartDate must be today or later' });
    }

    const cutoffHours = typeof ENV.PAUSE_REQUEST_CUTOFF_HOURS === 'number' ? ENV.PAUSE_REQUEST_CUTOFF_HOURS : 24;
    if (cutoffHours > 0 && pauseStartDate === today) {
      // If pausing "today", enforce same-day cutoff as a stricter rule.
      return res.status(400).json({ status: 'error', message: `Pause must be requested at least ${cutoffHours} hours in advance` });
    }

    const created = await PauseSkipLog.create({
      requestType: 'PAUSE',
      status: 'PENDING',
      kind,
      subscriptionId,
      userId,
      reason,
      pauseStartDate,
      pauseEndDate,
    });

    return res.status(201).json({ status: 'success', data: normalizeLog(created) });
  } catch (err) {
    return next(err);
  }
};

const withdrawPauseSkipRequest = async (req, res, next) => {
  try {
    const userId = requireAuthUserId(req);
    const requestId = String(req.params?.requestId || '').trim();
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(404).json({ status: 'error', message: 'Request not found' });
    }

    const existing = await PauseSkipLog.findOne({ _id: requestId, userId });
    if (!existing) return res.status(404).json({ status: 'error', message: 'Request not found' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ status: 'error', message: 'Only pending requests can be withdrawn' });
    }

    existing.status = 'WITHDRAWN';
    existing.decidedAt = new Date();
    await existing.save();

    return res.json({ status: 'success', data: normalizeLog(existing) });
  } catch (err) {
    return next(err);
  }
};

const requestSkipDelivery = async (req, res, next) => {
  try {
    const userId = requireAuthUserId(req);
    const deliveryId = String(req.body?.deliveryId || '').trim();
    const reason = String(req.body?.reason || '').trim() || undefined;

    if (!mongoose.isValidObjectId(deliveryId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid deliveryId' });
    }

    const today = localTodayISO();
    const cutoff = ENV.SKIP_REQUEST_CUTOFF_HHMM || '06:00';
    if (!isBeforeLocalCutoff(cutoff)) {
      return res.status(400).json({ status: 'error', message: `Skip cutoff passed (${cutoff})` });
    }

    const delivery = await DailyDelivery.findOne({ _id: deliveryId, userId }).lean();
    if (!delivery) {
      return res.status(404).json({ status: 'error', message: 'Delivery not found' });
    }
    const deliveryDate = String(delivery.date || '').trim();
    if (deliveryDate !== today) {
      return res.status(400).json({ status: 'error', message: 'Only today\'s delivery can be skipped' });
    }
    const current = String(delivery.status || '').trim();
    if (current !== 'PENDING') {
      return res.status(400).json({ status: 'error', message: 'Only pending deliveries can be skipped' });
    }

    // Deduplicate: one pending skip request per delivery.
    const already = await PauseSkipLog.findOne({ requestType: 'SKIP', deliveryId, status: 'PENDING' }).lean();
    if (already) {
      return res.status(400).json({ status: 'error', message: 'A skip request is already pending for this delivery' });
    }

    const created = await PauseSkipLog.create({
      requestType: 'SKIP',
      status: 'PENDING',
      kind: 'delivery',
      deliveryId,
      userId,
      reason,
      skipDate: today,
    });

    return res.status(201).json({ status: 'success', data: normalizeLog(created) });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listMyPauseSkipRequests,
  requestPause,
  requestSkipDelivery,
  withdrawPauseSkipRequest,
};
