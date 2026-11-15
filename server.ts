import dotenv from 'dotenv';
dotenv.config({ override: true });

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import { optionalAuth, requireAuth, requireAdmin, type AuthRequest } from './src/middleware/auth.ts';
import {
  calculateServerOrderTotals,
  validateCoupon,
  validateLeadInquiry,
  buildWhatsAppInquiryUrl,
} from './src/utils/storeLogic.ts';
import {
  getCatalogMap,
  getAllProducts,
  getWorkshops,
  getConsultationServices,
  createPendingOrder,
  createCodOrder,
  markRazorpayOrderPaid,
  markRazorpayOrderFailed,
  trackOrder,
  getOrdersForUser,
  getBookingsForUser,
  getWorkshopRegistrationsForUser,
  createConsultationBooking,
  registerWorkshopSeat,
  subscribeNewsletter,
  unsubscribeNewsletter,
  getApprovedReviews,
  submitProductReview,
  getAdminOverview,
  adminUpdateOrder,
  adminUpdateProduct,
  adminCreateProduct,
  adminModerateReview,
  adminUpdateLeadStatus,
  exportStoreBackupSnapshot,
  requestOrderAction,
  createLeadInquiry,
  markLeadsSheetSynced,
  recordCartRecoveryOptIn,
  adminMarkOutboxDispatched,
  adminDismissCartRecovery,
} from './src/server/storeDb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Security headers (preserve iframe embedding in AI Studio preview) and image caching
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (/\.(?:jpg|jpeg|png|webp|svg|ico|woff2?)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
});

// Capture raw body for Razorpay webhook HMAC verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

const getRazorpayCredentials = () => {
  const key_id = (process.env.RAZORPAY_KEY_ID || '').trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const webhook_secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  return { key_id, key_secret, webhook_secret };
};

const getRazorpayClient = () => {
  const { key_id, key_secret } = getRazorpayCredentials();
  if (!key_id || !key_secret) {
    throw new Error('RAZORPAY_CONFIG_MISSING');
  }
  return new Razorpay({ key_id, key_secret });
};

// Health & Payment Public Config
app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'ShivAmrit Healers Isolated Store API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/payment-config', (_req: Request, res: Response) => {
  const { key_id, key_secret } = getRazorpayCredentials();
  const configured = Boolean(key_id && key_secret);
  return res.json({
    configured,
    key_id: configured ? key_id : '',
    mode: key_id.startsWith('rzp_live_') ? 'live' : configured ? 'test' : 'unconfigured',
  });
});

// Authoritative Catalog, Consultation Services & Workshops
app.get('/api/catalog', (_req: Request, res: Response) => {
  return res.json({
    products: getAllProducts(),
    services: getConsultationServices(),
    workshops: getWorkshops(),
  });
});

// Server-side Coupon Validation Preview
app.post('/api/coupon/validate', (req: Request, res: Response) => {
  const { code = '', items = [] } = req.body || {};
  const catalog = getCatalogMap();
  const calc = calculateServerOrderTotals(items, '', catalog);
  if (!calc.valid) {
    return res.status(400).json({ valid: false, message: calc.error || 'Add items to cart before applying a coupon.' });
  }
  const result = validateCoupon(String(code), calc.subtotal);
  return res.json(result);
});

