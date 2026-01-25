// One-off Phase 5C verification helper (not used by runtime)

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { connectDB } = require('../config/db.config');
const Order = require('../models/Order.model');

const main = async () => {
	await connectDB();

	const q = {
		$or: [
			{ status: 'payment_failed' },
			{ status: 'PAYMENT_FAILED' },
			{ status: 'pending_payment' },
			{ status: 'PENDING_PAYMENT' },
			{ paymentStatus: 'FAILED' },
			{ paymentStatus: 'PENDING' },
		],
	};

	const orders = await Order.find(q)
		.sort({ updatedAt: -1 })
		.limit(10)
		.lean();

	console.log(
		JSON.stringify(
			orders.map((o) => ({
				id: String(o._id),
				status: o.status,
				paymentStatus: o.paymentStatus,
				total: o.total,
				retryCount: o.retryCount,
				attempts: Array.isArray(o.paymentAttempts) ? o.paymentAttempts.length : 0,
				razorpayOrderId: o.razorpayOrderId,
			})),
			null,
			2
		)
	);

	process.exit(0);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
