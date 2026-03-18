const fs = require('fs');
const path = require('path');
const { normalizeShift, resolveShiftFromTime } = require('./deliveryShift.util');

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return n;
};

const clampInt = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const v = toInt(value, min);
  return Math.max(min, Math.min(max, v));
};

const toISODate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysISO = (iso, days) => {
  const dt = new Date(`${String(iso)}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
};

const normalizeTime = (value) => {
  const s = String(value || '').trim();
  return s || undefined;
};

const normalizeSubscriptionDays = ({ subscriptionType, trialDays }) => {
  const type = String(subscriptionType || '').toLowerCase();
  if (type === 'weekly') return 7;
  if (type === 'monthly') return 30;
  if (type === 'trial') {
    const candidate = clampInt(trialDays, 3, 7);
    if ([3, 5, 7].includes(candidate)) return candidate;
    return 3;
  }
  return 1;
};

const formatInr = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 'INR 0.00';
  return `INR ${n.toFixed(2)}`;
};

const computeDeliveryFees = ({ distanceKm, costPerKm, deliveriesPerDay, subscriptionDays }) => {
  const distance = Math.max(0, toNumber(distanceKm));
  const perKm = Math.max(0, toNumber(costPerKm));
  const perDay = Math.max(1, clampInt(deliveriesPerDay, 1));
  const days = Math.max(1, clampInt(subscriptionDays, 1));

  const singleDeliveryCost = distance * perKm;
  const dailyDeliveryFee = singleDeliveryCost * perDay;
  const totalDeliveryFee = dailyDeliveryFee * days;

  return {
    singleDeliveryCost,
    dailyDeliveryFee,
    totalDeliveryFee,
  };
};

const buildDeliverySchedule = ({ startDate, subscriptionDays, deliveriesPerDay, deliveryTime }) => {
  const startISO = toISODate(startDate) || toISODate(new Date());
  const days = Math.max(1, clampInt(subscriptionDays, 1));
  const perDay = Math.max(1, clampInt(deliveriesPerDay, 1));
  const time = normalizeTime(deliveryTime) || '12:00';

  const schedule = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const date = addDaysISO(startISO, dayIndex);
    const shift = normalizeShift(resolveShiftFromTime(time));
    for (let slot = 0; slot < perDay; slot += 1) {
      schedule.push({ date, time, deliveryShift: shift, slot });
    }
  }

  return schedule;
};

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

let cachedInvoiceLogoSrc;
const getInvoiceLogoSrc = () => {
  if (cachedInvoiceLogoSrc) return cachedInvoiceLogoSrc;

  try {
    const logoPath = path.resolve(__dirname, '../../../Client/public/home/logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    cachedInvoiceLogoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    return cachedInvoiceLogoSrc;
  } catch (_) {
    cachedInvoiceLogoSrc = 'https://www.oggainz.com/home/logo.png';
    return cachedInvoiceLogoSrc;
  }
};

const buildManualOrderBillHtml = ({ manualOrder, billId }) => {
  const orderId = manualOrder.manual_order_id || billId || '';
  const paymentStatus = String(manualOrder.payment_status || '').toUpperCase() || 'PENDING';
  const createdAt = manualOrder.created_at || manualOrder.createdAt || new Date();
  const createdDate = toISODate(createdAt) || toISODate(new Date());
  const logoSrc = getInvoiceLogoSrc();

  const ingredientItems = [
    ...(manualOrder.meal_items || []),
    ...(manualOrder.addon_items || []),
    ...(manualOrder.byo_items || []),
  ];

  const ingredientsRows = ingredientItems.length
    ? ingredientItems.map((item) => {
      const qty = Math.max(0, Number(item.quantity || 0));
      return `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${qty > 1 ? `<div class="item-meta">Qty: ${qty}</div>` : ''}
        </td>
        <td class="right">${formatInr(item.line_total || 0)}</td>
      </tr>
    `;
    }).join('')
    : `
      <tr>
        <td colspan="2" class="empty">No ingredients added</td>
      </tr>
    `;

  const ingredientsTotal = Number(manualOrder.meal_cost || 0) + Number(manualOrder.addon_cost || 0) + Number(manualOrder.byo_cost || 0);
  const deliveryTotal = Number(manualOrder.delivery_cost_total || 0);
  const finalTotal = Number(manualOrder.grand_total || 0);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OG Gainz Invoice ${escapeHtml(orderId)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: "Segoe UI", "Arial", sans-serif; margin: 0; padding: 28px; background: #f8faf8; color: #0f172a; font-size: 14px; line-height: 1.45; }
      .invoice { max-width: 840px; margin: 0 auto; background: #ffffff; border: 1px solid #d7e3db; border-radius: 16px; padding: 24px; box-shadow: 0 6px 24px rgba(2, 44, 34, 0.08); }
      .header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid #e2ece6; }
      .logo-wrap { width: 180px; max-width: 48%; }
      .logo { width: 100%; height: auto; display: block; }
      .company-meta { margin-top: 10px; color: #1f4f43; font-size: 13px; }
      .muted { color: #5f7a72; font-size: 13px; }
      .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #e2e8f0; }
      .status.paid { background: #dcfce7; color: #166534; }
      .status.pending { background: #fef3c7; color: #92400e; }
      .status.cancelled { background: #fee2e2; color: #991b1b; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
      .panel { background: #f8fcfa; border: 1px solid #e2ece6; border-radius: 12px; padding: 12px 14px; }
      .label { font-size: 12px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; color: #40685c; margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; margin-top: 18px; border: 1px solid #e2ece6; border-radius: 12px; overflow: hidden; }
      th, td { border-bottom: 1px solid #e9f1ed; padding: 11px 12px; font-size: 14px; vertical-align: top; }
      th { text-align: left; background: #f1f8f4; font-weight: 700; color: #1f4f43; }
      td.right { text-align: right; }
      .item-name { font-weight: 600; color: #163f35; }
      .item-meta { color: #6a847b; font-size: 12px; margin-top: 2px; }
      td.empty { text-align: center; color: #6a847b; font-style: italic; }
      .totals { margin-top: 16px; display: grid; gap: 6px; }
      .totals div { display: flex; justify-content: space-between; font-size: 14px; color: #1f3e35; }
      .totals .grand { font-weight: 800; font-size: 16px; color: #0f3c31; border-top: 1px dashed #c7d8d0; margin-top: 6px; padding-top: 8px; }
      .no-print { margin-top: 18px; }
      .print-btn { border: none; background: #0f624c; color: #fff; border-radius: 10px; padding: 9px 14px; font-weight: 600; cursor: pointer; }
      .right-col { text-align: right; }
      @media (max-width: 700px) {
        body { padding: 12px; }
        .invoice { padding: 14px; border-radius: 10px; }
        .header { flex-direction: column; }
        .right-col { text-align: left; }
        .grid { grid-template-columns: 1fr; }
      }
      @media print {
        .no-print { display: none; }
        body { margin: 0; padding: 0; background: #fff; }
        .invoice { border: none; box-shadow: none; border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <div class="invoice">
      <div class="header">
        <div>
          <div class="logo-wrap">
            <img src="${logoSrc}" alt="OG Gainz" class="logo" />
          </div>
          <div class="company-meta">Perumbakkam</div>
          <div class="muted">Payment method: Online payment</div>
        </div>
        <div class="right-col">
          <div class="muted">Invoice</div>
          <div style="font-size: 18px; font-weight: 700; color: #124c3d; margin: 4px 0 6px;">${escapeHtml(orderId)}</div>
          <div class="muted">Date: ${escapeHtml(createdDate || '')}</div>
          <div class="status ${paymentStatus === 'PAID' ? 'paid' : paymentStatus === 'CANCELLED' ? 'cancelled' : 'pending'}">
            ${escapeHtml(paymentStatus)}
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <div class="label">Customer Details</div>
          <div style="font-weight: 600;">${escapeHtml(manualOrder.customer_name || '')}</div>
          <div class="muted">Phone: ${escapeHtml(manualOrder.phone_number || '')}</div>
          <div class="muted">WhatsApp: ${escapeHtml(manualOrder.whatsapp_number || '')}</div>
          <div class="muted">Address: ${escapeHtml(manualOrder.address || '')}</div>
        </div>
        <div class="panel">
          <div class="label">Delivery Details</div>
          <div class="muted">Distance: ${Number(manualOrder.distance_km || 0)} km</div>
          <div class="muted">Deliveries/day: ${Number(manualOrder.deliveries_per_day || 0)}</div>
          <div class="muted">Subscription: ${escapeHtml(String(manualOrder.subscription_type || '').toUpperCase())} (${Number(manualOrder.subscription_days || 0)} days)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Ingredients Added</th>
            <th class="right">Cost</th>
          </tr>
        </thead>
        <tbody>
          ${ingredientsRows}
        </tbody>
      </table>

      <div class="totals">
        <div><span>Ingredients Total</span><span>${formatInr(ingredientsTotal)}</span></div>
        <div><span>Delivery Charges</span><span>${formatInr(deliveryTotal)}</span></div>
        <div class="grand"><span>Grand Total</span><span>${formatInr(finalTotal)}</span></div>
      </div>

      <div class="no-print">
        <button class="print-btn" onclick="window.print()">Print Invoice</button>
      </div>
    </div>
  </body>
</html>`;
};

module.exports = {
  computeDeliveryFees,
  normalizeSubscriptionDays,
  buildDeliverySchedule,
  buildManualOrderBillHtml,
  toISODate,
  normalizeTime,
};