// Server-Authoritative Razorpay Order Creation
app.post('/api/create-order', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { items = [], couponCode = '', customer = {}, shippingAddress = {} } = req.body || {};
    const catalog = getCatalogMap();
    const calc = calculateServerOrderTotals(items, String(couponCode || ''), catalog);

    if (!calc.valid) {
      return res.status(400).json({ error: calc.error || 'Invalid order items' });
    }

    let razorpay: Razorpay;
    try {
      razorpay = getRazorpayClient();
    } catch {
      return res.status(503).json({
        error: 'Razorpay credentials are not configured on the server. Use Cash on Delivery or configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
    }

    const storeOrderId = `SH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const amountInPaise = Math.max(100, Math.round(calc.grandTotal * 100));

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `sh_rcpt_${Date.now()}`,
      notes: {
        store: 'ShivAmrit Healers',
        store_order_id: storeOrderId,
      },
    });

    const now = new Date().toISOString();
    await createPendingOrder({
      orderId: storeOrderId,
      userId: req.user?.uid || '',
      customerName: String(customer.name || '').trim().slice(0, 120),
      customerPhone: String(customer.phone || '').trim().slice(0, 20),
      customerEmail: String(customer.email || '').trim().toLowerCase().slice(0, 160),
      shippingStreet: String(shippingAddress.street || '').trim().slice(0, 300),
      shippingCity: String(shippingAddress.city || '').trim().slice(0, 100),
      shippingPincode: String(shippingAddress.pincode || '').trim().slice(0, 10),
      items: calc.items,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      couponCode: calc.couponResult.valid ? calc.couponResult.code : '',
      shippingFee: calc.shippingFee,
      grandTotal: calc.grandTotal,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending_payment',
      razorpayOrderId: rzpOrder.id,
      razorpayPaymentId: '',
      trackingNumber: '',
      courierName: '',
      stockDeducted: false,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(200).json({
      store_order_id: storeOrderId,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      totals: {
        subtotal: calc.subtotal,
        discountAmount: calc.discountAmount,
        shippingFee: calc.shippingFee,
        grandTotal: calc.grandTotal,
      },
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return res.status(error?.statusCode === 401 ? 401 : 500).json({
      error: error?.error?.description || error?.message || 'Failed to create Razorpay order',
    });
  }
});

// Server-Authoritative Persistent Cash-On-Delivery Order
app.post('/api/create-cod-order', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { items = [], couponCode = '', customer = {}, shippingAddress = {} } = req.body || {};
    const name = String(customer.name || '').trim();
    const phone = String(customer.phone || '').trim();
    const email = String(customer.email || '').trim().toLowerCase();
    const street = String(shippingAddress.street || '').trim();
    const city = String(shippingAddress.city || '').trim();
    const pincode = String(shippingAddress.pincode || '').trim();

    if (!name || phone.replace(/\D/g, '').length < 10 || !street || !/^[0-9]{6}$/.test(pincode)) {
      return res.status(400).json({
        error: 'Please provide a valid full name, 10-digit phone number, street address, and 6-digit PIN code.',
      });
    }

    const catalog = getCatalogMap();
    const calc = calculateServerOrderTotals(items, String(couponCode || ''), catalog);
    if (!calc.valid) {
      return res.status(400).json({ error: calc.error || 'Invalid order items' });
    }

    const now = new Date().toISOString();
    const orderId = `SH-COD-${Math.floor(100000 + Math.random() * 900000)}`;
    const saved = await createCodOrder({
      orderId,
      userId: req.user?.uid || '',
      customerName: name.slice(0, 120),
      customerPhone: phone.slice(0, 20),
      customerEmail: email.slice(0, 160),
      shippingStreet: street.slice(0, 300),
      shippingCity: city.slice(0, 100),
      shippingPincode: pincode,
      items: calc.items,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      couponCode: calc.couponResult.valid ? calc.couponResult.code : '',
      shippingFee: calc.shippingFee,
      grandTotal: calc.grandTotal,
      paymentMethod: 'cod',
      paymentStatus: 'cod_pending',
      fulfillmentStatus: 'processing',
      razorpayOrderId: '',
      razorpayPaymentId: '',
      trackingNumber: '',
      courierName: '',
      stockDeducted: false,
      createdAt: now,
      updatedAt: now,
    });

    if (!saved.ok || !saved.order) {
      return res.status(400).json({ error: saved.error || 'Could not place COD order' });
    }

    return res.status(201).json({
      success: true,
      order: saved.order,
    });
  } catch (err: any) {
    console.error('COD order error:', err);
    return res.status(500).json({ error: 'Unable to record COD order. Please try again.' });
  }
});

// Verify Razorpay Payment Signature & Idempotently Confirm Order
app.post('/api/verify-payment', async (req: Request, res: Response) => {
  try {
    const order_id = req.body.order_id || req.body.razorpay_order_id;
    const payment_id = req.body.payment_id || req.body.razorpay_payment_id;
    const signature = req.body.signature || req.body.razorpay_signature;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order_id, payment_id, and signature are required',
      });
    }

    const { key_secret } = getRazorpayCredentials();
    if (!key_secret) {
      return res.status(503).json({
        success: false,
        error: 'Server configuration error: RAZORPAY_KEY_SECRET is not configured',
      });
    }

    const body = `${order_id}|${payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', key_secret).update(body).digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const signatureBuffer = Buffer.from(String(signature), 'utf-8');
    const isSignatureValid =
      expectedBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid signature',
      });
    }

    const updated = await markRazorpayOrderPaid(String(order_id), String(payment_id));
    return res.status(200).json({
      success: true,
      message: 'Payment verified and recorded successfully',
      store_order_id: updated.order?.orderId || order_id,
      order_id,
      payment_id,
      order: updated.order || null,
    });
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid signature verification data',
    });
  }
});

