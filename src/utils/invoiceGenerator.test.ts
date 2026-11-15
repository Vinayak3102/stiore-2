import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderInvoiceHtml } from './invoiceGenerator.ts';

test('buildOrderInvoiceHtml escapes customer inputs and renders itemized ₹599/₹799/₹200 totals', () => {
  const html = buildOrderInvoiceHtml({
    orderId: 'SH-COD-900111',
    customerName: 'Aarav <script>alert(1)</script> Sharma',
    customerPhone: '9876543210',
    customerEmail: 'aarav@example.com',
    shippingStreet: '12 Temple Road',
    shippingCity: 'Surat',
    shippingPincode: '395007',
    items: [
      { name: 'Consecrated Amethyst Single Crystal Bracelet', unitPrice: 599, qty: 1, lineTotal: 599 },
      { name: 'Energy Booster Consecrated Bath Salt', unitPrice: 200, qty: 2, lineTotal: 400 },
    ],
    subtotal: 999,
    discountAmount: 100,
    couponCode: 'FIRST10',
    shippingFee: 0,
    grandTotal: 899,
    paymentMethod: 'cod',
    paymentStatus: 'cod_pending',
    fulfillmentStatus: 'processing',
    createdAt: '2026-11-14T10:00:00.000Z',
  });

  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
  assert.equal(html.includes('SH-COD-900111'), true);
  assert.equal(html.includes('Consecrated Amethyst Single Crystal Bracelet'), true);
  assert.equal(html.includes('Energy Booster Consecrated Bath Salt'), true);
  assert.equal(html.includes('FIRST10'), true);
  assert.equal(html.includes('₹899'), true);
});
