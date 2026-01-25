export type CoreStatusKey =
	| 'PENDING'
	| 'CONFIRMED'
	| 'ACTIVE'
	| 'COOKING'
	| 'PREPARING'
	| 'PACKED'
	| 'OUT_FOR_DELIVERY'
	| 'DELIVERED'
	| 'SKIPPED'
	| 'DECLINED'
	| 'PAUSED'
	| 'PAID';

const titleCaseWords = (input: string) =>
	input
		.split(' ')
		.filter(Boolean)
		.map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
		.join(' ');

export const statusLabel = (raw: string) => {
	const s = String(raw || '').trim();
	if (!s) return '—';

	// Handle common enum-style values
	const normalized = s.toUpperCase();
	switch (normalized as CoreStatusKey) {
		case 'OUT_FOR_DELIVERY':
			return 'Out for delivery';
		case 'PENDING':
			return 'Pending';
		case 'CONFIRMED':
			return 'Confirmed';
		case 'ACTIVE':
			return 'Active';
		case 'COOKING':
			return 'Cooking';
		case 'PREPARING':
			return 'Preparing';
		case 'PACKED':
			return 'Packed';
		case 'DELIVERED':
			return 'Delivered';
		case 'SKIPPED':
			return 'Skipped';
		case 'DECLINED':
			return 'Declined';
		case 'PAUSED':
			return 'Paused';
		case 'PAID':
			return 'Paid';
		default:
			break;
	}

	return titleCaseWords(s.replaceAll('_', ' '));
};

export const statusBadgeClass = (raw: string) => {
	const s = String(raw || '').trim();
	if (!s) return 'bg-muted text-muted-foreground border';

	const normalized = s.toUpperCase();
	// Phase 7C global status colors
	switch (normalized as CoreStatusKey) {
		case 'PENDING':
			return 'bg-slate-50 text-slate-800 border-slate-200';
		case 'CONFIRMED':
		case 'ACTIVE':
		case 'PAID':
			return 'bg-blue-50 text-blue-800 border-blue-200';
		case 'COOKING':
		case 'PREPARING':
			return 'bg-amber-50 text-amber-900 border-amber-200';
		case 'PACKED':
			return 'bg-indigo-50 text-indigo-900 border-indigo-200';
		case 'OUT_FOR_DELIVERY':
			return 'bg-orange-50 text-orange-900 border-orange-200';
		case 'DELIVERED':
			return 'bg-green-50 text-green-900 border-green-200';
		case 'SKIPPED':
		case 'DECLINED':
			return 'bg-red-50 text-red-900 border-red-200';
		case 'PAUSED':
			return 'bg-slate-100 text-slate-800 border-slate-200';
		default:
			return 'bg-muted text-muted-foreground border';
	}
};
