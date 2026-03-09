const { calculateDeliveryFee } = require('../../services/deliveryFeeCalculator');

const assert = global.assert;
const test = global.test;

const addDaysISO = (iso, days) => {
  const dt = new Date(`${iso}T00:00:00`);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

test('delivery fee: same delivery times collapse to one trip', () => {
  const subs = [
    { start_date: '2026-04-01', end_date: '2026-04-03', delivery_time: '13:00' },
    { start_date: '2026-04-01', end_date: '2026-04-03', delivery_time: '13:00' },
  ];
  const total = calculateDeliveryFee(subs, 40);
  assert.strictEqual(total, 120);
});

test('delivery fee: different delivery times count as separate trips', () => {
  const subs = [
    { start_date: '2026-04-01', end_date: '2026-04-03', delivery_time: '13:00' },
    { start_date: '2026-04-01', end_date: '2026-04-03', delivery_time: '22:00' },
  ];
  const total = calculateDeliveryFee(subs, 40);
  assert.strictEqual(total, 240);
});

test('delivery fee: overlapping subscriptions count once per day per time', () => {
  const subs = [
    { start_date: '2026-04-01', end_date: '2026-04-03', delivery_time: '13:00' },
    { start_date: '2026-04-03', end_date: '2026-04-05', delivery_time: '13:00' },
  ];
  const total = calculateDeliveryFee(subs, 40);
  assert.strictEqual(total, 200);
});

test('delivery fee: multiple subscription ranges combine by day', () => {
  const subs = [
    { start_date: '2026-04-01', end_date: '2026-04-07', delivery_time: '22:00' },
    { start_date: '2026-04-02', end_date: '2026-04-08', delivery_time: '13:00' },
    { start_date: '2026-04-01', end_date: '2026-04-30', delivery_time: '17:00' },
  ];
  const total = calculateDeliveryFee(subs, 40);
  assert.strictEqual(total, 1720);
});

test('delivery fee: long subscription periods remain stable', () => {
  const start = '2026-01-01';
  const end = addDaysISO(start, 364);
  const total = calculateDeliveryFee([{ start_date: start, end_date: end, delivery_time: '08:00' }], 10);
  assert.strictEqual(total, 3650);
});
