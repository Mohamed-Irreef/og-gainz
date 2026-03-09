const mongoose = require('mongoose');

const { connectDB } = require('../config/db.config');
const logger = require('../utils/logger.util');
const Order = require('../models/Order.model');
const DailyDelivery = require('../models/DailyDelivery.model');
const { mapShiftForMigration, normalizeShift, resolveShiftFromTime } = require('../utils/deliveryShift.util');

const REQUIRE_ENV = 'MIGRATE_DELIVERY_SHIFTS';
const CONFIRM_VALUE = 'YES';

const requireConfirmation = () => {
	const value = String(process.env[REQUIRE_ENV] || '').trim().toUpperCase();
	if (value !== CONFIRM_VALUE) {
		throw new Error(
			`Migration blocked. Set ${REQUIRE_ENV}=${CONFIRM_VALUE} to proceed.`
		);
	}
};

const safeString = (v) => String(v || '').trim();

const resolveShift = (timeStr) => {
	const shift = mapShiftForMigration(timeStr) || resolveShiftFromTime(timeStr);
	return shift || 'MORNING';
};

const toISODate = (d) => {
	const dt = d instanceof Date ? d : new Date(d);
	if (Number.isNaN(dt.getTime())) return '';
	const y = dt.getFullYear();
	const m = String(dt.getMonth() + 1).padStart(2, '0');
	const da = String(dt.getDate()).padStart(2, '0');
	return `${y}-${m}-${da}`;
};

const rebuildGroupKey = ({ userId, date, deliveryDate, deliveryShift, deliveryTime, time }) => {
	const uid = userId ? String(userId) : '';
	const dateKey = deliveryDate ? toISODate(deliveryDate) : safeString(date);
	const shiftKey = normalizeShift(deliveryShift) || resolveShiftFromTime(deliveryTime || time) || safeString(deliveryTime || time);
	return [uid, dateKey, shiftKey].filter(Boolean).join('|');
};

const migrateOrders = async () => {
	let scanned = 0;
	let updated = 0;
	let warnings = 0;

	const cursor = Order.find({ 'items.orderDetails': { $exists: true } }).cursor();
	for await (const order of cursor) {
		scanned += 1;
		const items = Array.isArray(order.items) ? order.items : [];
		let changed = false;

		const nextItems = items.map((item) => {
			const details = item?.orderDetails || {};
			if (details.deliveryShift) return item;

			const timeStr = safeString(details.deliveryTime);
			const shift = resolveShift(timeStr);
			if (!timeStr) {
				warnings += 1;
				logger.warn(`Order ${String(order._id)} item ${safeString(item?.cartItemId)} missing deliveryTime. Defaulting shift to MORNING.`);
			}

			changed = true;
			return {
				...item,
				orderDetails: {
					...details,
					deliveryShift: shift,
				},
			};
		});

		if (changed) {
			order.items = nextItems;
			await order.save();
			updated += 1;
		}
	}

	return { scanned, updated, warnings };
};

const migrateDailyDeliveries = async () => {
	let scanned = 0;
	let updated = 0;
	let warnings = 0;

	const cursor = DailyDelivery.find({ $or: [{ deliveryShift: { $exists: false } }, { deliveryShift: null }, { deliveryShift: '' }] }).cursor();
	for await (const delivery of cursor) {
		scanned += 1;
		const timeStr = safeString(delivery.deliveryTime || delivery.time);
		const shift = resolveShift(timeStr);
		if (!timeStr) {
			warnings += 1;
			logger.warn(`DailyDelivery ${String(delivery._id)} missing time. Defaulting shift to MORNING.`);
		}

		delivery.deliveryShift = shift;
		delivery.groupKey = rebuildGroupKey({
			userId: delivery.userId,
			date: delivery.date,
			deliveryDate: delivery.deliveryDate,
			deliveryShift: shift,
			deliveryTime: delivery.deliveryTime,
			time: delivery.time,
		});

		await delivery.save();
		updated += 1;
	}

	return { scanned, updated, warnings };
};

const run = async () => {
	requireConfirmation();
	await connectDB();

	logger.info('Starting delivery shift migration...');
	const orderStats = await migrateOrders();
	const deliveryStats = await migrateDailyDeliveries();

	logger.info(`Orders scanned: ${orderStats.scanned}, updated: ${orderStats.updated}, warnings: ${orderStats.warnings}`);
	logger.info(`Deliveries scanned: ${deliveryStats.scanned}, updated: ${deliveryStats.updated}, warnings: ${deliveryStats.warnings}`);

	await mongoose.connection.close();
	logger.info('Migration complete.');
};

run().catch((err) => {
	logger.error('Migration failed:', err);
	mongoose.connection.close(false).finally(() => process.exit(1));
});
