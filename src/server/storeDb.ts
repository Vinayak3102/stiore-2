import fs from 'fs';
import path from 'path';
import { adminDb } from '../lib/firebase-admin.ts';
import {
  INITIAL_AUTHORITATIVE_PRODUCTS,
  INITIAL_WORKSHOPS,
  CONSULTATION_SERVICES,
  type WorkshopItem,
} from '../data/catalogManifest.ts';
import type { AuthoritativeProductRecord, ValidatedOrderLine } from '../utils/storeLogic.ts';
import { getCustomerOrderActionEligibility } from '../utils/storeLogic.ts';

export type PaymentMethod = 'razorpay' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cod_pending' | 'refunded';
export type FulfillmentStatus =
  | 'pending_payment'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface PersistentOrder {
  orderId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingStreet: string;
  shippingCity: string;
  shippingPincode: string;
  items: ValidatedOrderLine[];
  subtotal: number;
  discountAmount: number;
  couponCode: string;
  shippingFee: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  trackingNumber: string;
  courierName: string;
  stockDeducted: boolean;
  customerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentBooking {
  bookingId: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  preferredDate: string;
  preferredSlot: string;
  notes: string;
  fee: number;
  bookingStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PersistentWorkshopRegistration {
  registrationId: string;
  userId: string;
  workshopId: string;
  workshopTitle: string;
  participantName: string;
  participantPhone: string;
  participantEmail: string;
  seats: number;
  amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface PersistentNewsletterSubscriber {
  id: string;
  email: string;
  consent: boolean;
  source: string;
  createdAt: string;
}

export interface PersistentReview {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  approved: boolean;
  createdAt: string;
}

export interface PersistentLead {
  leadId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  interest: string;
  message: string;
  sourceSlide: string;
  status: 'new' | 'contacted' | 'converted';
  sheetSynced: boolean;
  sheetSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentAuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface PersistentOutboxMessage {
  messageId: string;
  eventType: 'order_confirmed' | 'booking_confirmed' | 'workshop_confirmed';
  relatedId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  subject: string;
  body: string;
  status: 'queued' | 'dispatched';
  createdAt: string;
  dispatchedAt: string;
  dispatchedBy: string;
}

export interface PersistentCartRecovery {
  recoveryId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: { productId: string; name: string; unitPrice: number; qty: number }[];
  estimatedSubtotal: number;
  consent: boolean;
  status: 'active' | 'suppressed_ordered' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

interface IsolatedStoreSnapshot {
  products: Record<string, AuthoritativeProductRecord>;
  workshops: Record<string, WorkshopItem>;
  orders: Record<string, PersistentOrder>;
  processedWebhookEvents: Record<string, string>;
  bookings: Record<string, PersistentBooking>;
  workshopRegistrations: Record<string, PersistentWorkshopRegistration>;
  newsletterSubscribers: Record<string, PersistentNewsletterSubscriber>;
  reviews: Record<string, PersistentReview>;
  leads: Record<string, PersistentLead>;
  auditLogs: PersistentAuditLog[];
  emailOutbox: Record<string, PersistentOutboxMessage>;
  cartRecovery: Record<string, PersistentCartRecovery>;
}

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), '.data');
const getDbFile = () => {
  if (process.env.SHIVAMRIT_DB_FILE) {
    return path.resolve(process.env.SHIVAMRIT_DB_FILE);
  }
  return path.join(DEFAULT_DATA_DIR, 'shivamrit-isolated-db.json');
};

function buildInitialSnapshot(): IsolatedStoreSnapshot {
  const products: Record<string, AuthoritativeProductRecord> = {};
  for (const prod of INITIAL_AUTHORITATIVE_PRODUCTS) {
    products[prod.id] = { ...prod };
  }
  const workshops: Record<string, WorkshopItem> = {};
  for (const ws of INITIAL_WORKSHOPS) {
    workshops[ws.id] = { ...ws };
  }
  return {
    products,
    workshops,
    orders: {},
    processedWebhookEvents: {},
    bookings: {},
    workshopRegistrations: {},
    newsletterSubscribers: {},
    reviews: {},
    leads: {},
    auditLogs: [],
    emailOutbox: {},
    cartRecovery: {},
  };
}

function loadSnapshot(): IsolatedStoreSnapshot {
  const dbFile = getDbFile();
  try {
    if (!fs.existsSync(dbFile)) {
      const init = buildInitialSnapshot();
      saveSnapshot(init);
      return init;
    }
    const raw = fs.readFileSync(dbFile, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<IsolatedStoreSnapshot>;
    const defaults = buildInitialSnapshot();

    // Ensure any newly added catalog products exist with up-to-date authoritative pricing
    const mergedProducts: Record<string, AuthoritativeProductRecord> = {
      ...defaults.products,
      ...(parsed.products || {}),
    };
    for (const defProd of INITIAL_AUTHORITATIVE_PRODUCTS) {
      if (mergedProducts[defProd.id]) {
        mergedProducts[defProd.id].price = defProd.price;
        mergedProducts[defProd.id].compareAtPrice = defProd.compareAtPrice;
        mergedProducts[defProd.id].name = defProd.name;
        mergedProducts[defProd.id].category = defProd.category;
      }
    }

    return {
      products: mergedProducts,
      workshops: { ...defaults.workshops, ...(parsed.workshops || {}) },
      orders: parsed.orders || {},
      processedWebhookEvents: parsed.processedWebhookEvents || {},
      bookings: parsed.bookings || {},
      workshopRegistrations: parsed.workshopRegistrations || {},
      newsletterSubscribers: parsed.newsletterSubscribers || {},
      reviews: parsed.reviews || {},
      leads: parsed.leads || {},
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      emailOutbox: parsed.emailOutbox || {},
      cartRecovery: parsed.cartRecovery || {},
    };
  } catch {
    const init = buildInitialSnapshot();
    saveSnapshot(init);
    return init;
  }
}

function saveSnapshot(snapshot: IsolatedStoreSnapshot): void {
  const dbFile = getDbFile();
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpFile = `${dbFile}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(snapshot, null, 2), 'utf-8');
  fs.renameSync(tmpFile, dbFile);
}

// Best-effort sync to isolated Firestore DB (when server ADC credentials are active)
async function mirrorToFirestore(collection: string, docId: string, data: Record<string, any>) {
  try {
    await adminDb.collection(collection).doc(docId).set(data, { merge: true });
  } catch {
    // Local isolated store remains authoritative when container ADC is unavailable
  }
}

export function getCatalogMap(): Record<string, AuthoritativeProductRecord> {
  return loadSnapshot().products;
}

export function getAllProducts(): AuthoritativeProductRecord[] {
  return Object.values(loadSnapshot().products);
}

export function getWorkshops(): WorkshopItem[] {
  return Object.values(loadSnapshot().workshops);
}

export function getConsultationServices() {
  return CONSULTATION_SERVICES;
}

export async function createPendingOrder(order: PersistentOrder): Promise<PersistentOrder> {
  const db = loadSnapshot();
  db.orders[order.orderId] = order;
  saveSnapshot(db);

  const { items, ...orderDoc } = order;
  await mirrorToFirestore('orders', order.orderId, orderDoc);
  for (const item of items) {
    await mirrorToFirestore(`orders/${order.orderId}/items`, item.productId, {
      orderId: order.orderId,
      userId: order.userId,
      ...item,
    });
  }
  return order;
}

function normalizePhoneDigits(phone: string): string {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function suppressMatchingCartRecoveriesInDb(
  db: IsolatedStoreSnapshot,
  contact: { userId?: string; phone?: string; email?: string }
): void {
  const cleanEmail = String(contact.email || '').trim().toLowerCase();
  const cleanDigits = normalizePhoneDigits(contact.phone || '');
  const cleanUid = String(contact.userId || '').trim();
  const now = new Date().toISOString();

  for (const key of Object.keys(db.cartRecovery || {})) {
    const rec = db.cartRecovery[key];
    if (!rec || rec.status !== 'active') continue;
    const recDigits = normalizePhoneDigits(rec.customerPhone);
    const recEmail = String(rec.customerEmail || '').trim().toLowerCase();
    const matched =
      (cleanUid && rec.userId && rec.userId === cleanUid) ||
      (cleanDigits.length >= 10 && recDigits === cleanDigits) ||
      (cleanEmail && cleanEmail.includes('@') && recEmail === cleanEmail);
    if (matched) {
      rec.status = 'suppressed_ordered';
      rec.updatedAt = now;
      db.cartRecovery[key] = rec;
    }
  }
}

function enqueueOrderOutboxInDb(db: IsolatedStoreSnapshot, order: PersistentOrder): void {
  const existing = Object.values(db.emailOutbox || {}).some(
    (m) => m.eventType === 'order_confirmed' && m.relatedId === order.orderId
  );
  if (existing) return;

  const now = new Date().toISOString();
  const messageId = `MSG-ORD-${order.orderId}`;
  const lineSummary = order.items
    .map((item) => `• ${item.name} × ${item.qty} = ₹${item.lineTotal.toLocaleString('en-IN')}`)
    .join('\n');

  db.emailOutbox[messageId] = {
    messageId,
    eventType: 'order_confirmed',
    relatedId: order.orderId,
    recipientName: order.customerName,
    recipientEmail: order.customerEmail,
    recipientPhone: order.customerPhone,
    subject: `ShivAmrit Healers Order Confirmed — ${order.orderId}`,
    body: [
      `Namaste ${order.customerName},`,
      '',
      `Your consecrated order ${order.orderId} has been recorded (${order.paymentMethod.toUpperCase()} · ${order.paymentStatus}).`,
      '',
      'Items:',
      lineSummary,
      '',
      `Total Payable: ₹${order.grandTotal.toLocaleString('en-IN')}`,
      `Shipping to: ${order.shippingStreet}, ${order.shippingCity} - ${order.shippingPincode}`,
      '',
      'Each piece undergoes Vedic Prana Pratishtha energization before dispatch. Use your Order ID & phone/email in Track Order anytime.',
      '— ShivAmrit Healers (ALIGN • HEAL • EVOLVE)',
    ].join('\n'),
    status: 'queued',
    createdAt: now,
    dispatchedAt: '',
    dispatchedBy: '',
  };
}

export async function createCodOrder(order: PersistentOrder): Promise<{ ok: boolean; error?: string; order?: PersistentOrder }> {
  const db = loadSnapshot();
  // Verify and deduct inventory atomically
  for (const line of order.items) {
    const prod = db.products[line.productId];
    if (!prod || prod.inventory < line.qty) {
      return { ok: false, error: `Insufficient stock for ${line.name}` };
    }
  }
  for (const line of order.items) {
    db.products[line.productId].inventory = Math.max(0, db.products[line.productId].inventory - line.qty);
  }
  order.stockDeducted = true;
  db.orders[order.orderId] = order;
  enqueueOrderOutboxInDb(db, order);
  suppressMatchingCartRecoveriesInDb(db, {
    userId: order.userId,
    phone: order.customerPhone,
    email: order.customerEmail,
  });
  saveSnapshot(db);

  const { items, ...orderDoc } = order;
  await mirrorToFirestore('orders', order.orderId, orderDoc);
  for (const item of items) {
    await mirrorToFirestore(`orders/${order.orderId}/items`, item.productId, {
      orderId: order.orderId,
      userId: order.userId,
      ...item,
    });
  }
  return { ok: true, order };
}

export async function markRazorpayOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  webhookEventId?: string
): Promise<{ found: boolean; alreadyProcessed: boolean; order?: PersistentOrder }> {
  const db = loadSnapshot();

  if (webhookEventId && db.processedWebhookEvents[webhookEventId]) {
    const existingOrder = Object.values(db.orders).find((o) => o.razorpayOrderId === razorpayOrderId);
    return { found: !!existingOrder, alreadyProcessed: true, order: existingOrder };
  }

  const order = Object.values(db.orders).find((o) => o.razorpayOrderId === razorpayOrderId);
  if (!order) {
    return { found: false, alreadyProcessed: false };
  }

  if (order.paymentStatus === 'paid') {
    if (webhookEventId) {
      db.processedWebhookEvents[webhookEventId] = new Date().toISOString();
      saveSnapshot(db);
    }
    return { found: true, alreadyProcessed: true, order };
  }

  // Deduct stock idempotently once
  if (!order.stockDeducted) {
    for (const line of order.items) {
      const prod = db.products[line.productId];
      if (prod) {
        prod.inventory = Math.max(0, prod.inventory - line.qty);
      }
    }
    order.stockDeducted = true;
  }

  order.paymentStatus = 'paid';
  order.fulfillmentStatus = order.fulfillmentStatus === 'pending_payment' ? 'processing' : order.fulfillmentStatus;
  order.razorpayPaymentId = razorpayPaymentId;
  order.updatedAt = new Date().toISOString();

  if (webhookEventId) {
    db.processedWebhookEvents[webhookEventId] = order.updatedAt;
  }

  db.orders[order.orderId] = order;
  enqueueOrderOutboxInDb(db, order);
  suppressMatchingCartRecoveriesInDb(db, {
    userId: order.userId,
    phone: order.customerPhone,
    email: order.customerEmail,
  });
  saveSnapshot(db);

  const { items: _items, ...orderDoc } = order;
  await mirrorToFirestore('orders', order.orderId, orderDoc);
  return { found: true, alreadyProcessed: false, order };
}

export async function markRazorpayOrderFailed(
  razorpayOrderId: string,
  webhookEventId?: string
): Promise<PersistentOrder | undefined> {
  const db = loadSnapshot();
  if (webhookEventId && db.processedWebhookEvents[webhookEventId]) {
    return Object.values(db.orders).find((o) => o.razorpayOrderId === razorpayOrderId);
  }
  const order = Object.values(db.orders).find((o) => o.razorpayOrderId === razorpayOrderId);
  if (!order || order.paymentStatus === 'paid') {
    return order;
  }
  order.paymentStatus = 'failed';
  order.updatedAt = new Date().toISOString();
  if (webhookEventId) {
    db.processedWebhookEvents[webhookEventId] = order.updatedAt;
  }
  db.orders[order.orderId] = order;
  saveSnapshot(db);
  return order;
}

export function trackOrder(orderId: string, contact: string): PersistentOrder | null {
  const db = loadSnapshot();
  const normalizedId = orderId.trim().toUpperCase();
  const order = Object.values(db.orders).find(
    (o) =>
      o.orderId.toUpperCase() === normalizedId ||
      o.razorpayOrderId.toUpperCase() === normalizedId
  );
  if (!order) return null;

  const cleanContact = contact.trim().toLowerCase();
  const digitsContact = cleanContact.replace(/\D/g, '');
  const orderPhoneDigits = order.customerPhone.replace(/\D/g, '');
  const phoneMatch =
    digitsContact.length >= 4 &&
    (orderPhoneDigits === digitsContact || orderPhoneDigits.endsWith(digitsContact));
  const emailMatch = cleanContact.includes('@') && order.customerEmail.toLowerCase() === cleanContact;

  if (!phoneMatch && !emailMatch) {
    return null;
  }
  return order;
}

export function getOrdersForUser(userId: string): PersistentOrder[] {
  const db = loadSnapshot();
  return Object.values(db.orders)
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBookingsForUser(userId: string): PersistentBooking[] {
  const db = loadSnapshot();
  return Object.values(db.bookings)
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getWorkshopRegistrationsForUser(userId: string): PersistentWorkshopRegistration[] {
  const db = loadSnapshot();
  return Object.values(db.workshopRegistrations)
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createConsultationBooking(input: {
  userId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  preferredDate: string;
  preferredSlot: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string; booking?: PersistentBooking }> {
  const service = CONSULTATION_SERVICES.find((s) => s.id === input.serviceId);
  if (!service) {
    return { ok: false, error: 'Selected consultation service was not found.' };
  }
  const db = loadSnapshot();
  const conflict = Object.values(db.bookings).find(
    (b) =>
      b.serviceId === input.serviceId &&
      b.preferredDate === input.preferredDate &&
      b.preferredSlot === input.preferredSlot &&
      b.bookingStatus !== 'cancelled'
  );
  if (conflict) {
    return {
      ok: false,
      error: `The ${input.preferredSlot} slot on ${input.preferredDate} is already booked. Please choose another slot.`,
    };
  }
  const now = new Date().toISOString();
  const booking: PersistentBooking = {
    bookingId: `SH-BKG-${Math.floor(100000 + Math.random() * 900000)}`,
    userId: input.userId,
    serviceId: service.id,
    serviceName: service.name,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerEmail: input.customerEmail.trim().toLowerCase(),
    preferredDate: input.preferredDate,
    preferredSlot: input.preferredSlot,
    notes: input.notes.trim().slice(0, 500),
    fee: service.fee,
    bookingStatus: 'confirmed',
    createdAt: now,
    updatedAt: now,
  };
  db.bookings[booking.bookingId] = booking;
  const bookingMsgId = `MSG-BKG-${booking.bookingId}`;
  db.emailOutbox[bookingMsgId] = {
    messageId: bookingMsgId,
    eventType: 'booking_confirmed',
    relatedId: booking.bookingId,
    recipientName: booking.customerName,
    recipientEmail: booking.customerEmail,
    recipientPhone: booking.customerPhone,
    subject: `ShivAmrit Consultation Confirmed — ${booking.serviceName} (${booking.bookingId})`,
    body: [
      `Namaste ${booking.customerName},`,
      '',
      `Your 1-on-1 spiritual consultation slot is confirmed.`,
      `Booking ID: ${booking.bookingId}`,
      `Session: ${booking.serviceName}`,
      `Date & Time: ${booking.preferredDate} at ${booking.preferredSlot}`,
      `Session Fee: ₹${booking.fee.toLocaleString('en-IN')}`,
      booking.notes ? `Focus Notes: ${booking.notes}` : '',
      '',
      'Grandmaster Parul Suthar or our sanctuary coordinator will share the joining link 30 minutes prior to your session.',
      '— ShivAmrit Healers',
    ]
      .filter(Boolean)
      .join('\n'),
    status: 'queued',
    createdAt: now,
    dispatchedAt: '',
    dispatchedBy: '',
  };
  saveSnapshot(db);
  await mirrorToFirestore('bookings', booking.bookingId, booking);
  return { ok: true, booking };
}

export async function registerWorkshopSeat(input: {
  userId: string;
  workshopId: string;
  participantName: string;
  participantPhone: string;
  participantEmail: string;
  seats: number;
}): Promise<{ ok: boolean; error?: string; registration?: PersistentWorkshopRegistration; workshop?: WorkshopItem }> {
  const db = loadSnapshot();
  const workshop = db.workshops[input.workshopId];
  if (!workshop || !workshop.active) {
    return { ok: false, error: 'Workshop not found or inactive.' };
  }
  const requestedSeats = Math.floor(Number(input.seats));
  if (!Number.isFinite(requestedSeats) || requestedSeats < 1 || requestedSeats > 5) {
    return {
      ok: false,
      error: 'Please select between 1 and 5 seats per registration.',
    };
  }
  const seats = requestedSeats;
  if (workshop.seatsBooked + seats > workshop.totalSeats) {
    return {
      ok: false,
      error: `Only ${Math.max(0, workshop.totalSeats - workshop.seatsBooked)} seats remaining for this workshop.`,
    };
  }
  workshop.seatsBooked += seats;
  const now = new Date().toISOString();
  const registration: PersistentWorkshopRegistration = {
    registrationId: `SH-WS-${Math.floor(100000 + Math.random() * 900000)}`,
    userId: input.userId,
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    participantName: input.participantName.trim(),
    participantPhone: input.participantPhone.trim(),
    participantEmail: input.participantEmail.trim().toLowerCase(),
    seats,
    amount: workshop.fee * seats,
    status: 'confirmed',
    createdAt: now,
  };
  db.workshops[workshop.id] = workshop;
  db.workshopRegistrations[registration.registrationId] = registration;
  const wsMsgId = `MSG-WS-${registration.registrationId}`;
  db.emailOutbox[wsMsgId] = {
    messageId: wsMsgId,
    eventType: 'workshop_confirmed',
    relatedId: registration.registrationId,
    recipientName: registration.participantName,
    recipientEmail: registration.participantEmail,
    recipientPhone: registration.participantPhone,
    subject: `Workshop Seat Reserved — ${workshop.title} (${registration.registrationId})`,
    body: [
      `Namaste ${registration.participantName},`,
      '',
      `Your workshop registration is confirmed!`,
      `Registration ID: ${registration.registrationId}`,
      `Workshop: ${workshop.title}`,
      `Date & Time: ${workshop.dateLabel} · ${workshop.timeLabel}`,
      `Seats Reserved: ${seats} · Total Fee: ₹${registration.amount.toLocaleString('en-IN')}`,
      '',
      'Preparation notes and live session access details will be shared prior to commencement.',
      '— ShivAmrit Healers',
    ].join('\n'),
    status: 'queued',
    createdAt: now,
    dispatchedAt: '',
    dispatchedBy: '',
  };
  saveSnapshot(db);
  await mirrorToFirestore('workshops', workshop.id, workshop);
  await mirrorToFirestore('workshopRegistrations', registration.registrationId, registration);
  return { ok: true, registration, workshop };
}

export async function subscribeNewsletter(email: string, source = 'footer'): Promise<{ alreadySubscribed: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const db = loadSnapshot();
  const existing = db.newsletterSubscribers[cleanEmail];
  if (existing) {
    return { alreadySubscribed: true };
  }
  const entry: PersistentNewsletterSubscriber = {
    id: cleanEmail.replace(/[^a-z0-9]/g, '_'),
    email: cleanEmail,
    consent: true,
    source,
    createdAt: new Date().toISOString(),
  };
  db.newsletterSubscribers[cleanEmail] = entry;
  saveSnapshot(db);
  await mirrorToFirestore('newsletterSubscribers', entry.id, entry);
  return { alreadySubscribed: false };
}

export async function unsubscribeNewsletter(email: string): Promise<{ removed: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const db = loadSnapshot();
  const existing = db.newsletterSubscribers[cleanEmail];
  if (!existing) {
    return { removed: false };
  }
  const docId = existing.id || cleanEmail.replace(/[^a-z0-9]/g, '_');
  delete db.newsletterSubscribers[cleanEmail];
  saveSnapshot(db);
  try {
    await adminDb.collection('newsletterSubscribers').doc(docId).delete();
  } catch {
    // isolated file store remains authoritative
  }
  return { removed: true };
}

export function getApprovedReviews(productId?: string): PersistentReview[] {
  const db = loadSnapshot();
  return Object.values(db.reviews)
    .filter((r) => r.approved && (!productId || r.productId === productId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function submitProductReview(input: {
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<PersistentReview> {
  const db = loadSnapshot();
  const hasPurchased = Object.values(db.orders).some(
    (o) =>
      o.userId === input.userId &&
      (o.paymentStatus === 'paid' || o.fulfillmentStatus === 'delivered') &&
      o.items.some((i) => i.productId === input.productId)
  );
  const review: PersistentReview = {
    id: `rev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    productId: input.productId,
    userId: input.userId,
    authorName: input.authorName.trim(),
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: input.comment.trim().slice(0, 1000),
    verifiedPurchase: hasPurchased,
    approved: hasPurchased, // Verified buyers publish immediately; others await admin approval
    createdAt: new Date().toISOString(),
  };
  db.reviews[review.id] = review;
  saveSnapshot(db);
  await mirrorToFirestore('reviews', review.id, review);
  return review;
}

export function getAdminOverview() {
  const db = loadSnapshot();
  const orders = Object.values(db.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const bookings = Object.values(db.bookings).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const registrations = Object.values(db.workshopRegistrations).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const products = Object.values(db.products);
  const paidRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.grandTotal, 0);
  const codPendingTotal = orders
    .filter((o) => o.paymentStatus === 'cod_pending' && o.fulfillmentStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const reviews = Object.values(db.reviews).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const newsletterSubscribers = Object.values(db.newsletterSubscribers).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const leads = Object.values(db.leads || {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Analytics aggregations across active/non-cancelled orders, bookings & leads
  const activeOrders = orders.filter((o) => o.fulfillmentStatus !== 'cancelled');
  const categoryRevenueMap: Record<string, { category: string; revenue: number; units: number }> = {};
  const skuPerformanceMap: Record<string, { productId: string; name: string; revenue: number; units: number }> = {};

  for (const ord of activeOrders) {
    for (const line of ord.items || []) {
      const cat = line.category || 'Other';
      if (!categoryRevenueMap[cat]) {
        categoryRevenueMap[cat] = { category: cat, revenue: 0, units: 0 };
      }
      categoryRevenueMap[cat].revenue += Number(line.lineTotal || 0);
      categoryRevenueMap[cat].units += Number(line.qty || 0);

      if (!skuPerformanceMap[line.productId]) {
        skuPerformanceMap[line.productId] = {
          productId: line.productId,
          name: line.name,
          revenue: 0,
          units: 0,
        };
      }
      skuPerformanceMap[line.productId].revenue += Number(line.lineTotal || 0);
      skuPerformanceMap[line.productId].units += Number(line.qty || 0);
    }
  }

  const consultationRevenue = bookings
    .filter((b) => b.bookingStatus !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.fee || 0), 0);
  const workshopRevenue = registrations
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const convertedLeadsCount = leads.filter((l) => l.status === 'converted').length;
  const contactedLeadsCount = leads.filter((l) => l.status === 'contacted').length;
  const outbox = Object.values(db.emailOutbox || {}).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const cartRecovery = Object.values(db.cartRecovery || {}).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  return {
    metrics: {
      totalOrders: orders.length,
      paidOrders: orders.filter((o) => o.paymentStatus === 'paid').length,
      codOrders: orders.filter((o) => o.paymentMethod === 'cod').length,
      paidRevenue,
      codPendingTotal,
      lowStockCount: products.filter((p) => p.inventory <= 15).length,
      totalBookings: bookings.length,
      totalWorkshopRegistrations: registrations.length,
      newsletterSubscribersCount: newsletterSubscribers.length,
      pendingReviewsCount: reviews.filter((r) => !r.approved).length,
      totalLeads: leads.length,
      unsyncedLeadsCount: leads.filter((l) => !l.sheetSynced).length,
      queuedOutboxCount: outbox.filter((m) => m.status === 'queued').length,
      activeCartRecoveriesCount: cartRecovery.filter((c) => c.status === 'active').length,
    },
    analytics: {
      categoryRevenue: Object.values(categoryRevenueMap).sort((a, b) => b.revenue - a.revenue),
      topProducts: Object.values(skuPerformanceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      consultationRevenue,
      workshopRevenue,
      leadConversion: {
        total: leads.length,
        newCount: leads.filter((l) => l.status === 'new').length,
        contactedCount: contactedLeadsCount,
        convertedCount: convertedLeadsCount,
        conversionRatePercent:
          leads.length > 0 ? Math.round((convertedLeadsCount / leads.length) * 100) : 0,
      },
    },
    orders,
    products,
    bookings,
    workshops: Object.values(db.workshops),
    registrations,
    workshopRegistrations: registrations,
    newsletterSubscribers,
    reviews,
    leads,
    outbox,
    cartRecovery,
    auditLogs: db.auditLogs.slice(0, 50),
  };
}

export async function adminUpdateOrder(
  orderId: string,
  updates: {
    fulfillmentStatus?: FulfillmentStatus;
    trackingNumber?: string;
    courierName?: string;
  },
  actor: { uid: string; email: string }
): Promise<PersistentOrder | null> {
  const db = loadSnapshot();
  const order = db.orders[orderId];
  if (!order) return null;

  if (updates.fulfillmentStatus) order.fulfillmentStatus = updates.fulfillmentStatus;
  if (typeof updates.trackingNumber === 'string') order.trackingNumber = updates.trackingNumber.trim();
  if (typeof updates.courierName === 'string') order.courierName = updates.courierName.trim();
  order.updatedAt = new Date().toISOString();

  db.orders[orderId] = order;
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'UPDATE_ORDER',
    targetId: orderId,
    details: JSON.stringify(updates),
    createdAt: order.updatedAt,
  });
  saveSnapshot(db);
  return order;
}

export async function adminUpdateProduct(
  productId: string,
  updates: { price?: number; inventory?: number; active?: boolean },
  actor: { uid: string; email: string }
): Promise<AuthoritativeProductRecord | null> {
  const db = loadSnapshot();
  const product = db.products[productId];
  if (!product) return null;

  if (typeof updates.price === 'number' && updates.price >= 1) product.price = Math.round(updates.price);
  if (typeof updates.inventory === 'number' && updates.inventory >= 0) product.inventory = Math.floor(updates.inventory);
  if (typeof updates.active === 'boolean') product.active = updates.active;

  const now = new Date().toISOString();
  db.products[productId] = product;
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'UPDATE_PRODUCT',
    targetId: productId,
    details: JSON.stringify(updates),
    createdAt: now,
  });
  saveSnapshot(db);
  return product;
}

export async function adminModerateReview(
  reviewId: string,
  approved: boolean,
  actor: { uid: string; email: string }
): Promise<PersistentReview | null> {
  const db = loadSnapshot();
  const review = db.reviews[reviewId];
  if (!review) return null;

  review.approved = Boolean(approved);
  db.reviews[reviewId] = review;

  const now = new Date().toISOString();
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: approved ? 'APPROVE_REVIEW' : 'HIDE_REVIEW',
    targetId: reviewId,
    details: JSON.stringify({ productId: review.productId, approved }),
    createdAt: now,
  });
  saveSnapshot(db);
  await mirrorToFirestore('reviews', review.id, review);
  return review;
}

