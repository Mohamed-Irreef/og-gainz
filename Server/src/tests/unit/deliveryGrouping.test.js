const { getShiftSortIndex, normalizeShift } = require('../../utils/deliveryShift.util');

const assert = global.assert;
const test = global.test;

test('shift sort order is morning-afternoon-evening', () => {
	assert.ok(getShiftSortIndex('MORNING') < getShiftSortIndex('AFTERNOON'));
	assert.ok(getShiftSortIndex('AFTERNOON') < getShiftSortIndex('EVENING'));
});

test('shift sort handles normalized values', () => {
	const evening = normalizeShift('evening');
	assert.strictEqual(getShiftSortIndex(evening), getShiftSortIndex('EVENING'));
});
