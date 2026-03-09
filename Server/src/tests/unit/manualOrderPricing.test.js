const {
  computeDeliveryFees,
  normalizeSubscriptionDays,
  buildDeliverySchedule,
  buildManualOrderBillHtml,
} = require('../../utils/manualOrder.util');

const assert = global.assert;
const test = global.test;

test('manual order delivery fee calculation', () => {
  const fees = computeDeliveryFees({
    distanceKm: 7,
    costPerKm: 10,
    deliveriesPerDay: 2,
    subscriptionDays: 7,
  });

  assert.strictEqual(fees.singleDeliveryCost, 70);
  assert.strictEqual(fees.dailyDeliveryFee, 140);
  assert.strictEqual(fees.totalDeliveryFee, 980);
});

test('manual order subscription day normalization', () => {
  assert.strictEqual(normalizeSubscriptionDays({ subscriptionType: 'weekly' }), 7);
  assert.strictEqual(normalizeSubscriptionDays({ subscriptionType: 'monthly' }), 30);
  assert.strictEqual(normalizeSubscriptionDays({ subscriptionType: 'trial', trialDays: 5 }), 5);
  assert.strictEqual(normalizeSubscriptionDays({ subscriptionType: 'trial', trialDays: 4 }), 3);
});

test('manual order delivery schedule length', () => {
  const schedule = buildDeliverySchedule({
    startDate: '2024-05-01',
    subscriptionDays: 3,
    deliveriesPerDay: 2,
    deliveryTime: '08:30',
  });

  assert.strictEqual(schedule.length, 6);
  assert.strictEqual(schedule[0].date, '2024-05-01');
  assert.strictEqual(schedule[0].time, '08:30');
});

test('manual order bill html includes customer name', () => {
  const html = buildManualOrderBillHtml({
    manualOrder: {
      manual_order_id: 'MO-TEST',
      customer_name: 'Test Customer',
      phone_number: '9999999999',
      whatsapp_number: '9999999999',
      distance_km: 3,
      delivery_time: '08:30',
      deliveries_per_day: 1,
      subscription_type: 'weekly',
      subscription_days: 7,
      meal_items: [],
      addon_items: [],
      meal_cost: 0,
      addon_cost: 0,
      delivery_cost_total: 0,
      grand_total: 0,
      payment_status: 'PENDING',
    },
    billId: 'bill-1',
  });

  assert.ok(html.includes('Test Customer'));
  assert.ok(html.includes('MO-TEST'));
});
