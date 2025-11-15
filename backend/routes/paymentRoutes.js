const express = require('express');
const stripeLib = require('stripe');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

if (!STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set. Stripe routes will not function correctly.');
}

const stripe = STRIPE_SECRET_KEY ? stripeLib(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

const ensureStripe = () => {
  if (!stripe) {
    const error = new Error('Stripe is not configured on the server.');
    error.statusCode = 500;
    throw error;
  }
};

router.post('/payments/create-checkout-session', isAuthorized, async (req, res) => {
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
      metadata: {
        userId: req.user?._id?.toString?.() || '',
        amount: totalAmount.toString(),
      },
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Unable to create checkout session.',
      error: error.message || 'Stripe error',
    });
  }
});

router.post('/payments/confirm', isAuthorized, async (req, res) => {
  try {
    ensureStripe();

    const { sessionId } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ success: false, message: 'sessionId is required.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (session.metadata?.userId && session.metadata.userId !== req.user?._id?.toString?.()) {
      return res.status(403).json({ success: false, message: 'Session does not belong to the authenticated user.' });
    }

    return res.status(200).json({
      success: true,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      alreadyProcessed: session.metadata?.orderId ? true : false,
      orderId: session.metadata?.orderId || null,
    });
  } catch (error) {
    console.error('Stripe confirm session error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Unable to confirm checkout session.',
      error: error.message || 'Stripe error',
    });
  }
});

router.post('/payments/mark-complete', isAuthorized, async (req, res) => {
  try {
    ensureStripe();

    const { sessionId, orderId } = req.body || {};
    if (!sessionId || !orderId) {
      return res.status(400).json({ success: false, message: 'sessionId and orderId are required.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (session.metadata?.userId && session.metadata.userId !== req.user?._id?.toString?.()) {
      return res.status(403).json({ success: false, message: 'Session does not belong to the authenticated user.' });
    }

    // Update payment record if exists
    const payment = await Payment.findOne({ gatewayReference: sessionId });
    if (payment && session.payment_status === 'paid') {
      await payment.markCompleted({
        transactionId: session.payment_intent,
        gatewayReference: sessionId,
        metadata: {
          paymentIntentId: session.payment_intent,
          customerEmail: session.customer_email
        }
      });

      // Update order payment status
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        payment: payment._id
      });
    }

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...(session.metadata || {}),
        orderId: orderId.toString(),
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Stripe mark-complete error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Unable to mark session as complete.',
      error: error.message || 'Stripe error',
    });
  }
});

// Create payment record
router.post('/payments/create', isAuthorized, async (req, res) => {
  try {
    const { orderId, paymentMethod, amount, currency = 'PKR', metadata = {} } = req.body;

    if (!orderId || !paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, payment method, and amount are required'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (String(order.userId) !== String(req.user.userId || req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const payment = await Payment.create({
      order: orderId,
      user: req.user.userId || req.user.id,
      paymentMethod: paymentMethod.toUpperCase(),
      amount: Number(amount),
      currency: currency.toUpperCase(),
      status: 'pending',
      metadata,
      description: `Payment for order #${orderId}`
    });

    // Link payment to order
    order.payment = payment._id;
    await order.save();

    res.status(201).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment record'
    });
  }
});

// Get payment by ID
router.get('/payments/:id', isAuthorized, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order', 'amount status')
      .populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check authorization
    const userId = req.user.userId || req.user.id;
    if (String(payment.user) !== String(userId) && req.user.role === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
});

// Get payments for logged-in user
router.get('/payments', isAuthorized, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, paymentMethod, page = 1, limit = 20 } = req.query;

    const query = { user: userId };
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod.toUpperCase();

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await Payment.find(query)
      .populate('order', 'amount status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// Admin - Get all payments
router.get('/admin/payments', isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { status, paymentMethod, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod.toUpperCase();
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await Payment.find(query)
      .populate('order', 'amount status')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);
    const stats = await Payment.getPaymentStats(startDate, endDate);

    res.json({
      success: true,
      payments,
      stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get admin payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// Admin - Process refund
router.post('/admin/payments/:id/refund', isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id)
      .populate('order');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!payment.canBeRefunded) {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be refunded'
      });
    }

    const refundAmount = amount || payment.amount;

    // Process refund through gateway if applicable
    if (payment.gatewayName === 'stripe' && payment.gatewayReference) {
      ensureStripe();
      try {
        const refund = await stripe.refunds.create({
          payment_intent: payment.transactionId || payment.gatewayReference,
          amount: Math.round(refundAmount * 100) // Convert to cents
        });

        await payment.processRefund({
          amount: refundAmount,
          reason: reason || 'Admin refund',
          refundedBy: req.user.userId || req.user.id,
          gatewayRefundId: refund.id
        });
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        return res.status(500).json({
          success: false,
          message: 'Failed to process refund through gateway'
        });
      }
    } else {
      // Manual refund for COD or other methods
      await payment.processRefund({
        amount: refundAmount,
        reason: reason || 'Admin refund',
        refundedBy: req.user.userId || req.user.id
      });
    }

    // Update order payment status
    if (payment.order) {
      payment.order.paymentStatus = 'refunded';
      await payment.order.save();
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      payment
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund'
    });
  }
});

module.exports = router;


