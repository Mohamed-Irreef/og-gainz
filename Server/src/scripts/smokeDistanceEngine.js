const assert = require('assert');
const { calculateDistanceKm } = require('../utils/calculateDistanceKm');

const approxEqual = (actual, expected, tolerance = 0.2) => {
	assert.strictEqual(typeof actual, 'number');
	assert.ok(Number.isFinite(actual));
	assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ~${expected} (±${tolerance}), got ${actual}`);
};

// Sanity checks from Phase 4 spec.
const d1 = calculateDistanceKm(12.89616, 80.17639);
approxEqual(d1, 3.62, 0.25);

const d2 = calculateDistanceKm(12.89245, 80.204236);
assert.strictEqual(d2, 0);

const d3 = calculateDistanceKm(12.9, 80.21);
assert.ok(d3 > 0 && d3 < 10, `Expected realistic nearby distance, got ${d3}`);

console.log('smokeDistanceEngine: OK', { d1, d2, d3 });
