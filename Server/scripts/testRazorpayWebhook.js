/**
 * DEV-ONLY: Local Razorpay Webhook Smoke Script (Phase 5A)
 *
 * What it does:
 * - Builds a mock Razorpay webhook payload (payment.captured by default)
 * - Computes a valid `X-Razorpay-Signature` using your `RAZORPAY_WEBHOOK_SECRET`
 * - Sends POST to `http://localhost:5000/api/webhooks/razorpay`
 * - Logs HTTP status + response JSON (no secrets printed)
 *
 * How to run:
 * - Ensure the server is running: `npm run start` (in Server/)
 * - Then run: `npm run smoke:webhook`
 *
 * Targeting a real order:
 * - Best: set env vars:
 *   - `RAZORPAY_ORDER_ID` (must match an Order.razorpayOrderId in Mongo)
 *   - `RAZORPAY_AMOUNT_PAISE` (must match Math.round(order.total * 100))
 * - If `RAZORPAY_ORDER_ID` is not provided, the script will try to auto-pick
 *   the most recent order with a `razorpayOrderId` from your local MongoDB.
 *
 * Razorpay Dashboard → Webhook Tester:
 * - Expose your local server (e.g. `ngrok http 5000`)
 * - Add webhook URL: `https://<ngrok-id>.ngrok.io/api/webhooks/razorpay`
 * - IMPORTANT: Webhook signature verification uses `RAZORPAY_WEBHOOK_SECRET` (recommended).
 *   For legacy setups, the server may also fall back to `RAZORPAY_KEY_SECRET`.
 */

require('dotenv').config();

const crypto = require('crypto');

const mongoose = require('mongoose');
const Order = require('../src/models/Order.model');

const WEBHOOK_URL = process.env.RAZORPAY_WEBHOOK_URL || 'http://localhost:5000/api/webhooks/razorpay';

const mustGetSecret = () => {
  const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!secret) {
    throw new Error('Missing RAZORPAY_WEBHOOK_SECRET (or legacy RAZORPAY_KEY_SECRET) in environment');
  }
  return secret;
};

const computeSignature = (rawBody, secret) =>
  crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

const computeExpectedPaise = (orderTotal) => {
  const total = Number(orderTotal);
  if (!Number.isFinite(total)) return undefined;
  return Math.round(total * 100);
};

const pickOrderFromDbIfNeeded = async () => {
  const providedOrderId = String(process.env.RAZORPAY_ORDER_ID || '').trim();
  const providedAmountPaise = String(process.env.RAZORPAY_AMOUNT_PAISE || '').trim();

  if (providedOrderId) {
    const amountPaise = providedAmountPaise ? Number(providedAmountPaise) : undefined;
    return { razorpayOrderId: providedOrderId, amountPaise };
  }

  const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    return { razorpayOrderId: 'order_REPLACE_ME', amountPaise: undefined, warning: 'No MONGO_URI/MONGODB_URI set for auto-pick.' };
  }

  await mongoose.connect(mongoUri);

  try {
    const doc = await Order.findOne({ razorpayOrderId: { $exists: true, $ne: '' } })
      .sort({ createdAt: -1 })
      .select({ razorpayOrderId: 1, total: 1 })
      .lean();

    if (!doc?.razorpayOrderId) {
      return { razorpayOrderId: 'order_REPLACE_ME', amountPaise: undefined, warning: 'No orders with razorpayOrderId found in DB.' };
    }

    return {
      razorpayOrderId: String(doc.razorpayOrderId),
      amountPaise: computeExpectedPaise(doc.total),
    };
  } finally {
    await mongoose.connection.close().catch(() => undefined);
  }
};

const buildPayload = ({ razorpayOrderId, amountPaise }) => {
  const paymentId = String(process.env.RAZORPAY_PAYMENT_ID || 'pay_DEV_TEST_0001');

  return {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: razorpayOrderId,
          amount: Number.isFinite(amountPaise) ? amountPaise : 100,
          currency: 'INR',
          method: String(process.env.RAZORPAY_METHOD || 'upi'),
          status: 'captured',
          created_at: Math.floor(Date.now() / 1000),
          captured_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  };
};

const main = async () => {
  const secret = mustGetSecret();

  const picked = await pickOrderFromDbIfNeeded();
  if (picked.warning) {
    console.log(`[smoke:webhook] Warning: ${picked.warning}`);
  }

  const payload = buildPayload(picked);
  const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = computeSignature(rawBody, secret);

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': signature,
    },
    body: rawBody,
  });

  let json;
  try {
    json = await res.json();
  } catch (_) {
    json = { message: 'Non-JSON response' };
  }

  console.log(`[smoke:webhook] POST ${WEBHOOK_URL}`);
  console.log(`[smoke:webhook] HTTP ${res.status}`);
  console.log('[smoke:webhook] Response:', json);

  if (!res.ok) {
    console.log('[smoke:webhook] Tip: set RAZORPAY_ORDER_ID and RAZORPAY_AMOUNT_PAISE to match a real pending order.');
    process.exitCode = 1;
  }
};

main().catch((err) => {
  console.error('[smoke:webhook] Error:', err?.message || err);
  process.exitCode = 1;
});
