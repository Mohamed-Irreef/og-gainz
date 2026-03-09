const { calculateDeliveryCost } = require('../../utils/deliveryCostCalculator');

const assert = global.assert;
const test = global.test;

test('delivery cost: distance below free radius', () => {
  assert.strictEqual(calculateDeliveryCost(4, 5, 10), 0);
});

test('delivery cost: distance equals free radius', () => {
  assert.strictEqual(calculateDeliveryCost(5, 5, 10), 0);
});

test('delivery cost: distance above free radius', () => {
  assert.strictEqual(calculateDeliveryCost(7, 5, 10), 20);
});

test('delivery cost: large distances', () => {
  assert.strictEqual(calculateDeliveryCost(120, 5, 8), 920);
});

test('delivery cost: settings change affects output', () => {
  const costA = calculateDeliveryCost(10, 2, 5);
  const costB = calculateDeliveryCost(10, 4, 5);
  assert.ok(costA > costB);
});
