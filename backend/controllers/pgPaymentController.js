const stripeLib = require('stripe');
const paymentModel = require('../models/postgres/paymentModel');
const orderModel = require('../models/postgres/orderModel');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const stripe = STRIPE_SECRET_KEY ? stripeLib(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

const ensureStripe = () => {
  if (!stripe) {
    const error = new Error('Stripe is not configured on the server.');
    error.statusCode = 500;
    throw error;
  }
};

// @route POST /api/pg/payments/create-checkout-session
const createCheckoutSession = async (req, res) => {
  try {
    ensureStripe();
    const { items = [], successUrl, cancelUrl } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items supplied for checkout.' });
    }

    const lineItems = items.map((item) => {
      const unitAmount = Number(item.amount);
      if (!item.name || !Number.isFinite(unitAmount) || unitAmount <= 0) {
        throw new Error('Each item must include a valid name and amount.');
      }
      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.name,
            description: item.description ? String(item.description).slice(0, 120) : undefined,
            images: item.image ? [item.image] : undefined,
          },
          unit_amount: Math.round(unitAmount * 100),
        },
        quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      };
    });

    const totalAmount = lineItems.reduce((sum, line) => sum + line.price_data.unit_amount * line.quantity, 0);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: req.user?.email,
      line_items: lineItems,
      success_url: successUrl || `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${CLIENT_URL}/cart`,
      metadata: { userId: req.user?._id?.toString?.() || '', amount: totalAmount.toString() },
    });

    return res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('pg Stripe checkout session error:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to create checkout session.', error: error.message || 'Stripe error' });
  }
};

// @route POST /api/pg/payments/confirm
const confirmPayment = async (req, res) => {
  try {
    ensureStripe();
    const { sessionId } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ success: false, message: 'sessionId is required.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    if (session.metadata?.userId && session.metadata.userId !== req.user?._id?.toString?.()) {
      return res.status(403).json({ success: false, message: 'Session does not belong to the authenticated user.' });
    }

    return res.status(200).json({
      success: true,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      alreadyProcessed: Boolean(session.metadata?.orderId),
      orderId: session.metadata?.orderId || null,
    });
  } catch (error) {
    console.error('pg Stripe confirm session error:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to confirm checkout session.', error: error.message || 'Stripe error' });
  }
};

// @route POST /api/pg/payments/mark-complete
const markComplete = async (req, res) => {
  try {
    ensureStripe();
    const { sessionId, orderId } = req.body || {};
    if (!sessionId || !orderId) {
      return res.status(400).json({ success: false, message: 'sessionId and orderId are required.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    if (session.metadata?.userId && session.metadata.userId !== req.user?._id?.toString?.()) {
      return res.status(403).json({ success: false, message: 'Session does not belong to the authenticated user.' });
    }

    const payment = await paymentModel.findByGatewayReference(sessionId);
    if (payment && session.payment_status === 'paid') {
      await paymentModel.markCompleted(payment._id, {
        transactionId: session.payment_intent,
        gatewayReference: sessionId,
        metadata: { paymentIntentId: session.payment_intent, customerEmail: session.customer_email },
      });
      await orderModel.updateStatusFields(orderId, { paymentStatus: 'paid' });
      await orderModel.setPaymentId(orderId, payment._id);
    }

    await stripe.checkout.sessions.update(sessionId, {
      metadata: { ...(session.metadata || {}), orderId: orderId.toString() },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('pg Stripe mark-complete error:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to mark session as complete.', error: error.message || 'Stripe error' });
  }
};

// @route POST /api/pg/payments/create
const createPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, amount, currency = 'PKR', metadata = {} } = req.body;
    if (!orderId || !paymentMethod || !amount) {
      return res.status(400).json({ success: false, message: 'Order ID, payment method, and amount are required' });
    }

    const orderRow = await orderModel.findById(orderId);
    if (!orderRow) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderModel.rowToOrder(orderRow);

    if (String(order.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const payment = await paymentModel.create({
      orderId,
      userId: req.user._id.toString(),
      paymentMethod,
      amount: Number(amount),
      currency,
      status: 'pending',
      metadata,
      description: `Payment for order #${orderId}`,
    });

    await orderModel.setPaymentId(orderId, payment._id);

    res.status(201).json({ success: true, payment });
  } catch (error) {
    console.error('pg createPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment record' });
  }
};

// @route GET /api/pg/payments/:id
const getPayment = async (req, res) => {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (String(payment.user) !== String(req.user._id) && req.user.role === 0) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('pg getPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment' });
  }
};

// @route GET /api/pg/payments
const getMyPayments = async (req, res) => {
  try {
    const { status, paymentMethod, page = 1, limit = 20 } = req.query;
    const { payments, total } = await paymentModel.listByUser({
      userId: req.user._id.toString(), status, paymentMethod, page: Number(page), limit: Number(limit),
    });

    res.json({
      success: true,
      payments,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('pg getMyPayments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// @route GET /api/pg/admin/payments
const getAllPayments = async (req, res) => {
  try {
    const { status, paymentMethod, startDate, endDate, page = 1, limit = 50 } = req.query;
    const { payments, total, stats } = await paymentModel.listAll({
      status, paymentMethod, startDate, endDate, page: Number(page), limit: Number(limit),
    });

    res.json({
      success: true,
      payments,
      stats,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('pg getAllPayments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// @route POST /api/pg/admin/payments/:id/refund
const refundPayment = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (!payment.canBeRefunded) return res.status(400).json({ success: false, message: 'Payment cannot be refunded' });

    const refundAmount = amount || payment.amount;

    if (payment.gatewayName === 'stripe' && payment.gatewayReference) {
      ensureStripe();
      try {
        const refund = await stripe.refunds.create({
          payment_intent: payment.transactionId || payment.gatewayReference,
          amount: Math.round(refundAmount * 100),
        });
        await paymentModel.processRefund(payment._id, {
          amount: refundAmount, reason: reason || 'Admin refund', refundedBy: req.user._id.toString(), gatewayRefundId: refund.id,
        });
      } catch (stripeError) {
        console.error('pg Stripe refund error:', stripeError);
        return res.status(500).json({ success: false, message: 'Failed to process refund through gateway' });
      }
    } else {
      await paymentModel.processRefund(payment._id, {
        amount: refundAmount, reason: reason || 'Admin refund', refundedBy: req.user._id.toString(),
      });
    }

    if (payment.order) {
      await orderModel.updateStatusFields(payment.order, { paymentStatus: 'refunded' });
    }

    const updated = await paymentModel.findById(req.params.id);
    res.json({ success: true, message: 'Refund processed successfully', payment: updated });
  } catch (error) {
    console.error('pg refundPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
};

module.exports = {
  createCheckoutSession,
  confirmPayment,
  markComplete,
  createPayment,
  getPayment,
  getMyPayments,
  getAllPayments,
  refundPayment,
};
