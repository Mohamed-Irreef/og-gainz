const assert = require('assert');

const tests = [];

global.test = (name, fn) => {
	tests.push({ name, fn });
};

global.assert = assert;

require('./unit/deliveryShift.util.test');
require('./unit/skipCutoff.test');
require('./unit/migrationMapping.test');
require('./unit/deliveryGrouping.test');
require('./unit/manualOrderPricing.test');
require('./unit/deliveryFeeCalculator.test');
require('./unit/deliveryCostCalculator.test');

let failed = 0;
for (const t of tests) {
	try {
		t.fn();
		console.log(`\u2713 ${t.name}`);
	} catch (err) {
		failed += 1;
		console.error(`\u2717 ${t.name}`);
		console.error(err);
	}
}

if (failed > 0) {
	console.error(`\n${failed} test(s) failed.`);
	process.exit(1);
} else {
	console.log(`\nAll ${tests.length} test(s) passed.`);
}
