const mongoose = require('mongoose');

const PauseSkipLog = require('../models/PauseSkipLog.model');
const DailyDelivery = require('../models/DailyDelivery.model');
const CustomMealSubscription = require('../models/CustomMealSubscription.model');
const AddonSubscription = require('../models/AddonSubscription.model');
const User = require('../models/User.model');

const localTodayISO = () => {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
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

const adminListPauseSkipRequests = async (req, res, next) => {
	try {
		const status = String(req.query?.status || 'PENDING').trim().toUpperCase();
		const requestType = String(req.query?.requestType || '').trim().toUpperCase();
		const kind = String(req.query?.kind || '').trim();
		const userId = String(req.query?.userId || '').trim();
		const limitRaw = Number(req.query?.limit);
		const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 500) : 200;

		const filter = {};
		if (status) filter.status = status;
		if (requestType) filter.requestType = requestType;
		if (kind) filter.kind = kind;
		if (userId) {
			if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ status: 'error', message: 'Invalid userId' });
			filter.userId = userId;
		}

		const items = await PauseSkipLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

		const userIds = Array.from(new Set(items.map((i) => (i.userId != null ? String(i.userId) : '')).filter(Boolean)));
		let usersById = new Map();
		if (userIds.length) {
			const users = await User.find({ _id: { $in: userIds } })
				.select({ name: 1, email: 1, addresses: 1 })
				.lean();
			usersById = new Map(
				users.map((u) => {
					const addresses = Array.isArray(u.addresses) ? u.addresses : [];
					const def = addresses.find((a) => a && a.isDefault) || addresses[0] || {};
					return [
						String(u._id),
						{
							id: String(u._id),
							name: u.name || '—',
							email: u.email || '',
							contactNumber: def.contactNumber || '',
							addressLine1: def.addressLine1 || '',
							addressLine2: def.addressLine2 || '',
							pincode: def.pincode || '',
						},
					];
				})
			);
		}

		const enriched = items.map((i) => {
			const uid = i.userId != null ? String(i.userId) : '';
			return {
				...normalizeLog(i),
				user: uid ? usersById.get(uid) : undefined,
			};
		});

		return res.json({ status: 'success', data: enriched });
	} catch (err) {
		return next(err);
	}
};

const applyApprovedPauseToSubscription = async (log, adminId) => {
	const subscriptionId = String(log.subscriptionId || '').trim();
	if (!subscriptionId) return;
	const kind = String(log.kind || '').trim();
	if (kind !== 'customMeal' && kind !== 'addon') return;

	const Model = kind === 'customMeal' ? CustomMealSubscription : AddonSubscription;

	const update = {
		pauseStartDate: log.pauseStartDate,
		pauseEndDate: log.pauseEndDate,
		pauseReason: log.reason,
		pauseRequestId: String(log._id),
	};

	// If pause is already in effect, mark paused now.
	const today = localTodayISO();
	const shouldPauseNow = log.pauseStartDate && log.pauseEndDate && log.pauseStartDate <= today && today <= log.pauseEndDate;
	if (shouldPauseNow) update.status = 'paused';

	await Model.findByIdAndUpdate(subscriptionId, { $set: update }, { new: false, runValidators: true });
};

const applyApprovedSkipToDelivery = async (log, adminId) => {
	const deliveryId = String(log.deliveryId || '').trim();
	if (!mongoose.isValidObjectId(deliveryId)) return;

	const delivery = await DailyDelivery.findById(deliveryId);
	if (!delivery) return;

	const current = String(delivery.status || '').trim();
	if (current !== 'PENDING') return;

	delivery.status = 'SKIPPED';
	delivery.statusHistory = Array.isArray(delivery.statusHistory) ? delivery.statusHistory : [];
	delivery.statusHistory.push({ status: 'SKIPPED', changedAt: new Date(), changedBy: 'ADMIN' });
	await delivery.save();
};

const adminDecidePauseSkipRequest = async (req, res, next) => {
	try {
		const adminId = String(req.user?.id || req.user?._id || '').trim() || 'unknown';
		const requestId = String(req.params?.requestId || '').trim();
		if (!mongoose.isValidObjectId(requestId)) {
			return res.status(404).json({ status: 'error', message: 'Request not found' });
		}

		const nextStatus = String(req.body?.status || '').trim().toUpperCase();
		const adminNote = String(req.body?.adminNote || '').trim() || undefined;
		if (nextStatus !== 'APPROVED' && nextStatus !== 'DECLINED') {
			return res.status(400).json({ status: 'error', message: 'status must be APPROVED or DECLINED' });
		}

		const log = await PauseSkipLog.findById(requestId);
		if (!log) return res.status(404).json({ status: 'error', message: 'Request not found' });
		if (String(log.status || '').trim() !== 'PENDING') {
			return res.status(400).json({ status: 'error', message: 'Only pending requests can be decided' });
		}

		log.status = nextStatus;
		log.decidedBy = mongoose.isValidObjectId(adminId) ? adminId : undefined;
		log.decidedAt = new Date();
		log.adminNote = adminNote;
		await log.save();

		if (nextStatus === 'APPROVED') {
			if (String(log.requestType) === 'PAUSE') {
				await applyApprovedPauseToSubscription(log, adminId);
			} else if (String(log.requestType) === 'SKIP') {
				await applyApprovedSkipToDelivery(log, adminId);
			}
		}

		return res.json({ status: 'success', data: normalizeLog(log) });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	adminListPauseSkipRequests,
	adminDecidePauseSkipRequest,
};
