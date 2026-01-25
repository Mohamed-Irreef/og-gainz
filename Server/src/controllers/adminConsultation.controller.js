const mongoose = require('mongoose');

const Consultation = require('../models/Consultation.model');

const safeString = (v) => String(v || '').trim();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || '').trim());

const toPublicConsultationSummary = (c) => {
	if (!c) return c;
	return {
		id: String(c._id),
		userId: c.userId ? String(c.userId) : undefined,
		fullName: c.fullName,
		whatsappNumber: c.whatsappNumber,
		fitnessGoal: c.fitnessGoal,
		workRoutine: c.workRoutine,
		foodPreference: c.foodPreference,
		notes: c.notes,
		isRead: Boolean(c.isRead),
		readAt: c.readAt || undefined,
		readBy: c.readBy ? String(c.readBy) : undefined,
		isArchived: Boolean(c.isArchived),
		archivedAt: c.archivedAt || undefined,
		archivedBy: c.archivedBy ? String(c.archivedBy) : undefined,
		createdAt: c.createdAt,
		updatedAt: c.updatedAt,
	};
};

const listConsultations = async (req, res, next) => {
	try {
		const status = safeString(req.query?.status || 'all').toLowerCase();
		const includeArchived = ['1', 'true', 'yes'].includes(safeString(req.query?.includeArchived).toLowerCase());

		const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 50)));
		const page = Math.max(1, Number(req.query?.page || 1));
		const skip = (page - 1) * limit;

		const filter = {};
		if (!includeArchived) filter.isArchived = false;

		if (status === 'unread') {
			filter.isRead = false;
			filter.isArchived = false;
		} else if (status === 'read') {
			filter.isRead = true;
			filter.isArchived = false;
		} else if (status === 'archived') {
			filter.isArchived = true;
		} else if (status !== 'all') {
			return res.status(400).json({ status: 'error', message: 'Invalid status. Use unread, read, all, or archived.' });
		}

		const sort = (() => {
			if (status === 'all' || includeArchived) return { isRead: 1, createdAt: -1 };
			if (status === 'unread') return { createdAt: -1 };
			if (status === 'read') return { createdAt: -1 };
			if (status === 'archived') return { createdAt: -1 };
			return { isRead: 1, createdAt: -1 };
		})();

		const [items, total] = await Promise.all([
			Consultation.find(filter)
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.select({
					userId: 1,
					fullName: 1,
					whatsappNumber: 1,
					fitnessGoal: 1,
					workRoutine: 1,
					foodPreference: 1,
					isRead: 1,
					readAt: 1,
					readBy: 1,
					isArchived: 1,
					archivedAt: 1,
					archivedBy: 1,
					createdAt: 1,
					updatedAt: 1,
				})
				.lean(),
			Consultation.countDocuments(filter),
		]);

		return res.json({
			status: 'success',
			data: {
				items: items.map(toPublicConsultationSummary),
				meta: {
					page,
					limit,
					total,
					hasNextPage: skip + items.length < total,
				},
			},
		});
	} catch (err) {
		return next(err);
	}
};

const getConsultationById = async (req, res, next) => {
	try {
		const id = safeString(req.params?.id);
		if (!isValidObjectId(id)) return res.status(400).json({ status: 'error', message: 'Invalid id' });

		const item = await Consultation.findById(id).lean();
		if (!item) return res.status(404).json({ status: 'error', message: 'Consultation not found' });

		return res.json({ status: 'success', data: toPublicConsultationSummary(item) });
	} catch (err) {
		return next(err);
	}
};

const markConsultationRead = async (req, res, next) => {
	try {
		const id = safeString(req.params?.id);
		if (!isValidObjectId(id)) return res.status(400).json({ status: 'error', message: 'Invalid id' });

		const adminId = safeString(req.user?.id);
		const adminObjectId = isValidObjectId(adminId) ? new mongoose.Types.ObjectId(adminId) : undefined;

		const updated = await Consultation.findOneAndUpdate(
			{ _id: id, isRead: false },
			{ $set: { isRead: true, readAt: new Date(), readBy: adminObjectId } },
			{ new: true }
		).lean();
		if (updated) return res.json({ status: 'success', data: toPublicConsultationSummary(updated) });

		const existing = await Consultation.findById(id).lean();
		if (!existing) return res.status(404).json({ status: 'error', message: 'Consultation not found' });

		return res.json({ status: 'success', data: toPublicConsultationSummary(existing) });
	} catch (err) {
		return next(err);
	}
};

const archiveConsultation = async (req, res, next) => {
	try {
		const id = safeString(req.params?.id);
		if (!isValidObjectId(id)) return res.status(400).json({ status: 'error', message: 'Invalid id' });

		const adminId = safeString(req.user?.id);
		const adminObjectId = isValidObjectId(adminId) ? new mongoose.Types.ObjectId(adminId) : undefined;

		const updated = await Consultation.findOneAndUpdate(
			{ _id: id, isArchived: false },
			{ $set: { isArchived: true, archivedAt: new Date(), archivedBy: adminObjectId } },
			{ new: true }
		).lean();
		if (updated) return res.json({ status: 'success', data: toPublicConsultationSummary(updated) });

		const existing = await Consultation.findById(id).lean();
		if (!existing) return res.status(404).json({ status: 'error', message: 'Consultation not found' });
		return res.json({ status: 'success', data: toPublicConsultationSummary(existing) });
	} catch (err) {
		return next(err);
	}
};

const unarchiveConsultation = async (req, res, next) => {
	try {
		const id = safeString(req.params?.id);
		if (!isValidObjectId(id)) return res.status(400).json({ status: 'error', message: 'Invalid id' });

		const updated = await Consultation.findOneAndUpdate(
			{ _id: id, isArchived: true },
			{ $set: { isArchived: false }, $unset: { archivedAt: 1, archivedBy: 1 } },
			{ new: true }
		).lean();
		if (updated) return res.json({ status: 'success', data: toPublicConsultationSummary(updated) });

		const existing = await Consultation.findById(id).lean();
		if (!existing) return res.status(404).json({ status: 'error', message: 'Consultation not found' });
		return res.json({ status: 'success', data: toPublicConsultationSummary(existing) });
	} catch (err) {
		return next(err);
	}
};

const getUnreadCount = async (req, res, next) => {
	try {
		const unread = await Consultation.countDocuments({ isRead: false, isArchived: false });
		return res.json({ status: 'success', data: { unread } });
	} catch (err) {
		return next(err);
	}
};

module.exports = {
	listConsultations,
	getConsultationById,
	markConsultationRead,
	archiveConsultation,
	unarchiveConsultation,
	getUnreadCount,
};
