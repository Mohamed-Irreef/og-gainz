const { getShiftMeta } = require('../../utils/deliveryShift.util');

const assert = global.assert;
const test = global.test;

test('skip cutoff times match shift rules', () => {
	const morning = getShiftMeta('MORNING');
	const afternoon = getShiftMeta('AFTERNOON');
	const evening = getShiftMeta('EVENING');

	assert.strictEqual(morning.skipCutoff, '07:00');
	assert.strictEqual(afternoon.skipCutoff, '11:00');
	assert.strictEqual(evening.skipCutoff, '18:00');
});
