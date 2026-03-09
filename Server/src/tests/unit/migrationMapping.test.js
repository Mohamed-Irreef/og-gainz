const { mapShiftForMigration } = require('../../utils/deliveryShift.util');

const assert = global.assert;
const test = global.test;

test('migration mapping matches expected ranges', () => {
	assert.strictEqual(mapShiftForMigration('07:00'), 'MORNING');
	assert.strictEqual(mapShiftForMigration('10:00'), 'MORNING');
	assert.strictEqual(mapShiftForMigration('12:30'), 'AFTERNOON');
	assert.strictEqual(mapShiftForMigration('14:00'), 'AFTERNOON');
	assert.strictEqual(mapShiftForMigration('18:00'), 'EVENING');
	assert.strictEqual(mapShiftForMigration('21:00'), 'EVENING');
	assert.strictEqual(mapShiftForMigration('03:00'), undefined);
});
