import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shivamrit-qa-'));
process.env.SHIVAMRIT_DB_FILE = path.join(tempDir, 'test-store.json');

import {
  getCatalogMap,
  createCodOrder,
  trackOrder,
  requestOrderAction,
  createConsultationBooking,
  registerWorkshopSeat,
  createLeadInquiry,
  adminUpdateLeadStatus,
  markLeadsSheetSynced,
  adminCreateProduct,
  getAdminOverview,
  exportStoreBackupSnapshot,
  recordCartRecoveryOptIn,
  adminMarkOutboxDispatched,
  adminDismissCartRecovery,
} from './storeDb.ts';
import { calculateServerOrderTotals } from '../utils/storeLogic.ts';

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('COD order deducts stock atomically, verifies contact on track, and restores stock on cancel', async () => {
  const catalog = getCatalogMap();
  const initialStock = catalog['aries-bracelet'].inventory;
  const calc = calculateServerOrderTotals(
    [
      { id: 'aries-bracelet', qty: 1 },
      { id: 'energy-booster-bath-salt', qty: 1 },
    ],
    'FIRST10',
    catalog
  );

  assert.equal(calc.valid, true);
  assert.equal(calc.subtotal, 999);
  assert.equal(calc.shippingFee, 0);
  assert.equal(calc.discountAmount, 100);
  assert.equal(calc.grandTotal, 899);

  const created = await createCodOrder({
    orderId: 'SH-COD-TEST-101',
    userId: 'user_test_1',
    customerName: 'Aarav Patel',
    customerPhone: '9876543210',
    customerEmail: 'aarav@example.com',
    shippingStreet: '12 Sacred Lane',
    shippingCity: 'Surat',
    shippingPincode: '395001',
    items: calc.items,
    subtotal: calc.subtotal,
    discountAmount: calc.discountAmount,
    couponCode: 'FIRST10',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(created.ok, true);
  assert.equal(getCatalogMap()['aries-bracelet'].inventory, initialStock - 1);

  // Security check: mismatched contact must not expose order
  assert.equal(trackOrder('SH-COD-TEST-101', '9999999999'), null);
  assert.ok(trackOrder('SH-COD-TEST-101', '9876543210'));

  // Cancel restores stock cleanly
  const cancelled = await requestOrderAction({
    orderId: 'SH-COD-TEST-101',
    contact: 'aarav@example.com',
    action: 'cancel',
    reason: 'Testing stock restoration',
  });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.order?.fulfillmentStatus, 'cancelled');
  assert.equal(getCatalogMap()['aries-bracelet'].inventory, initialStock);
});

test('consultation booking rejects double-booking for same service, date, and slot', async () => {
  const first = await createConsultationBooking({
    userId: 'u1',
    serviceId: 'reiki-healing',
    customerName: 'Meera Nair',
    customerPhone: '9876500001',
    customerEmail: 'meera@example.com',
    preferredDate: '2026-12-20',
    preferredSlot: '10:30 AM IST',
    notes: 'Focus on sleep calmness',
  });
  assert.equal(first.ok, true);

  const duplicate = await createConsultationBooking({
    userId: 'u2',
    serviceId: 'reiki-healing',
    customerName: 'Rohan Joshi',
    customerPhone: '9876500002',
    customerEmail: 'rohan@example.com',
    preferredDate: '2026-12-20',
    preferredSlot: '10:30 AM IST',
    notes: '',
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error || '', /already booked/i);
});

test('workshop seat registration enforces available capacity', async () => {
  const tooMany = await registerWorkshopSeat({
    userId: 'u3',
    workshopId: 'reiki-level-1-workshop',
    participantName: 'Kavita Shah',
    participantPhone: '9876500003',
    participantEmail: 'kavita@example.com',
    seats: 99,
  });
  assert.equal(tooMany.ok, false);

  const ok = await registerWorkshopSeat({
    userId: 'u3',
    workshopId: 'reiki-level-1-workshop',
    participantName: 'Kavita Shah',
    participantPhone: '9876500003',
    participantEmail: 'kavita@example.com',
    seats: 2,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.registration?.amount, 2998);
});

test('hero leads, admin product CRUD, analytics & JSON backup snapshot work end-to-end', async () => {
  const actor = { uid: 'admin_1', email: 'vinayakacdemy@gmail.com' };

  const createdLead = await createLeadInquiry({
    name: 'Diya Kapoor',
    phone: '9811122233',
    email: 'diya@example.com',
    interest: 'Reiki, Astrology & Tarot Consultation',
    message: 'Sunday evening slot preferred',
    sourceSlide: 'consultations',
  });
  assert.match(createdLead.lead.leadId, /^SH-LEAD-/);
  assert.equal(createdLead.lead.status, 'new');

  const updatedLead = await adminUpdateLeadStatus(createdLead.lead.leadId, 'converted', actor);
  assert.equal(updatedLead?.status, 'converted');

  const synced = await markLeadsSheetSynced([createdLead.lead.leadId], actor);
  assert.equal(synced, 1);

  const newSku = await adminCreateProduct(
    {
      name: 'Consecrated Green Aventurine Pocket Stone',
      category: 'Crystals',
      price: 399,
      inventory: 18,
    },
    actor
  );
  assert.equal(newSku.ok, true);
  assert.equal(newSku.product?.id, 'consecrated-green-aventurine-pocket-stone');

  const overview = getAdminOverview();
  assert.equal(overview.analytics.leadConversion.conversionRatePercent, 100);
  assert.ok(overview.auditLogs.length >= 3);

  const backup = exportStoreBackupSnapshot(actor);
  assert.equal(backup.schemaVersion, '1.0');
  assert.ok(backup.data.products['consecrated-green-aventurine-pocket-stone']);
});

test('Phase 7 outbox queues confirmation templates and consent-aware cart recovery auto-suppresses on order', async () => {
  const actor = { uid: 'admin_1', email: 'vinayakacdemy@gmail.com' };

  // 1. Cart recovery without explicit consent must be rejected
  const denied = await recordCartRecoveryOptIn({
    customerName: 'Neha Verma',
    customerPhone: '9822001122',
    items: [{ id: 'taurus-bracelet', qty: 1 }],
    consent: false,
  });
  assert.equal(denied.ok, false);

  // 2. Cart recovery with explicit consent saves with server-calculated subtotal
  const optedIn = await recordCartRecoveryOptIn({
    customerName: 'Neha Verma',
    customerPhone: '9822001122',
    customerEmail: 'neha@example.com',
    items: [{ id: 'taurus-bracelet', qty: 1 }],
    consent: true,
  });
  assert.equal(optedIn.ok, true);
  assert.equal(optedIn.recovery?.status, 'active');
  assert.equal(optedIn.recovery?.estimatedSubtotal, 799);

  // 3. Placing an order with matching contact automatically suppresses cart recovery and enqueues outbox email
  const catalog = getCatalogMap();
  const calc = calculateServerOrderTotals([{ id: 'taurus-bracelet', qty: 1 }], '', catalog);
  assert.equal(calc.valid, true);

  const ord = await createCodOrder({
    orderId: 'SH-COD-P7-202',
    userId: '',
    customerName: 'Neha Verma',
    customerPhone: '9822001122',
    customerEmail: 'neha@example.com',
    shippingStreet: '45 Temple View',
    shippingCity: 'Jaipur',
    shippingPincode: '302001',
    items: calc.items,
    subtotal: calc.subtotal,
    discountAmount: calc.discountAmount,
    couponCode: '',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert.equal(ord.ok, true);

  const overview = getAdminOverview();
  const suppressed = overview.cartRecovery.find((r) => r.recoveryId === optedIn.recovery?.recoveryId);
  assert.equal(suppressed?.status, 'suppressed_ordered');

  const ordMsg = overview.outbox.find((m) => m.relatedId === 'SH-COD-P7-202');
  assert.equal(ordMsg?.status, 'queued');
  assert.match(ordMsg?.body || '', /Taurus/i);

  // Admin dispatch & second opt-in dismiss check
  const dispatched = await adminMarkOutboxDispatched(ordMsg!.messageId, actor);
  assert.equal(dispatched?.status, 'dispatched');

  const secondOptIn = await recordCartRecoveryOptIn({
    customerName: 'Vikram Singh',
    customerPhone: '9833004455',
    items: [{ id: 'pyrite-bracelet', qty: 1 }],
    consent: true,
  });
  assert.equal(secondOptIn.ok, true);
  const dismissed = await adminDismissCartRecovery(secondOptIn.recovery!.recoveryId, actor);
  assert.equal(dismissed?.status, 'dismissed');
});

