const crypto = require('crypto');

const Order = require('../models/Order.model');
const { ENV } = require('../config/env.config');
const logger = require('../utils/logger.util');

const getRawBodyBuffer = (req) => {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  return undefined;
};

const timingSafeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const verifyRazorpayWebhookSignature = ({ rawBody, signature, secret }) => {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return timingSafeEqualHex(expected, signature);
};

const extractPaymentEntity = (payload) => payload?.payload?.payment?.entity;
const extractOrderEntity = (payload) => payload?.payload?.order?.entity;

const toDateFromRazorpayTimestamp = (seconds) => {
  const n = Number(seconds);
  if (Number.isFinite(n) && n > 0) return new Date(n * 1000);
  return new Date();
};

const computeExpectedPaise = (orderTotal) => {
  const total = Number(orderTotal);
  if (!Number.isFinite(total)) return undefined;
  return Math.round(total * 100);
};

const handleRazorpayWebhook = async (req, res, next) => {
  try {
    logger.info('Razorpay webhook received');

    // IMPORTANT: webhook signature uses the webhook secret configured in Razorpay Dashboard.
    // Do not use the API key secret for webhook verification.
    const secret =
      ENV.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      // Backwards-compatible fallback (not recommended)
      ENV.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      logger.warn('Razorpay webhook rejected: secret not configured');
      return res.status(400).json({ status: 'error', message: 'Webhook secret not configured' });
    }

    const signature = String(req.headers['x-razorpay-signature'] || '').trim();
    if (!signature) {
      logger.warn('Razorpay webhook rejected: signature missing');
      return res.status(400).json({ status: 'error', message: 'Missing webhook signature' });
    }

    const rawBody = getRawBodyBuffer(req);
    if (!rawBody) {
      logger.warn('Razorpay webhook rejected: raw body missing');
      return res.status(400).json({ status: 'error', message: 'Missing raw webhook body' });
    }

    const ok = verifyRazorpayWebhookSignature({ rawBody, signature, secret });
    if (!ok) {
      logger.warn('Razorpay webhook rejected: signature mismatch');
      return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
      return res.status(400).json({ status: 'error', message: 'Invalid webhook JSON' });
    }

    const event = String(payload?.event || '').trim();

    // Razorpay can emit either payment-level or order-level success events.
    // We treat `order.paid` as a success equivalent to `payment.captured`.
    const isSuccessEvent = event === 'payment.captured' || event === 'order.paid';
    const isFailureEvent = event === 'payment.failed';
    if (!isSuccessEvent && !isFailureEvent) {
      return res.status(200).json({ status: 'success', message: 'Event ignored' });
    }

    const payment = extractPaymentEntity(payload);
    const orderEntity = extractOrderEntity(payload);
    const razorpayPaymentId = String(payment?.id || '').trim();
    const razorpayOrderId = String(payment?.order_id || '').trim();
    const amount = Number(payment?.amount);

    const orderIdFromOrderEntity = String(orderEntity?.id || '').trim();
    const orderId = razorpayOrderId || orderIdFromOrderEntity;
    if (!orderId) {
      return res.status(400).json({ status: 'error', message: 'Missing razorpay_order_id' });
    }

    const order = await Order.findOne({
      $or: [{ razorpayOrderId: orderId }, { 'paymentAttempts.razorpayOrderId': orderId }],
    }).lean();
    if (!order) {
      logger.warn('Razorpay webhook: no order matched');
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    logger.info(`Razorpay webhook matched order ${String(order._id)}`);

    const alreadyPaid = String(order?.paymentStatus || '').toUpperCase() === 'PAID' || String(order?.status || '').toUpperCase() === 'PAID';
    if (alreadyPaid) {
      return res.status(200).json({ status: 'success', message: 'Already processed' });
    }

    const expectedPaise = computeExpectedPaise(order.total);

    const matchedAttempt = Array.isArray(order.paymentAttempts)
      ? order.paymentAttempts.find((a) => String(a?.razorpayOrderId || '') === orderId)
      : undefined;

    if (isSuccessEvent) {
      if (!razorpayPaymentId) {
        // Some `order.paid` payloads may omit payment entity. In that case we still
        // accept the event if order-level paid amount matches expected.
        const orderPaid = Number(orderEntity?.amount_paid);
        if (event === 'order.paid' && expectedPaise !== undefined && Number.isFinite(orderPaid) && orderPaid === expectedPaise) {
          const updated = await Order.findOneAndUpdate(
            {
              _id: order._id,
              $and: [{ $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: { $ne: 'PAID' } }] }],
            },
            {
              $set: {
                paymentStatus: 'PAID',
                status: 'PAID',
                currentStatus: 'PAID',
                acceptanceStatus: 'PENDING_REVIEW',
                'payment.provider': 'razorpay',
                'payment.orderId': orderId,
                'payment.signature': signature,
                'payment.status': 'PAID',
                'payment.paidAt': new Date(),
                razorpaySignature: signature,
              },
              $push: {
                statusHistory: { status: 'PAID', changedAt: new Date(), changedBy: 'SYSTEM' },
              },
            },
            { new: true }
          );

          if (updated) {
            logger.info(`Razorpay order paid for order ${String(updated._id)}`);
            return res.status(200).json({ status: 'success' });
          }
          return res.status(200).json({ status: 'success', message: 'Already processed' });
        }

        return res.status(400).json({ status: 'error', message: 'Missing razorpay_payment_id' });
      }

      if (expectedPaise === undefined || !Number.isFinite(amount) || amount !== expectedPaise) {
        logger.warn('Razorpay webhook rejected: amount mismatch');
        return res.status(400).json({ status: 'error', message: 'Amount mismatch' });
      }

      const paidAt = toDateFromRazorpayTimestamp(payment?.captured_at ?? payment?.created_at);
      const method = typeof payment?.method === 'string' ? payment.method : undefined;

      // If this webhook corresponds to a retry attempt, mark that attempt as PAID as well.
      const attemptSetFields = matchedAttempt
        ? {
          'paymentAttempts.$[att].status': 'PAID',
          'paymentAttempts.$[att].razorpayPaymentId': razorpayPaymentId,
        }
        : undefined;

      const updated = await Order.findOneAndUpdate(
        {
          _id: order._id,
          $and: [
            { $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: { $ne: 'PAID' } }] },
            { $or: [{ 'payment.paymentId': { $exists: false } }, { 'payment.paymentId': razorpayPaymentId }] },
          ],
        },
        {
          $set: {
            paymentStatus: 'PAID',
            status: 'PAID',
            currentStatus: 'PAID',
            acceptanceStatus: 'PENDING_REVIEW',
            'payment.provider': 'razorpay',
            'payment.orderId': orderId,
            'payment.paymentId': razorpayPaymentId,
            'payment.signature': signature,
            'payment.method': method,
            'payment.status': 'PAID',
            'payment.paidAt': paidAt,
            razorpayPaymentId,
            razorpaySignature: signature,
            ...(attemptSetFields || {}),
          },
          $push: {
            statusHistory: { status: 'PAID', changedAt: paidAt, changedBy: 'SYSTEM' },
          },
        },
        matchedAttempt
          ? { new: true, arrayFilters: [{ 'att.razorpayOrderId': orderId }] }
          : { new: true }
      );

      if (!updated) {
        const current = await Order.findById(order._id).select({ paymentStatus: 1, status: 1, payment: 1 }).lean();
        const paid = String(current?.paymentStatus || '').toUpperCase() === 'PAID' || String(current?.status || '').toUpperCase() === 'PAID';
        if (paid) return res.status(200).json({ status: 'success', message: 'Already processed' });
        return res.status(409).json({ status: 'error', message: 'Payment already processed with different id' });
      }

      logger.info(`Razorpay payment captured for order ${String(updated._id)}`);
      return res.status(200).json({ status: 'success' });
    }

    // payment.failed
    const reason =
      typeof payment?.error_description === 'string'
        ? payment.error_description
        : typeof payment?.error_reason === 'string'
          ? payment.error_reason
          : undefined;

    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        $and: [
          { $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: { $ne: 'PAID' } }] },
          { $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: { $ne: 'FAILED' } }] },
        ],
      },
      {
        $set: {
          paymentStatus: 'FAILED',
          status: 'PAYMENT_FAILED',
          'payment.provider': 'razorpay',
          'payment.orderId': orderId,
          'payment.paymentId': razorpayPaymentId || undefined,
          'payment.signature': signature,
          'payment.status': 'FAILED',
          paymentFailureReason: reason,
          razorpayPaymentId: razorpayPaymentId || undefined,
          razorpaySignature: signature,
          ...(matchedAttempt
            ? {
              'paymentAttempts.$[att].status': 'FAILED',
              'paymentAttempts.$[att].reason': reason,
              ...(razorpayPaymentId ? { 'paymentAttempts.$[att].razorpayPaymentId': razorpayPaymentId } : {}),
            }
            : {}),
        },
      },
      matchedAttempt
        ? { new: true, arrayFilters: [{ 'att.razorpayOrderId': orderId }] }
        : { new: true }
    );

    if (updated) {
      logger.info(`Razorpay payment failed for order ${String(updated._id)}`);
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  handleRazorpayWebhook,
};
