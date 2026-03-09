const {
	getShiftMeta,
	normalizeShift,
	resolveShiftFromTime,
} = require('../../utils/deliveryShift.util');

const assert = global.assert;
const test = global.test;

test('shift validation accepts valid enums', () => {
	assert.strictEqual(normalizeShift('MORNING'), 'MORNING');
	assert.strictEqual(normalizeShift('afternoon'), 'AFTERNOON');
	assert.strictEqual(normalizeShift('Evening'), 'EVENING');
	assert.strictEqual(normalizeShift('invalid'), undefined);
});

test('shift resolution from time windows', () => {
	assert.strictEqual(resolveShiftFromTime('08:30'), 'MORNING');
	assert.strictEqual(resolveShiftFromTime('12:00 PM'), 'AFTERNOON');
	assert.strictEqual(resolveShiftFromTime('19:30'), 'EVENING');
});

test('shift meta provides window labels', () => {
	const morning = getShiftMeta('MORNING');
	assert.ok(morning);
	assert.strictEqual(morning.start, '08:00');
	assert.strictEqual(morning.end, '09:00');
});
