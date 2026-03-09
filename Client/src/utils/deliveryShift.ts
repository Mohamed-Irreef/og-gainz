export type DeliveryShift = 'MORNING' | 'AFTERNOON' | 'EVENING';

export const DELIVERY_SHIFTS: DeliveryShift[] = ['MORNING', 'AFTERNOON', 'EVENING'];

export const DELIVERY_SHIFT_META: Record<DeliveryShift, {
	label: string;
	windowLabel: string;
	shortLabel: string;
	start: string;
	end: string;
	icon: string;
	softClass: string;
}> = {
	MORNING: {
		label: 'Morning',
		windowLabel: '8:00 AM - 9:00 AM',
		shortLabel: '8AM-9AM',
		start: '08:00',
		end: '09:00',
		icon: '🌅',
		softClass: 'bg-yellow-50 text-yellow-900 border-yellow-200',
	},
	AFTERNOON: {
		label: 'Afternoon',
		windowLabel: '12:00 PM - 1:00 PM',
		shortLabel: '12PM-1PM',
		start: '12:00',
		end: '13:00',
		icon: '🌞',
		softClass: 'bg-orange-50 text-orange-900 border-orange-200',
	},
	EVENING: {
		label: 'Evening',
		windowLabel: '7:00 PM - 8:00 PM',
		shortLabel: '7PM-8PM',
		start: '19:00',
		end: '20:00',
		icon: '🌙',
		softClass: 'bg-purple-50 text-purple-900 border-purple-200',
	},
};

export const normalizeShift = (value?: string | null): DeliveryShift | undefined => {
	const s = String(value || '').trim().toUpperCase();
	return DELIVERY_SHIFTS.includes(s as DeliveryShift) ? (s as DeliveryShift) : undefined;
};

export const getShiftSortIndex = (shift?: string | null) => {
	const key = normalizeShift(shift);
	if (!key) return 99;
	return DELIVERY_SHIFTS.indexOf(key);
};

export const resolveShiftFromTime = (time?: string | null): DeliveryShift | undefined => {
	const s = String(time || '').trim();
	if (!s) return undefined;
	const toMinutes = (val: string) => {
		let m = /^([0-9]{1,2}):([0-9]{2})$/.exec(val);
		if (m) {
			const hh = Number(m[1]);
			const mm = Number(m[2]);
			if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
			return hh * 60 + mm;
		}
		m = /^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)$/i.exec(val);
		if (m) {
			let hh = Number(m[1]);
			const mm = Number(m[2]);
			const mer = String(m[3]).toUpperCase();
			if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 1 || hh > 12 || mm < 0 || mm > 59) return undefined;
			if (mer === 'AM') hh = hh === 12 ? 0 : hh;
			if (mer === 'PM') hh = hh === 12 ? 12 : hh + 12;
			return hh * 60 + mm;
		}
		return undefined;
	};
	const mins = toMinutes(s);
	if (!Number.isFinite(mins)) return undefined;
	const inRange = (start: number, end: number) => mins >= start && mins <= end;
	if (inRange(8 * 60, 9 * 60)) return 'MORNING';
	if (inRange(12 * 60, 13 * 60)) return 'AFTERNOON';
	if (inRange(19 * 60, 20 * 60)) return 'EVENING';
	return undefined;
};

export const formatShiftLabel = (shift?: string | null) => {
	const key = normalizeShift(shift);
	if (!key) return '—';
	const meta = DELIVERY_SHIFT_META[key];
	return `${meta.label} (${meta.shortLabel})`;
};

export const getShiftWindowLabel = (shift?: string | null) => {
	const key = normalizeShift(shift);
	return key ? DELIVERY_SHIFT_META[key].windowLabel : '—';
};

export const getKolkataNow = () => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Kolkata',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	}).formatToParts(new Date());
	const pick = (type: string) => parts.find((p) => p.type === type)?.value || '';
	const yyyy = pick('year');
	const mm = pick('month');
	const dd = pick('day');
	const hh = pick('hour');
	const mi = pick('minute');
	const ss = pick('second');
	const dt = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+05:30`);
	return Number.isNaN(dt.getTime()) ? new Date() : dt;
};

export const getKolkataISODate = () => {
	const now = getKolkataNow();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
};

export const buildKolkataDateTime = (dateISO: string, timeHHmm: string) => {
	const date = String(dateISO || '').trim();
	const time = String(timeHHmm || '').trim();
	if (!date || !time) return undefined;
	const dt = new Date(`${date}T${time}:00+05:30`);
	return Number.isNaN(dt.getTime()) ? undefined : dt;
};