export async function requestOrderAction(input: {
  orderId: string;
  contact: string;
  action: 'cancel' | 'return';
  reason: string;
}): Promise<{ ok: boolean; error?: string; order?: PersistentOrder }> {
  const matched = trackOrder(input.orderId, input.contact);
  if (!matched) {
    return {
      ok: false,
      error: 'Order verification failed. Enter matching Order ID and registered phone/email.',
    };
  }

  const eligibility = getCustomerOrderActionEligibility(matched.fulfillmentStatus);
  if (input.action === 'cancel' && !eligibility.canCancel) {
    return {
      ok: false,
      error: `Cannot cancel order in "${matched.fulfillmentStatus}" status. Orders can only be cancelled before courier dispatch.`,
    };
  }
  if (input.action === 'return' && !eligibility.canRequestReturn) {
    return {
      ok: false,
      error: 'Return or refund requests can only be submitted after delivery.',
    };
  }

  const db = loadSnapshot();
  const order = db.orders[matched.orderId];
  if (!order) {
    return { ok: false, error: 'Order record not found.' };
  }

  const cleanReason = input.reason.trim().slice(0, 300) || (input.action === 'cancel' ? 'Customer requested cancellation' : 'Customer requested return/refund');
  const now = new Date().toISOString();

  if (input.action === 'cancel') {
    order.fulfillmentStatus = 'cancelled';
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    }
    if (order.stockDeducted) {
      for (const line of order.items) {
        if (db.products[line.productId]) {
          db.products[line.productId].inventory += line.qty;
        }
      }
      order.stockDeducted = false;
    }
    order.customerNote = `Cancelled: ${cleanReason}`;
  } else {
    order.fulfillmentStatus = 'returned';
    order.customerNote = `Return/Refund requested: ${cleanReason}`;
  }

  order.updatedAt = now;
  db.orders[order.orderId] = order;
  saveSnapshot(db);
  const { items: _items, ...orderDoc } = order;
  await mirrorToFirestore('orders', order.orderId, orderDoc);
  return { ok: true, order };
}

