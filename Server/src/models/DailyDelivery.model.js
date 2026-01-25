const mongoose = require('mongoose');

const DELIVERY_STATUSES = ['PENDING', 'COOKING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'SKIPPED'];

const parseISODateToStartOfDay = (iso) => {
	const s = String(iso || '').trim();
	const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
	if (!m) return undefined;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return undefined;
	const dt = new Date(y, mo - 1, d);
	if (Number.isNaN(dt.getTime())) return undefined;
	dt.setHours(0, 0, 0, 0);
	return dt;
};

const normalizeHHmm = (value) => {
	const s = String(value || '').trim();
	if (!s) return undefined;
	// Only normalize strict HH:mm inputs; legacy values like "12:30 PM" are preserved in `time`.
	const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(s);
	if (!m) return undefined;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return undefined;
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
	return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const DailyDeliveryStatusHistorySchema = new mongoose.Schema(
	{
		status: { type: String, required: true, enum: DELIVERY_STATUSES },
		changedAt: { type: Date, required: true, default: Date.now },
		// Backward-compatible: keep ADMIN entries, add KITCHEN for Phase 6D.
		changedBy: { type: String, required: true, enum: ['SYSTEM', 'ADMIN', 'KITCHEN'] },
	},
	{ _id: false }
);

const DailyDeliveryItemSchema = new mongoose.Schema(
	{
		// Phase 6D (read-only): itemId/name mirror legacy cartItemId/title.
		itemId: { type: String, required: false },
		name: { type: String, required: false },
		servings: { type: Number, required: false, min: 0 },

		orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
		cartItemId: { type: String, required: true },
		type: { type: String, required: true },
		plan: { type: String, required: true },
		title: { type: String, required: true },
		quantity: { type: Number, required: true, min: 1 },
	},
	{ _id: false }
);

const AddressSchema = new mongoose.Schema(
	{
		label: { type: String, required: false, trim: true },
		addressLine1: { type: String, required: true, trim: true },
		addressLine2: { type: String, required: false, trim: true },
		city: { type: String, required: true, trim: true },
		state: { type: String, required: true, trim: true },
		pincode: { type: String, required: true, trim: true },
		landmark: { type: String, required: false, trim: true },
		latitude: { type: Number, required: false },
		longitude: { type: Number, required: false },
	},
	{ _id: false }
);

const DailyDeliverySchema = new mongoose.Schema(
	{
		// YYYY-MM-DD (local business date)
		date: { type: String, required: true, index: true },
		// e.g. "12:30 PM" or "18:00"
		time: { type: String, required: true },

		// Phase 6D canonical fields (kept in addition to legacy `date`/`time`)
		deliveryDate: {
			type: Date,
			required: false,
			default: function () {
				return parseISODateToStartOfDay(this.date);
			},
			index: true,
		},
		deliveryTime: {
			type: String,
			required: false,
			default: function () {
				return normalizeHHmm(this.time);
			},
			index: true,
		},

		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		// Phase 6D linking fields (do not remove legacy source* fields)
		orderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Order',
			required: false,
			default: function () {
				return this.sourceOrderId;
			},
			index: true,
		},
		subscriptionId: { type: String, required: false, default: undefined, index: true },
		groupKey: {
			type: String,
			required: false,
			default: function () {
				const d = this.deliveryDate || parseISODateToStartOfDay(this.date);
				const dateKey = d && !Number.isNaN(new Date(d).getTime()) ? new Date(d).toISOString().slice(0, 10) : String(this.date || '').trim();
				const timeKey = this.deliveryTime || normalizeHHmm(this.time) || String(this.time || '').trim();
				const userKey = this.userId ? String(this.userId) : '';
				return [userKey, dateKey, timeKey].filter(Boolean).join('|');
			},
			index: true,
		},
		address: { type: AddressSchema, required: true },

		items: { type: [DailyDeliveryItemSchema], required: true, default: [] },

		status: { type: String, required: true, enum: DELIVERY_STATUSES, default: 'PENDING', index: true },
		statusHistory: { type: [DailyDeliveryStatusHistorySchema], required: false, default: undefined },

		// De-duplication keys (one delivery per day per subscription item)
		sourceOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
		sourceCartItemId: { type: String, required: true, index: true },
	},
	{ timestamps: true }
);

DailyDeliverySchema.index({ date: 1, time: 1, userId: 1 });
DailyDeliverySchema.index({ deliveryDate: 1, deliveryTime: 1, status: 1 });
DailyDeliverySchema.index({ userId: 1, deliveryDate: 1 });
DailyDeliverySchema.index({ sourceOrderId: 1, date: 1, sourceCartItemId: 1 }, { unique: true });

module.exports = mongoose.model('DailyDelivery', DailyDeliverySchema);