// Razorpay Webhook with Idempotency
app.post('/api/webhooks/razorpay', async (req: any, res: Response) => {
  try {
    const { webhook_secret } = getRazorpayCredentials();
    if (!webhook_secret) {
      return res.status(503).json({ error: 'Webhook secret not configured' });
    }
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac('sha256', webhook_secret).update(rawBody).digest('hex');

    const expBuf = Buffer.from(expectedSignature, 'utf-8');
    const sigBuf = Buffer.from(signature, 'utf-8');
    if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const eventType = req.body?.event;
    const eventId = String(req.headers['x-razorpay-event-id'] || `${eventType}_${req.body?.created_at || Date.now()}`);
    const paymentEntity = req.body?.payload?.payment?.entity;

    if (eventType === 'payment.captured' && paymentEntity?.order_id) {
      await markRazorpayOrderPaid(String(paymentEntity.order_id), String(paymentEntity.id || ''), eventId);
    } else if (eventType === 'payment.failed' && paymentEntity?.order_id) {
      await markRazorpayOrderFailed(String(paymentEntity.order_id), eventId);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Order Tracking (Requires Order ID + matching phone/email)
app.get('/api/orders/track', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const contact = String(req.query.contact || '');
  if (!orderId.trim() || !contact.trim()) {
    return res.status(400).json({ error: 'Please provide both Order ID and your registered mobile number or email.' });
  }
  const order = trackOrder(orderId, contact);
  if (!order) {
    return res.status(404).json({ error: 'No matching order found. Please verify your Order ID and mobile number/email.' });
  }
  return res.json({
    order: {
      orderId: order.orderId,
      customerName: order.customerName,
      shippingCity: order.shippingCity,
      shippingPincode: order.shippingPincode,
      items: order.items,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingFee: order.shippingFee,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
      customerNote: order.customerNote || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  });
});

app.post('/api/orders/action', async (req: Request, res: Response) => {
  const { orderId = '', contact = '', action = '', reason = '' } = req.body || {};
  if (!String(orderId).trim() || !String(contact).trim() || (action !== 'cancel' && action !== 'return')) {
    return res.status(400).json({ error: 'Valid Order ID, contact, and action (cancel/return) are required.' });
  }
  const result = await requestOrderAction({
    orderId: String(orderId),
    contact: String(contact),
    action,
    reason: String(reason),
  });
  if (!result.ok || !result.order) {
    return res.status(400).json({ error: result.error || 'Could not process order action.' });
  }
  return res.json({
    success: true,
    order: {
      orderId: result.order.orderId,
      customerName: result.order.customerName,
      shippingCity: result.order.shippingCity,
      shippingPincode: result.order.shippingPincode,
      items: result.order.items,
      subtotal: result.order.subtotal,
      discountAmount: result.order.discountAmount,
      shippingFee: result.order.shippingFee,
      grandTotal: result.order.grandTotal,
      paymentMethod: result.order.paymentMethod,
      paymentStatus: result.order.paymentStatus,
      fulfillmentStatus: result.order.fulfillmentStatus,
      trackingNumber: result.order.trackingNumber,
      courierName: result.order.courierName,
      customerNote: result.order.customerNote || '',
      createdAt: result.order.createdAt,
      updatedAt: result.order.updatedAt,
    },
  });
});

// Authenticated Customer Orders, Bookings & Workshop Registrations
app.get('/api/my-account-activity', requireAuth, (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  return res.json({
    orders: getOrdersForUser(uid),
    bookings: getBookingsForUser(uid),
    workshopRegistrations: getWorkshopRegistrationsForUser(uid),
  });
});

// Consultation Bookings
app.post('/api/bookings', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId, customerName, customerPhone, customerEmail = '', preferredDate, preferredSlot, notes = '' } =
      req.body || {};
    if (
      !serviceId ||
      !String(customerName || '').trim() ||
      String(customerPhone || '').replace(/\D/g, '').length < 10 ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(preferredDate || '')) ||
      !String(preferredSlot || '').trim()
    ) {
      return res.status(400).json({
        error: 'Please select a service, valid date, time slot, full name, and 10-digit mobile number.',
      });
    }

    const result = await createConsultationBooking({
      userId: req.user?.uid || '',
      serviceId: String(serviceId),
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      customerEmail: String(customerEmail),
      preferredDate: String(preferredDate),
      preferredSlot: String(preferredSlot),
      notes: String(notes),
    });

    if (!result.ok) {
      return res.status(409).json({ error: result.error });
    }
    return res.status(201).json({ success: true, booking: result.booking });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Unable to save consultation booking' });
  }
});