export async function createLeadInquiry(input: {
  userId?: string;
  name: string;
  phone: string;
  email: string;
  interest: string;
  message: string;
  sourceSlide: string;
}): Promise<{ lead: PersistentLead; webhookSynced: boolean }> {
  const now = new Date().toISOString();
  const leadId = `SH-LEAD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  let webhookSynced = false;
  const webhookUrl = (process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();
  if (webhookUrl && /^https:\/\//i.test(webhookUrl)) {
    try {
      const hookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          createdAt: now,
          name: input.name,
          phone: input.phone,
          email: input.email,
          interest: input.interest,
          message: input.message,
          sourceSlide: input.sourceSlide,
          status: 'New Inquiry',
        }),
      });
      webhookSynced = hookRes.ok;
    } catch {
      webhookSynced = false;
    }
  }

  const lead: PersistentLead = {
    leadId,
    userId: input.userId || '',
    name: input.name,
    phone: input.phone,
    email: input.email,
    interest: input.interest,
    message: input.message,
    sourceSlide: input.sourceSlide,
    status: 'new',
    sheetSynced: webhookSynced,
    sheetSyncedAt: webhookSynced ? now : '',
    createdAt: now,
    updatedAt: now,
  };

  const db = loadSnapshot();
  db.leads[lead.leadId] = lead;
  saveSnapshot(db);
  await mirrorToFirestore('leads', lead.leadId, lead);

  return { lead, webhookSynced };
}

export async function markLeadsSheetSynced(
  leadIds: string[],
  actor: { uid: string; email: string }
): Promise<number> {
  const db = loadSnapshot();
  const now = new Date().toISOString();
  let updatedCount = 0;

  for (const id of leadIds) {
    const lead = db.leads[id];
    if (!lead) continue;
    lead.sheetSynced = true;
    lead.sheetSyncedAt = now;
    lead.updatedAt = now;
    db.leads[id] = lead;
    updatedCount += 1;
    await mirrorToFirestore('leads', lead.leadId, lead);
  }

  if (updatedCount > 0) {
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'SYNC_LEADS_GOOGLE_SHEET',
      targetId: leadIds.slice(0, 5).join(','),
      details: JSON.stringify({ updatedCount }),
      createdAt: now,
    });
    saveSnapshot(db);
  }

  return updatedCount;
}

export async function adminCreateProduct(
  input: {
    id?: string;
    name: string;
    category: string;
    price: number;
    compareAtPrice?: number;
    inventory: number;
    active?: boolean;
  },
  actor: { uid: string; email: string }
): Promise<{ ok: boolean; error?: string; product?: AuthoritativeProductRecord }> {
  const cleanName = String(input.name || '').trim().slice(0, 180);
  const cleanCategory = String(input.category || '').trim().slice(0, 80);
  const price = Math.round(Number(input.price));
  const compareAtPrice = input.compareAtPrice
    ? Math.max(price, Math.round(Number(input.compareAtPrice)))
    : Math.round(price * 1.4);
  const inventory = Math.max(0, Math.floor(Number(input.inventory)));

  if (!cleanName || cleanName.length < 3) {
    return { ok: false, error: 'Product name must be at least 3 characters.' };
  }
  if (!cleanCategory) {
    return { ok: false, error: 'Product category is required.' };
  }
  if (!Number.isFinite(price) || price < 1 || price > 500000) {
    return { ok: false, error: 'Price must be between ₹1 and ₹5,00,000.' };
  }

  const slugBase = (input.id || cleanName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (!slugBase) {
    return { ok: false, error: 'Invalid product ID or name.' };
  }

  const db = loadSnapshot();
  if (db.products[slugBase]) {
    return { ok: false, error: `A product with ID "${slugBase}" already exists.` };
  }

  const now = new Date().toISOString();
  const product: AuthoritativeProductRecord = {
    id: slugBase,
    name: cleanName,
    category: cleanCategory,
    price,
    compareAtPrice,
    inventory,
    active: input.active !== false,
  };

  db.products[product.id] = product;
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'CREATE_PRODUCT',
    targetId: product.id,
    details: JSON.stringify({ name: product.name, category: product.category, price: product.price }),
    createdAt: now,
  });
  saveSnapshot(db);

  await mirrorToFirestore('products', product.id, {
    ...product,
    slug: product.id,
    stockStatus: product.inventory > 15 ? 'in' : product.inventory > 0 ? 'low' : 'out',
    updatedAt: now,
  });

  return { ok: true, product };
}

export async function adminUpdateLeadStatus(
  leadId: string,
  status: 'new' | 'contacted' | 'converted',
  actor: { uid: string; email: string }
): Promise<PersistentLead | null> {
  if (status !== 'new' && status !== 'contacted' && status !== 'converted') {
    return null;
  }
  const db = loadSnapshot();
  const lead = db.leads[leadId];
  if (!lead) return null;

  const now = new Date().toISOString();
  lead.status = status;
  lead.updatedAt = now;
  db.leads[leadId] = lead;

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'UPDATE_LEAD_STATUS',
    targetId: leadId,
    details: JSON.stringify({ status }),
    createdAt: now,
  });
  saveSnapshot(db);
  await mirrorToFirestore('leads', lead.leadId, lead);
  return lead;
}

export function exportStoreBackupSnapshot(actor: { uid: string; email: string }) {
  const db = loadSnapshot();
  const now = new Date().toISOString();
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'EXPORT_STORE_BACKUP',
    targetId: 'full_snapshot',
    details: JSON.stringify({
      orders: Object.keys(db.orders).length,
      products: Object.keys(db.products).length,
      leads: Object.keys(db.leads).length,
    }),
    createdAt: now,
  });
  saveSnapshot(db);
  return {
    exportedAt: now,
    exportedBy: actor.email || actor.uid,
    schemaVersion: '1.0',
    data: db,
  };
}

export async function recordCartRecoveryOptIn(input: {
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: { id: string; qty: number }[];
  consent: boolean;
}): Promise<{ ok: boolean; error?: string; recovery?: PersistentCartRecovery }> {
  if (input.consent !== true) {
    return {
      ok: false,
      error: 'Explicit opt-in consent is required before saving an abandoned cart reminder.',
    };
  }

  const cleanPhone = String(input.customerPhone || '').trim().slice(0, 20);
  const cleanDigits = normalizePhoneDigits(cleanPhone);
  const cleanEmail = String(input.customerEmail || '').trim().toLowerCase().slice(0, 160);
  const hasValidPhone = cleanDigits.length >= 10;
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  if (!hasValidPhone && !hasValidEmail) {
    return {
      ok: false,
      error: 'Please enter a valid 10-digit WhatsApp/mobile number or email address for the reminder.',
    };
  }

  const db = loadSnapshot();
  const normalizedItems: { productId: string; name: string; unitPrice: number; qty: number }[] = [];
  let estimatedSubtotal = 0;

  for (const rawItem of input.items || []) {
    const prod = db.products[String(rawItem?.id || '')];
    const qty = Math.max(1, Math.min(20, Math.floor(Number(rawItem?.qty || 1))));
    if (!prod || !prod.active) continue;
    normalizedItems.push({
      productId: prod.id,
      name: prod.name,
      unitPrice: prod.price,
      qty,
    });
    estimatedSubtotal += prod.price * qty;
  }

  if (normalizedItems.length === 0) {
    return {
      ok: false,
      error: 'Add at least one active product to your sacred cart before saving a reminder.',
    };
  }

  const contactKey = hasValidPhone ? cleanDigits : cleanEmail.replace(/[^a-z0-9]/g, '_');
  const recoveryId = `SH-CART-${contactKey}`;
  const now = new Date().toISOString();
  const existing = db.cartRecovery[recoveryId];

  const recovery: PersistentCartRecovery = {
    recoveryId,
    userId: String(input.userId || existing?.userId || '').trim(),
    customerName: String(input.customerName || existing?.customerName || 'Seeker').trim().slice(0, 120),
    customerPhone: cleanPhone,
    customerEmail: cleanEmail,
    items: normalizedItems,
    estimatedSubtotal,
    consent: true,
    status: 'active',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  db.cartRecovery[recoveryId] = recovery;
  saveSnapshot(db);
  return { ok: true, recovery };
}

export async function adminMarkOutboxDispatched(
  messageId: string,
  actor: { uid: string; email: string }
): Promise<PersistentOutboxMessage | null> {
  const db = loadSnapshot();
  const msg = db.emailOutbox[messageId];
  if (!msg) return null;

  const now = new Date().toISOString();
  msg.status = 'dispatched';
  msg.dispatchedAt = now;
  msg.dispatchedBy = actor.email || actor.uid;
  db.emailOutbox[messageId] = msg;

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'DISPATCH_OUTBOX_MESSAGE',
    targetId: messageId,
    details: JSON.stringify({ eventType: msg.eventType, relatedId: msg.relatedId }),
    createdAt: now,
  });
  saveSnapshot(db);
  return msg;
}

export async function adminDismissCartRecovery(
  recoveryId: string,
  actor: { uid: string; email: string }
): Promise<PersistentCartRecovery | null> {
  const db = loadSnapshot();
  const rec = db.cartRecovery[recoveryId];
  if (!rec) return null;

  const now = new Date().toISOString();
  rec.status = 'dismissed';
  rec.updatedAt = now;
  db.cartRecovery[recoveryId] = rec;

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'DISMISS_CART_RECOVERY',
    targetId: recoveryId,
    details: JSON.stringify({ status: rec.status }),
    createdAt: now,
  });
  saveSnapshot(db);
  return rec;
}




