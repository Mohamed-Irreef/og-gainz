const mongoose = require('mongoose');

const DailyDelivery = require('../models/DailyDelivery.model');
const logger = require('../utils/logger.util');

const DELIVERY_STATUSES = ['PENDING', 'COOKING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'SKIPPED'];

const parseDateParam = (value) => {
	const s = String(value || '').trim();
	if (!s) return undefined;
	return s;
};

const nextStatusFrom = (current) => {
	const idx = DELIVERY_STATUSES.indexOf(String(current || '').trim());
	if (idx < 0) return undefined;
	const next = DELIVERY_STATUSES[idx + 1];
	if (next === 'SKIPPED') return undefined;
	return next;
};

const adminListDailyDeliveries = async (req, res, next) => {
	try {
		const date = parseDateParam(req.query.date);
		if (!date) return res.status(400).json({ status: 'error', message: 'date is required (YYYY-MM-DD)' });

		const deliveries = await DailyDelivery.find({ date }).sort({ time: 1, createdAt: 1 }).lean();
		return res.json({ status: 'success', data: deliveries });
	} catch (err) {
		return next(err);
	}
};

const adminGetDailyDelivery = async (req, res, next) => {
	try {
		const deliveryId = String(req.params.deliveryId || '').trim();
		if (!mongoose.isValidObjectId(deliveryId)) {
			return res.status(404).json({ status: 'error', message: 'Delivery not found' });
		}

		const delivery = await DailyDelivery.findById(deliveryId).lean();
		if (!delivery) return res.status(404).json({ status: 'error', message: 'Delivery not found' });

		return res.json({ status: 'success', data: delivery });
	} catch (err) {
		return next(err);
	}
};

const adminUpdateDailyDeliveryStatus = async (req, res, next) => {
	try {
		const adminId = String(req.user?.id || req.user?._id || '').trim() || 'unknown';
		const deliveryId = String(req.params.deliveryId || '').trim();
		if (!mongoose.isValidObjectId(deliveryId)) {
			return res.status(404).json({ status: 'error', message: 'Delivery not found' });
		}

		const status = String(req.body?.status || '').trim();
		if (!status) return res.status(400).json({ status: 'error', message: 'status is required' });
		if (!DELIVERY_STATUSES.includes(status)) {
			return res.status(400).json({ status: 'error', message: 'Invalid status' });
		}

		const delivery = await DailyDelivery.findById(deliveryId);
		if (!delivery) return res.status(404).json({ status: 'error', message: 'Delivery not found' });

		const current = String(delivery.status || '').trim();
		if (current === 'DELIVERED' || current === 'SKIPPED') {
			return res.status(400).json({ status: 'error', message: 'Delivered deliveries are final' });
		}

		const next = nextStatusFrom(current);
		const canSkip = current === 'PENDING' && status === 'SKIPPED';
		if (!canSkip && status !== current && status !== next) {
			return res.status(400).json({ status: 'error', message: `Invalid transition from ${current} to ${status}` });
		}

		if (status === current) {
			return res.json({ status: 'success', data: delivery.toObject() });
		}

		delivery.status = status;
		delivery.statusHistory = Array.isArray(delivery.statusHistory) ? delivery.statusHistory : [];
		delivery.statusHistory.push({ status, changedAt: new Date(), changedBy: 'ADMIN' });
		await delivery.save();

		logger.info(`DailyDelivery status changed: ${String(delivery._id)} ${current} -> ${status} by ADMIN:${adminId}`);

		return res.json({ status: 'success', data: delivery.toObject() });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	adminListDailyDeliveries,
	adminGetDailyDelivery,
	adminUpdateDailyDeliveryStatus,
};