// Workshop Registrations
app.post('/api/workshops/register', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId, participantName, participantPhone, participantEmail = '', seats = 1 } = req.body || {};
    if (
      !workshopId ||
      !String(participantName || '').trim() ||
      String(participantPhone || '').replace(/\D/g, '').length < 10
    ) {
      return res.status(400).json({
        error: 'Please enter participant name, 10-digit mobile number, and select a workshop.',
      });
    }

    const result = await registerWorkshopSeat({
      userId: req.user?.uid || '',
      workshopId: String(workshopId),
      participantName: String(participantName),
      participantPhone: String(participantPhone),
      participantEmail: String(participantEmail),
      seats: Number(seats) || 1,
    });

    if (!result.ok) {
      return res.status(409).json({ error: result.error });
    }
    return res.status(201).json({
      success: true,
      registration: result.registration,
      workshop: result.workshop,
    });
  } catch (err) {
    console.error('Workshop registration error:', err);
    return res.status(500).json({ error: 'Unable to register for workshop' });
  }
});

// Newsletter Opt-In Subscription
app.post('/api/newsletter', async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const consent = req.body?.consent !== false;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!consent) {
    return res.status(400).json({ error: 'Please confirm subscription consent.' });
  }
  const result = await subscribeNewsletter(email, String(req.body?.source || 'footer'));
  return res.status(201).json({
    success: true,
    alreadySubscribed: result.alreadySubscribed,
    message: result.alreadySubscribed
      ? 'This email is already subscribed to ShivAmrit Healers updates.'
      : 'Thank you for subscribing to ShivAmrit Healers sacred updates.',
  });
});

app.post('/api/newsletter/unsubscribe', async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address to unsubscribe.' });
  }
  const result = await unsubscribeNewsletter(email);
  return res.json({
    success: true,
    removed: result.removed,
    message: result.removed
      ? 'You have been unsubscribed from ShivAmrit Healers newsletter updates.'
      : 'This email address is already unsubscribed.',
  });
});

// Verified Product Reviews
app.get('/api/reviews', (req: Request, res: Response) => {
  const productId = req.query.productId ? String(req.query.productId) : undefined;
  return res.json({ reviews: getApprovedReviews(productId) });
});

app.post('/api/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  const { productId, rating, comment } = req.body || {};
  if (!productId || !String(comment || '').trim() || String(comment).trim().length < 5) {
    return res.status(400).json({ error: 'Please provide a product ID and a review comment (min 5 characters).' });
  }
  const review = await submitProductReview({
    productId: String(productId),
    userId: req.user!.uid,
    authorName: req.user!.name || req.user!.email?.split('@')[0] || 'ShivAmrit Member',
    rating: Number(rating) || 5,
    comment: String(comment),
  });
  return res.status(201).json({
    success: true,
    review,
    message: review.approved
      ? 'Verified buyer review published!'
      : 'Thank you! Your review has been submitted for moderation.',
  });
});

// Admin RBAC Routes
app.get('/api/admin/overview', requireAuth, requireAdmin, (_req: AuthRequest, res: Response) => {
  return res.json(getAdminOverview());
});

app.patch('/api/admin/orders/:orderId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const updated = await adminUpdateOrder(
    String(req.params.orderId),
    req.body || {},
    { uid: req.user!.uid, email: req.user!.email || '' }
  );
  if (!updated) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json({ success: true, order: updated });
});

app.post('/api/admin/products', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const result = await adminCreateProduct(req.body || {}, {
    uid: req.user!.uid,
    email: req.user!.email || '',
  });
  if (!result.ok || !result.product) {
    return res.status(400).json({ error: result.error || 'Could not create product' });
  }
  return res.status(201).json({ success: true, product: result.product });
});

app.patch('/api/admin/products/:productId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const updated = await adminUpdateProduct(
    String(req.params.productId),
    req.body || {},
    { uid: req.user!.uid, email: req.user!.email || '' }
  );
  if (!updated) {
    return res.status(404).json({ error: 'Product not found' });
  }
  return res.json({ success: true, product: updated });
});

