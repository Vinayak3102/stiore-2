export interface InvoiceLineItem {
  productId?: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal?: number;
}

export interface InvoiceOrderData {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingPincode?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discountAmount?: number;
  couponCode?: string;
  shippingFee: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus?: string;
  razorpayPaymentId?: string;
  createdAt?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInr(amount: number): string {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

export function buildOrderInvoiceHtml(order: InvoiceOrderData): string {
  const safeOrderId = escapeHtml(order.orderId);
  const dateLabel = order.createdAt
    ? escapeHtml(new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))
    : escapeHtml(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));

  const itemRows = (order.items || [])
    .map((item, index) => {
      const qty = Math.max(1, Number(item.qty) || 1);
      const unitPrice = Number(item.unitPrice) || 0;
      const lineTotal = item.lineTotal ?? unitPrice * qty;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${index + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#18283e;">${escapeHtml(item.name)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatInr(unitPrice)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatInr(lineTotal)}</td>
        </tr>
      `;
    })
    .join('');

  const discount = Number(order.discountAmount) || 0;
  const addressParts = [order.shippingStreet, order.shippingCity, order.shippingPincode]
    .filter((p) => p && String(p).trim() !== '')
    .map((p) => escapeHtml(p));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ShivAmrit Healers Invoice — ${safeOrderId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 28px; background: #f8fafc; }
    .sheet { max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .header { background: #18283e; color: #ffffff; padding: 24px 28px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: 0.02em; color: #f3d37a; margin: 0 0 4px; }
    .sub { font-size: 12px; color: #cbd5e1; margin: 0; }
    .body { padding: 24px 28px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .box { background: #fbf9f5; border: 1px solid #e8e6df; border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.5; }
    .box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th { background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px; text-align: left; }
    .totals { margin-top: 18px; margin-left: auto; width: 300px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .totals-grand { border-top: 2px solid #18283e; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 700; color: #18283e; }
    .footer { border-top: 1px solid #e2e8f0; padding: 16px 28px; background: #fbf9f5; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
    .print-btn { background: #18283e; color: #ffffff; border: 0; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
    @media print { body { background: #ffffff; padding: 0; } .sheet { border: 0; } .print-btn { display: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <h1 class="brand">ShivAmrit Healers</h1>
        <p class="sub">ALIGN • HEAL • EVOLVE · Official Sacred Order Invoice</p>
      </div>
      <div style="text-align:right;font-size:12px;">
        <div style="font-weight:700;font-size:14px;">Invoice #${safeOrderId}</div>
        <div style="color:#cbd5e1;">Issued: ${dateLabel}</div>
      </div>
    </div>
    <div class="body">
      <div class="grid">
        <div class="box">
          <h3>Billed &amp; Shipped To</h3>
          <strong>${escapeHtml(order.customerName)}</strong><br />
          ${order.customerPhone ? `Phone: ${escapeHtml(order.customerPhone)}<br />` : ''}
          ${order.customerEmail ? `Email: ${escapeHtml(order.customerEmail)}<br />` : ''}
          ${addressParts.length > 0 ? addressParts.join(', ') : 'Delivery details recorded on order'}
        </div>
        <div class="box">
          <h3>Payment &amp; Fulfillment</h3>
          Method: <strong>${escapeHtml(order.paymentMethod.toUpperCase())}</strong><br />
          Payment Status: <strong>${escapeHtml(order.paymentStatus.replace(/_/g, ' ').toUpperCase())}</strong><br />
          ${order.razorpayPaymentId ? `Payment Ref: ${escapeHtml(order.razorpayPaymentId)}<br />` : ''}
          Fulfillment: <strong>${escapeHtml((order.fulfillmentStatus || 'processing').replace(/_/g, ' ').toUpperCase())}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Sacred Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatInr(order.subtotal)}</span>
        </div>
        ${
          discount > 0
            ? `<div class="totals-row" style="color:#047857;">
                 <span>Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</span>
                 <span>-${formatInr(discount)}</span>
               </div>`
            : ''
        }
        <div class="totals-row">
          <span>Insured Express Shipping</span>
          <span>${order.shippingFee === 0 ? 'FREE' : formatInr(order.shippingFee)}</span>
        </div>
        <div class="totals-row totals-grand">
          <span>Grand Total (INR)</span>
          <span>${formatInr(order.grandTotal)}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <span>Thank you for choosing ShivAmrit Healers. Every crystal is Vedic energized prior to dispatch.</span>
      <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
    </div>
  </div>
</body>
</html>`;
}

export function downloadOrderInvoice(order: InvoiceOrderData): void {
  const html = buildOrderInvoiceHtml(order);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeId = (order.orderId || 'Order').replace(/[^a-zA-Z0-9_-]/g, '');
  link.href = url;
  link.download = `ShivAmrit-Invoice-${safeId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
