const ORDER_LIFECYCLE_STATUSES = ['PAID', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const TRANSITIONS = {
	PAID: ['CONFIRMED'],
	CONFIRMED: ['PREPARING'],
	PREPARING: ['OUT_FOR_DELIVERY'],
	OUT_FOR_DELIVERY: ['DELIVERED'],
	DELIVERED: [],
};

const isValidLifecycleStatus = (value) => ORDER_LIFECYCLE_STATUSES.includes(String(value || '').trim());

const make400 = (message) => {
	const err = new Error(message);
	err.statusCode = 400;
	return err;
};

/**
 * Phase 6A: strict forward-only lifecycle validator.
 * - Same-status updates are allowed (idempotent no-op)
 * - Backward moves, skipping steps, and any changes from DELIVERED are forbidden
 */
const validateOrderStatusTransition = ({ fromStatus, toStatus }) => {
	const from = String(fromStatus || '').trim();
	const to = String(toStatus || '').trim();

	if (!isValidLifecycleStatus(from)) throw make400('Invalid currentStatus on order');
	if (!isValidLifecycleStatus(to)) throw make400('Invalid status');

	if (to === 'PAID') throw make400('Admins cannot set PAID manually');

	if (from === to) {
		return { ok: true, noop: true, from, to };
	}

	if (from === 'DELIVERED') {
		throw make400('Order is already delivered and cannot be changed');
	}

	const allowed = TRANSITIONS[from] || [];
	if (!allowed.includes(to)) {
		throw make400(`Invalid transition: ${from} -> ${to}`);
	}

	return { ok: true, noop: false, from, to };
};

module.exports = {
	ORDER_LIFECYCLE_STATUSES,
	validateOrderStatusTransition,
};
