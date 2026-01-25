// One-off Phase 5C verification helper (not used by runtime)

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { connectDB } = require('../config/db.config');
const Order = require('../models/Order.model');

const pick = (obj, keys) => {
	const out = {};
	for (const key of keys) out[key] = obj?.[key];
	return out;
};

const main = async () => {
	const orderId = String(process.argv[2] || '').trim();
	if (!orderId) {
		console.error('Usage: node Server/src/scripts/phase5c_inspect_order.js <orderId>');
		process.exit(1);
	}

	await connectDB();

	const order = await Order.findById(orderId).lean();
	if (!order) {
		console.error('Order not found:', orderId);
		process.exit(2);
	}

	const attempts = Array.isArray(order.paymentAttempts) ? order.paymentAttempts : [];
	const paymentIds = attempts.map((a) => a?.razorpayPaymentId).filter(Boolean);
	const duplicates = paymentIds.filter((id, idx) => paymentIds.indexOf(id) !== idx);

	const snapshot = {
		id: String(order._id),
		status: order.status,
		paymentStatus: order.paymentStatus,
		total: order.total,
		razorpayOrderId: order.razorpayOrderId,
		retryCount: order.retryCount,
		lastPaymentAttemptAt: order.lastPaymentAttemptAt,
		payment: order.payment
			? pick(order.payment, ['provider', 'orderId', 'paymentId', 'status', 'paidAt', 'method'])
			: undefined,
		paymentAttempts: attempts.map((a) => ({
			attemptId: a.attemptId,
			status: a.status,
			razorpayOrderId: a.razorpayOrderId,
			razorpayPaymentId: a.razorpayPaymentId,
			reason: a.reason,
			createdAt: a.createdAt,
		})),
		duplicateAttemptPaymentIds: Array.from(new Set(duplicates)),
	};

	console.log(JSON.stringify(snapshot, null, 2));
	process.exit(0);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
