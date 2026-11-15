import React, { useState } from 'react';
import {
  X,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileDown,
  RotateCcw,
} from 'lucide-react';
import { downloadOrderInvoice } from '../utils/invoiceGenerator';
import { getCustomerOrderActionEligibility } from '../utils/storeLogic';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrackedOrder {
  orderId: string;
  customerName: string;
  shippingCity: string;
  shippingPincode: string;
  items: { productId: string; name: string; unitPrice: number; qty: number; lineTotal: number }[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingNumber: string;
  courierName: string;
  customerNote?: string;
  createdAt: string;
  updatedAt: string;
}

const STEPS = [
  { key: 'processing', label: 'Order Recorded & Energy Cleansing' },
  { key: 'packed', label: 'Consecrated & Packed' },
  { key: 'shipped', label: 'Dispatched via Courier' },
  { key: 'delivered', label: 'Delivered' },
];

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ isOpen, onClose }) => {
  const [orderId, setOrderId] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  if (!isOpen) return null;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setActionNotice('');
    setOrder(null);
    if (!orderId.trim() || !contact.trim()) {
      setError('Enter both your Order ID and the mobile number or email used at checkout.');
      return;
    }

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        orderId: orderId.trim(),
        contact: contact.trim(),
      });
      const res = await fetch(`/api/orders/track?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok || !data?.order) {
        setError(data?.error || 'Order not found. Check your Order ID and contact.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Unable to reach order tracking service right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (action: 'cancel' | 'return') => {
    if (!order) return;
    setError('');
    setActionNotice('');
    setActionBusy(true);
    try {
      const res = await fetch('/api/orders/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          contact: contact.trim(),
          action,
          reason: actionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.order) {
        setError(data?.error || 'Unable to process request right now.');
      } else {
        setOrder(data.order);
        setActionReason('');
        setActionNotice(
          action === 'cancel'
            ? 'Your order has been cancelled and reserved inventory has been released.'
            : 'Your return/refund request has been logged for priority support review.'
        );
      }
    } catch {
      setError('Network error while submitting request.');
    } finally {
      setActionBusy(false);
    }
  };

  const activeIndex = order
    ? STEPS.findIndex((s) => s.key === order.fulfillmentStatus)
    : -1;
  const eligibility = order ? getCustomerOrderActionEligibility(order.fulfillmentStatus) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-order-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#18283e] text-white">
          <div className="flex items-center gap-2.5">
            <Truck className="size-5 text-[#f3d37a]" />
            <div>
              <h2 id="track-order-title" className="font-serif text-lg font-bold text-white">
                Track Your Sacred Order
              </h2>
              <p className="text-[11px] text-white/70">
                Real-time dispatch, invoice download &amp; cancellation/return support
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close track order modal"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <form onSubmit={handleTrack} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="track-order-id"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Order ID *
                </label>
                <input
                  id="track-order-id"
                  type="text"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. SH-COD-123456 or SH-..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                />
              </div>
              <div>
                <label
                  htmlFor="track-order-contact"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Mobile Number or Email *
                </label>
                <input
                  id="track-order-contact"
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="9876543210 or you@email.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#18283e] hover:bg-[#121e30] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Looking up order...</span>
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  <span>Check Order Status</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {actionNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
          )}

          {order && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="bg-[#fbf9f5] border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10.5px] uppercase tracking-wider font-bold text-slate-500 block">
                    Order Reference
                  </span>
                  <span className="font-mono font-bold text-sm text-[#18283e]">{order.orderId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10.5px] uppercase tracking-wider font-bold text-slate-500 block">
                      Payment &amp; Total
                    </span>
                    <span className="font-bold text-[#18283e]">
                      ₹{order.grandTotal.toLocaleString('en-IN')} ({order.paymentMethod.toUpperCase()} · {order.paymentStatus.replace('_', ' ')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadOrderInvoice(order)}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-[#18283e] rounded-lg font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileDown className="size-3.5 text-[#e07038]" />
                    <span>Invoice</span>
                  </button>
                </div>
              </div>

              {/* Fulfillment Steps */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Fulfillment Progress
                </h3>
                {order.fulfillmentStatus === 'cancelled' || order.fulfillmentStatus === 'returned' ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                    <p className="font-bold uppercase tracking-wider">
                      Status: {order.fulfillmentStatus === 'cancelled' ? 'Order Cancelled' : 'Return / Refund Requested'}
                    </p>
                    {order.customerNote && <p>{order.customerNote}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {STEPS.map((step, idx) => {
                      const done = activeIndex >= idx;
                      const isCurrent = order.fulfillmentStatus === step.key;
                      return (
                        <div
                          key={step.key}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs ${
                            done
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="size-4 text-slate-400 shrink-0" />
                          )}
                          <span className={isCurrent ? 'font-bold' : 'font-medium'}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {order.trackingNumber && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900 block">
                      Courier: {order.courierName || 'Express Partner'}
                    </span>
                    <span className="text-amber-800 font-mono">
                      AWB / Tracking: {order.trackingNumber}
                    </span>
                  </div>
                  <ShieldCheck className="size-5 text-amber-700" />
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  <span>Items ({order.items.length})</span>
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {order.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-white"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Qty: {item.qty} × ₹{item.unitPrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span className="font-bold text-[#18283e]">
                        ₹{item.lineTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {(eligibility?.canCancel || eligibility?.canRequestReturn) && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#18283e]">
                    <RotateCcw className="size-3.5 text-[#e07038]" />
                    <span>
                      {eligibility.canCancel
                        ? 'Need to cancel before dispatch?'
                        : 'Need a return or refund?'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={
                      eligibility.canCancel
                        ? 'Optional reason (e.g. ordered wrong bracelet size)'
                        : 'Reason for return/refund (e.g. damaged bead in transit)'
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleOrderAction(eligibility.canCancel ? 'cancel' : 'return')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-60"
                  >
                    {actionBusy
                      ? 'Submitting...'
                      : eligibility.canCancel
                      ? 'Cancel Order'
                      : 'Submit Return Request'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
