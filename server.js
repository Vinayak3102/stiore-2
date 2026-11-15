import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const distPath = path.join(__dirname, 'dist');
const catalogPath = path.join(__dirname, 'public', 'api', 'catalog-data.json');
const dataDir = path.join(__dirname, '.data');
const ordersFile = path.join(dataDir, 'shivamrit-node-orders.json');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

function loadCatalog() {
  return JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
}

function loadOrders() {
  if (!fs.existsSync(ordersFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(ordersFile, 'utf-8'));
  } catch {
    return {};
  }
}

function saveOrders(orders) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${ordersFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2), 'utf-8');
  fs.renameSync(tmp, ordersFile);
}

function getRazorpayCredentials() {
  return {
    key_id: (process.env.RAZORPAY_KEY_ID || '').trim(),
    key_secret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
    webhook_secret: (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(),
  };
}

function calculateTotals(requestedItems = [], couponCode = '') {
  const catalog = loadCatalog();
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { valid: false, error: 'Order must contain at least one item' };
  }
  const agg = new Map();
  for (const line of requestedItems) {
    const id = typeof line?.id === 'string' ? line.id.trim() : '';
    const qty = Math.floor(Number(line?.qty));
    if (!id || !Number.isFinite(qty) || qty < 1 || qty > 50) {
      return { valid: false, error: 'Invalid product ID or quantity' };
    }
    agg.set(id, (agg.get(id) || 0) + qty);
  }
  const items = [];
  let subtotal = 0;
  for (const [id, qty] of agg.entries()) {
    const prod = catalog.products[id];
    if (!prod) return { valid: false, error: `Unknown product: ${id}` };
    const lineTotal = prod.price * qty;
    subtotal += lineTotal;
    items.push({ productId: id, name: prod.name, unitPrice: prod.price, qty, lineTotal });
  }
  const normCoupon = String(couponCode || '').trim().toUpperCase();
  const rule = catalog.coupons[normCoupon];
  let discountAmount = 0;
  let freeShip = false;
  let appliedCoupon = '';
  if (rule && subtotal >= (rule.minSubtotal || 0)) {
    appliedCoupon = normCoupon;
    if (rule.type === 'percent') discountAmount = Math.round((subtotal * rule.value) / 100);
    if (rule.type === 'freeship') freeShip = true;
  }
  const shippingFee = subtotal >= catalog.freeShippingThreshold || freeShip ? 0 : catalog.standardShipping;
  const grandTotal = Math.max(1, subtotal - discountAmount + shippingFee);
  return { valid: true, items, subtotal, discountAmount, couponCode: appliedCoupon, shippingFee, grandTotal };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ShivAmrit Healers Node Server', timestamp: new Date().toISOString() });
});

app.get('/api/payment-config', (_req, res) => {
  const { key_id, key_secret } = getRazorpayCredentials();
  const configured = Boolean(key_id && key_secret);
  res.json({
    configured,
    key_id: configured ? key_id : '',
    mode: key_id.startsWith('rzp_live_') ? 'live' : configured ? 'test' : 'unconfigured',
  });
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { items = [], couponCode = '', customer = {}, shippingAddress = {} } = req.body || {};
    const calc = calculateTotals(items, couponCode);
    if (!calc.valid) return res.status(400).json({ error: calc.error });

    const { key_id, key_secret } = getRazorpayCredentials();
    if (!key_id || !key_secret) {
      return res.status(503).json({ error: 'Razorpay credentials not configured on server' });
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const storeOrderId = `SH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const rzpOrder = await razorpay.orders.create({
      amount: calc.grandTotal * 100,
      currency: 'INR',
      receipt: `sh_rcpt_${Date.now()}`,
      notes: { store: 'ShivAmrit Healers', store_order_id: storeOrderId },
    });

    const orders = loadOrders();
    orders[storeOrderId] = {
      orderId: storeOrderId,
      customerName: String(customer.name || ''),
      customerPhone: String(customer.phone || ''),
      customerEmail: String(customer.email || ''),
      shippingStreet: String(shippingAddress.street || ''),
      shippingCity: String(shippingAddress.city || ''),
      shippingPincode: String(shippingAddress.pincode || ''),
      ...calc,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending_payment',
      razorpayOrderId: rzpOrder.id,
      razorpayPaymentId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveOrders(orders);

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
  } catch (err) {
    console.error('Order creation error:', err);
    return res.status(500).json({ error: err?.error?.description || err?.message || 'Order creation failed' });
  }
});

app.post('/api/create-cod-order', (req, res) => {
  const { items = [], couponCode = '', customer = {}, shippingAddress = {} } = req.body || {};
  const calc = calculateTotals(items, couponCode);
  if (!calc.valid) return res.status(400).json({ error: calc.error });

  const orderId = `SH-COD-${Math.floor(100000 + Math.random() * 900000)}`;
  const order = {
    orderId,
    customerName: String(customer.name || ''),
    customerPhone: String(customer.phone || ''),
    customerEmail: String(customer.email || ''),
    shippingStreet: String(shippingAddress.street || ''),
    shippingCity: String(shippingAddress.city || ''),
    shippingPincode: String(shippingAddress.pincode || ''),
    ...calc,
    paymentMethod: 'cod',
    paymentStatus: 'cod_pending',
    fulfillmentStatus: 'processing',
    razorpayOrderId: '',
    razorpayPaymentId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const orders = loadOrders();
  orders[orderId] = order;
  saveOrders(orders);
  return res.status(201).json({ success: true, order });
});

app.post('/api/verify-payment', (req, res) => {
  const order_id = req.body?.order_id || req.body?.razorpay_order_id;
  const payment_id = req.body?.payment_id || req.body?.razorpay_payment_id;
  const signature = req.body?.signature || req.body?.razorpay_signature;

  if (!order_id || !payment_id || !signature) {
    return res.status(400).json({ success: false, error: 'Missing required payment verification fields' });
  }
  const { key_secret } = getRazorpayCredentials();
  if (!key_secret) {
    return res.status(503).json({ success: false, error: 'Server payment secret not configured' });
  }

  const expected = crypto.createHmac('sha256', key_secret).update(`${order_id}|${payment_id}`).digest('hex');
  const valid =
    expected.length === String(signature).length &&
    crypto.timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(String(signature), 'utf-8'));

  if (!valid) {
    return res.status(400).json({ success: false, error: 'Payment verification failed: Invalid signature' });
  }

  const orders = loadOrders();
  let matchedOrder = null;
  for (const ord of Object.values(orders)) {
    if (ord.razorpayOrderId === order_id) {
      if (ord.paymentStatus !== 'paid') {
        ord.paymentStatus = 'paid';
        ord.fulfillmentStatus = 'processing';
        ord.razorpayPaymentId = payment_id;
        ord.updatedAt = new Date().toISOString();
        saveOrders(orders);
      }
      matchedOrder = ord;
      break;
    }
  }

  return res.status(200).json({
    success: true,
    store_order_id: matchedOrder?.orderId || order_id,
    order_id,
    payment_id,
    order: matchedOrder,
  });
});

app.post('/api/webhooks/razorpay', (req, res) => {
  const { webhook_secret } = getRazorpayCredentials();
  if (!webhook_secret) return res.status(503).json({ error: 'Webhook secret not configured' });

  const sig = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', webhook_secret).update(req.rawBody || '').digest('hex');
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }
  return res.status(200).json({ received: true });
});

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

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ShivAmrit Healers production server running on port ${PORT}`);
});
