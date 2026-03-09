const SHIFT_KEYS = ['MORNING', 'AFTERNOON', 'EVENING'];

const SHIFT_META = {
	MORNING: {
		label: 'Morning',
		windowLabel: '8:00 AM - 9:00 AM',
		shortLabel: '8AM-9AM',
		start: '08:00',
		end: '09:00',
		skipCutoff: '07:00',
		deliveryCutoff: '11:00',
	},
	AFTERNOON: {
		label: 'Afternoon',
		windowLabel: '12:00 PM - 1:00 PM',
		shortLabel: '12PM-1PM',
		start: '12:00',
		end: '13:00',
		skipCutoff: '11:00',
		deliveryCutoff: '15:00',
	},
	EVENING: {
		label: 'Evening',
		windowLabel: '7:00 PM - 8:00 PM',
		shortLabel: '7PM-8PM',
		start: '19:00',
		end: '20:00',
		skipCutoff: '18:00',
		deliveryCutoff: '22:00',
	},
};

const toMinutes = (value) => {
	const s = String(value || '').trim();
	if (!s) return undefined;
	let m = /^([0-9]{1,2}):([0-9]{2})$/.exec(s);
	if (m) {
		const hh = Number(m[1]);
		const mm = Number(m[2]);
		if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
		return hh * 60 + mm;
	}
	m = /^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)$/i.exec(s);
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

const normalizeShift = (value) => {
	const s = String(value || '').trim().toUpperCase();
	return SHIFT_KEYS.includes(s) ? s : undefined;
};

const getShiftMeta = (shift) => {
	const key = normalizeShift(shift);
	return key ? SHIFT_META[key] : undefined;
};

const getShiftSortIndex = (shift) => {
	const key = normalizeShift(shift);
	if (!key) return 99;
	return SHIFT_KEYS.indexOf(key);
};

const resolveShiftFromTime = (timeStr) => {
	const mins = toMinutes(timeStr);
	if (!Number.isFinite(mins)) return undefined;
	const inRange = (start, end) => mins >= start && mins <= end;
	if (inRange(8 * 60, 9 * 60)) return 'MORNING';
	if (inRange(12 * 60, 13 * 60)) return 'AFTERNOON';
	if (inRange(19 * 60, 20 * 60)) return 'EVENING';
	return undefined;
};

const mapShiftForMigration = (timeStr) => {
	const mins = toMinutes(timeStr);
	if (!Number.isFinite(mins)) return undefined;
	const inRange = (start, end) => mins >= start && mins <= end;
	if (inRange(7 * 60, 10 * 60)) return 'MORNING';
	if (inRange(11 * 60, 14 * 60)) return 'AFTERNOON';
	if (inRange(18 * 60, 21 * 60)) return 'EVENING';
	return undefined;
};

const buildKolkataDateTime = (dateISO, timeHHmm) => {
	const date = String(dateISO || '').trim();
	const time = String(timeHHmm || '').trim();
	if (!date || !time) return undefined;
	const dt = new Date(`${date}T${time}:00+05:30`);
	return Number.isNaN(dt.getTime()) ? undefined : dt;
};

const getNowKolkata = () => {
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
	const pick = (type) => parts.find((p) => p.type === type)?.value || '';
	const yyyy = pick('year');
	const mm = pick('month');
	const dd = pick('day');
	const hh = pick('hour');
	const mi = pick('minute');
	const ss = pick('second');
	const dt = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+05:30`);
	return Number.isNaN(dt.getTime()) ? new Date() : dt;
};

const getKolkataISODate = () => {
	const now = getNowKolkata();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
};

module.exports = {
	SHIFT_KEYS,
	SHIFT_META,
	normalizeShift,
	getShiftMeta,
	getShiftSortIndex,
	resolveShiftFromTime,
	mapShiftForMigration,
	buildKolkataDateTime,
	getNowKolkata,
	getKolkataISODate,
};