app.patch('/api/admin/reviews/:reviewId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const approved = Boolean(req.body?.approved);
  const updated = await adminModerateReview(
    String(req.params.reviewId),
    approved,
    { uid: req.user!.uid, email: req.user!.email || '' }
  );
  if (!updated) {
    return res.status(404).json({ error: 'Review not found' });
  }
  return res.json({ success: true, review: updated });
});

app.patch('/api/admin/leads/:leadId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const status = String(req.body?.status || '') as 'new' | 'contacted' | 'converted';
  const updated = await adminUpdateLeadStatus(String(req.params.leadId), status, {
    uid: req.user!.uid,
    email: req.user!.email || '',
  });
  if (!updated) {
    return res.status(400).json({ error: 'Lead not found or invalid status (new, contacted, converted).' });
  }
  return res.json({ success: true, lead: updated });
});

app.get('/api/admin/backup', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const snapshot = exportStoreBackupSnapshot({
    uid: req.user!.uid,
    email: req.user!.email || '',
  });
  return res.json(snapshot);
});

app.patch('/api/admin/outbox/:messageId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const updated = await adminMarkOutboxDispatched(String(req.params.messageId), {
    uid: req.user!.uid,
    email: req.user!.email || '',
  });
  if (!updated) {
    return res.status(404).json({ error: 'Outbox message not found.' });
  }
  return res.json({ success: true, message: updated });
});

app.patch('/api/admin/cart-recovery/:recoveryId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const updated = await adminDismissCartRecovery(String(req.params.recoveryId), {
    uid: req.user!.uid,
    email: req.user!.email || '',
  });
  if (!updated) {
    return res.status(404).json({ error: 'Cart recovery entry not found.' });
  }
  return res.json({ success: true, recovery: updated });
});

// Phase 7: Consent-Aware Abandoned Cart Recovery Opt-In
app.post('/api/cart-recovery', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerName = '',
      customerPhone = '',
      customerEmail = '',
      items = [],
      consent = false,
    } = req.body || {};

    const result = await recordCartRecoveryOptIn({
      userId: req.user?.uid || '',
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      customerEmail: String(customerEmail),
      items: Array.isArray(items) ? items : [],
      consent: consent === true,
    });

    if (!result.ok || !result.recovery) {
      return res.status(400).json({ error: result.error || 'Could not save cart reminder.' });
    }
    return res.status(201).json({
      success: true,
      recovery: result.recovery,
      message: 'Your sacred cart reminder is saved. It will automatically pause once you place your order.',
    });
  } catch (err) {
    console.error('Cart recovery error:', err);
    return res.status(500).json({ error: 'Unable to save cart reminder right now.' });
  }
});

// Hero Lead Inquiries (persisted + optional webhook + WhatsApp deep link)
app.post('/api/leads', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const check = validateLeadInquiry(req.body || {});
    if (!check.valid || !check.normalized) {
      return res.status(400).json({ error: check.error || 'Invalid inquiry details.' });
    }
    const { lead, webhookSynced } = await createLeadInquiry({
      userId: req.user?.uid || '',
      ...check.normalized,
    });
    const whatsappUrl = buildWhatsAppInquiryUrl({
      leadId: lead.leadId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      interest: lead.interest,
      message: lead.message,
    });

    return res.status(201).json({
      success: true,
      lead,
      webhookSynced,
      whatsappUrl,
      message: webhookSynced
        ? 'Inquiry saved and synced to your Google Sheet! Send it via WhatsApp below.'
        : 'Inquiry saved! Click below to send directly to Grandmaster Parul on WhatsApp.',
    });
  } catch (err) {
    console.error('Lead inquiry error:', err);
    return res.status(500).json({ error: 'Unable to record inquiry right now. Please try again.' });
  }
});

app.post('/api/admin/leads/mark-synced', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const leadIds = Array.isArray(req.body?.leadIds)
    ? req.body.leadIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
    : [];
  if (leadIds.length === 0) {
    return res.status(400).json({ error: 'Provide leadIds to mark as synced.' });
  }
  const updatedCount = await markLeadsSheetSynced(leadIds, {
    uid: req.user!.uid,
    email: req.user!.email || '',
  });
  return res.json({ success: true, updatedCount });
});

// Vite Dev Middleware or Production Static Serving
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShivAmrit Healers server listening on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer();
