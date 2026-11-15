import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCoupon,
  calculateServerOrderTotals,
  calculateCartSummary,
  filterAndSortProducts,
  getCustomerOrderActionEligibility,
  calculateBundleSummary,
  buildOrdersCsv,
  validateLeadInquiry,
  buildWhatsAppInquiryUrl,
  formatLeadSheetRow,
} from './storeLogic.ts';
import { INITIAL_AUTHORITATIVE_PRODUCTS } from '../data/catalogManifest.ts';

const catalogMap = Object.fromEntries(INITIAL_AUTHORITATIVE_PRODUCTS.map((p) => [p.id, p]));

test('Unified coupon rules apply FIRST10, SHIVAMRIT10, SHIVA10, BLISS15, and FREESHIP consistently', () => {
  assert.equal(validateCoupon('FIRST10', 1000).discountAmountInr, 100);
  assert.equal(validateCoupon('SHIVAMRIT10', 1000).discountAmountInr, 100);
  assert.equal(validateCoupon('SHIVA10', 1000).discountAmountInr, 100);

  const blissBelow = validateCoupon('BLISS15', 1500);
  assert.equal(blissBelow.valid, false);

  const blissAbove = validateCoupon('BLISS15', 2000);
  assert.equal(blissAbove.valid, true);
  assert.equal(blissAbove.discountAmountInr, 300);

  const freeShip = validateCoupon('FREESHIP', 599);
  assert.equal(freeShip.valid, true);
  assert.equal(freeShip.freeShipping, true);
});

test('Server-authoritative order calculation enforces catalog prices (₹599 single, ₹799 combo, ₹200 bath salt)', () => {
  const result = calculateServerOrderTotals(
    [
      { id: 'amethyst-bracelet', qty: 1 }, // 599
      { id: 'aries-bracelet', qty: 1 }, // 799
      { id: 'energy-booster-bath-salt', qty: 2 }, // 400
    ],
    'FIRST10',
    catalogMap
  );

  assert.equal(result.valid, true);
  assert.equal(result.subtotal, 1798);
  assert.equal(result.discountAmount, 180);
  assert.equal(result.shippingFee, 0); // >= 999 free shipping
  assert.equal(result.grandTotal, 1618);
});

test('Server rejects invalid product IDs and out-of-range quantities', () => {
  const badProduct = calculateServerOrderTotals([{ id: 'nonexistent-sku', qty: 1 }], '', catalogMap);
  assert.equal(badProduct.valid, false);

  const badQty = calculateServerOrderTotals([{ id: 'amethyst-bracelet', qty: 0 }], '', catalogMap);
  assert.equal(badQty.valid, false);
});

test('Single ₹599 bracelet below free shipping threshold adds ₹99 shipping unless FREESHIP applied', () => {
  const withoutCoupon = calculateServerOrderTotals([{ id: 'amethyst-bracelet', qty: 1 }], '', catalogMap);
  assert.equal(withoutCoupon.shippingFee, 99);
  assert.equal(withoutCoupon.grandTotal, 698);

  const withFreeShip = calculateServerOrderTotals([{ id: 'amethyst-bracelet', qty: 1 }], 'FREESHIP', catalogMap);
  assert.equal(withFreeShip.shippingFee, 0);
  assert.equal(withFreeShip.grandTotal, 599);

  const summary = calculateCartSummary(
    [
      {
        id: 'amethyst-bracelet',
        name: 'Amethyst',
        category: 'Single Crystal Bracelets',
        priceInr: 599,
        originalPriceInr: 899,
        quantity: 1,
        chakra: 'Crown',
      },
    ],
    'FIRST10'
  );
  assert.equal(summary.discountAmountInr, 60);
  assert.equal(summary.finalTotalInr, 599 - 60 + 99);
});

test('filterAndSortProducts respects live stock and price/rating sort order', () => {
  const sample = [
    { id: 'a', price: 799, rating: 4.8, inStock: true },
    { id: 'b', price: 200, rating: 4.5, inStock: true },
    { id: 'c', price: 599, rating: 5.0, inStock: true },
  ];
  const liveMap = {
    a: { inventory: 0, active: true },
    b: { inventory: 5, active: true },
    c: { inventory: 3, active: true },
  };

  const inStockAsc = filterAndSortProducts(sample, {
    inStockOnly: true,
    sortBy: 'price-asc',
    liveInventoryMap: liveMap,
  });
  assert.deepEqual(
    inStockAsc.map((x) => x.id),
    ['b', 'c']
  );

  const allDesc = filterAndSortProducts(sample, { sortBy: 'price-desc' });
  assert.deepEqual(
    allDesc.map((x) => x.id),
    ['a', 'c', 'b']
  );

  const byRating = filterAndSortProducts(sample, { sortBy: 'rating-desc' });
  assert.equal(byRating[0].id, 'c');
});

test('getCustomerOrderActionEligibility enforces cancel vs return rules', () => {
  assert.deepEqual(getCustomerOrderActionEligibility('processing'), {
    canCancel: true,
    canRequestReturn: false,
  });
  assert.deepEqual(getCustomerOrderActionEligibility('shipped'), {
    canCancel: false,
    canRequestReturn: false,
  });
  assert.deepEqual(getCustomerOrderActionEligibility('delivered'), {
    canCancel: false,
    canRequestReturn: true,
  });
});

test('calculateBundleSummary totals ShivAmrit bundle selections and checks live stock & ₹999 free shipping', () => {
  const res = calculateBundleSummary(
    [
      { id: 'aries-bracelet', name: 'Aries Crystal Combination Bracelet', price: 799, stockStatus: 'in' },
      { id: 'energy-booster-bath-salt', name: 'Energy Booster Consecrated Bath Salt', price: 200, stockStatus: 'in' },
      { id: 'amethyst-bracelet', name: 'Amethyst Single Crystal Bracelet', price: 599, stockStatus: 'in' },
    ],
    {
      'aries-bracelet': { inventory: 10, active: true },
      'energy-booster-bath-salt': { inventory: 12, active: true },
      'amethyst-bracelet': { inventory: 0, active: true },
    }
  );

  assert.equal(res.subtotalInr, 999);
  assert.equal(res.qualifiesForFreeShipping, true);
  assert.equal(res.shippingInr, 0);
  assert.equal(res.firstOrder10SavingsInr, 100);
  assert.deepEqual(res.outOfStockIds, ['amethyst-bracelet']);
});

test('buildOrdersCsv formats orders and neutralizes spreadsheet formula injection', () => {
  const csv = buildOrdersCsv([
    {
      orderId: 'SH-101',
      createdAt: '2026-11-14T10:00:00Z',
      customerName: '=CMD("calc")',
      customerPhone: '9876543210',
      customerEmail: 'user@example.com',
      shippingCity: 'Mumbai, MH',
      shippingPincode: '400050',
      paymentMethod: 'cod',
      paymentStatus: 'cod_pending',
      fulfillmentStatus: 'processing',
      grandTotal: 799,
      trackingNumber: '',
      customerNote: '',
    },
  ]);

  assert.match(csv, /^Order ID,Created At,Customer Name,/);
  assert.match(csv, /"'=CMD\(""calc""\)"/);
  assert.match(csv, /"Mumbai, MH"/);
});

test('validateLeadInquiry normalizes phone numbers and rejects invalid lead payloads', () => {
  const valid = validateLeadInquiry({
    name: '  Ananya Sharma ',
    phone: '+91 98765-43210',
    email: 'ANANYA@Example.com ',
    interest: 'Reiki, Astrology & Tarot Consultation',
    message: 'Looking for a weekend Reiki session.',
    sourceSlide: 'consultations',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized?.phone, '9876543210');
  assert.equal(valid.normalized?.email, 'ananya@example.com');

  const badPhone = validateLeadInquiry({
    name: 'Ananya',
    phone: '12345',
    interest: 'Reiki, Astrology & Tarot Consultation',
  });
  assert.equal(badPhone.valid, false);

  const badEmail = validateLeadInquiry({
    name: 'Ananya',
    phone: '9876543210',
    email: 'not-an-email',
    interest: 'Reiki Certification & Crystal Workshop',
  });
  assert.equal(badEmail.valid, false);
});

test('buildWhatsAppInquiryUrl creates properly encoded wa.me URL and formatLeadSheetRow blocks formula injection', () => {
  const url = buildWhatsAppInquiryUrl({
    leadId: 'SH-LEAD-1042',
    name: 'Meera Patel',
    phone: '9876543210',
    email: 'meera@example.com',
    interest: 'Reiki Certification & Crystal Workshop',
    message: 'Need details for Reiki Level 1 batch',
  });
  assert.ok(url.startsWith('https://wa.me/919876543210?text='));
  assert.ok(decodeURIComponent(url).includes('Inquiry Ref: SH-LEAD-1042'));
  assert.ok(decodeURIComponent(url).includes('Reiki Certification & Crystal Workshop'));

  const row = formatLeadSheetRow({
    leadId: 'SH-LEAD-1042',
    createdAt: '2026-11-14T10:00:00Z',
    name: '=HYPERLINK("http://evil")',
    phone: '9876543210',
    email: 'meera@example.com',
    interest: '+Admin',
    message: '@SUM(A1:A2)',
    sourceSlide: 'workshops',
  });
  assert.equal(row[2], "'=HYPERLINK(\"http://evil\")");
  assert.equal(row[5], "'+Admin");
  assert.equal(row[6], "'@SUM(A1:A2)");
});
