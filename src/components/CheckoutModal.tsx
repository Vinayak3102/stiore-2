import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Truck,
  ArrowLeft,
  PackageCheck,
  QrCode,
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  User,
  Edit3,
  FileDown,
} from 'lucide-react';
import type { CartLineItem } from './CartDrawer';
import { logoImg } from '../data/storeProducts';
import type { UserProfile } from '../types/auth';
import {
  getCurrentUser,
  getAuthIdToken,
  saveUserProfileAndAddress,
} from '../utils/authStorage';
import {
  FREE_SHIPPING_THRESHOLD_INR,
  STANDARD_SHIPPING_INR,
  validateCoupon,
} from '../utils/storeLogic';
import { downloadOrderInvoice, type InvoiceOrderData } from '../utils/invoiceGenerator';
import { AuthModal } from './AuthModal';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartLineItem[];
  onOrderSuccess: () => void;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'confirmed'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [razorpayConfig, setRazorpayConfig] = useState<{
    configured: boolean;
    key_id: string;
    mode: string;
  }>({ configured: false, key_id: '', mode: 'loading' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [confirmedItemCount, setConfirmedItemCount] = useState(0);
  const [confirmedOrder, setConfirmedOrder] = useState<InvoiceOrderData | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [cartReminderConsent, setCartReminderConsent] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    if (items.length > 0 && step === 'confirmed') {
      setStep('details');
      setOrderId('');
      setPaymentId('');
      setConfirmedTotal(null);
      setConfirmedItemCount(0);
      setConfirmedOrder(null);
    }

    const user = getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setName(user.name || '');
      setPhone(user.mobile || '');
      setEmail(user.email || '');
      if (user.courierAddress?.streetAddress) {
        const fullAddr =
          user.courierAddress.streetAddress +
          (user.courierAddress.landmark ? `, Near ${user.courierAddress.landmark}` : '');
        setAddress(fullAddr);
        setCity(user.courierAddress.city || '');
        setPincode(user.courierAddress.pincode || '');
        setUseSavedAddress(true);
      } else {
        setUseSavedAddress(false);
      }
    } else {
      setUseSavedAddress(false);
    }

    fetch('/api/payment-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.configured === 'boolean') {
          setRazorpayConfig({
            configured: data.configured,
            key_id: data.key_id || '',
            mode: data.mode || 'unconfigured',
          });
          if (!data.configured) {
            setPaymentMethod('cod');
          }
        }
      })
      .catch(() => {
        setRazorpayConfig({ configured: false, key_id: '', mode: 'unconfigured' });
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const couponPreview = validateCoupon(appliedCouponCode, subtotal);
  const discountAmount = couponPreview.valid ? couponPreview.discountAmountInr : 0;
  const freeShippingUnlocked =
    subtotal >= FREE_SHIPPING_THRESHOLD_INR || (couponPreview.valid && couponPreview.freeShipping);
  const shippingFee = freeShippingUnlocked ? 0 : STANDARD_SHIPPING_INR;
  const grandTotal = Math.max(1, subtotal - discountAmount + shippingFee);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = couponInput.trim().toUpperCase();
    if (!trimmed) {
      setAppliedCouponCode('');
      setCouponFeedback(null);
      return;
    }

    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          items: items.map((i) => ({ id: i.product.id, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (data?.valid) {
        setAppliedCouponCode(data.code);
        setCouponFeedback({ ok: true, msg: data.message });
      } else {
        setAppliedCouponCode('');
        setCouponFeedback({ ok: false, msg: data?.message || 'Invalid coupon code.' });
      }
    } catch {
      const localCheck = validateCoupon(trimmed, subtotal);
      if (localCheck.valid) {
        setAppliedCouponCode(localCheck.code);
        setCouponFeedback({ ok: true, msg: localCheck.message });
      } else {
        setAppliedCouponCode('');
        setCouponFeedback({ ok: false, msg: localCheck.message });
      }
    }
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (!name.trim() || digits.length < 10 || !address.trim() || !city.trim() || !/^[0-9]{6}$/.test(pincode.trim())) {
      setErrorMessage(
        'Please fill in full name, 10-digit mobile number, street address, city, and valid 6-digit PIN code.'
      );
      return;
    }

    if (currentUser && saveAddressForFuture) {
      try {
        await saveUserProfileAndAddress({
          name: name.trim(),
          mobile: phone.trim(),
          courierAddress: {
            streetAddress: address.trim(),
            city: city.trim(),
            state: 'India',
            pincode: pincode.trim(),
          },
        });
      } catch {
        // Proceed with checkout even if optional cloud profile save fails
      }
    }

    if (cartReminderConsent && items.length > 0) {
      try {
        const token = await getAuthIdToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        await fetch('/api/cart-recovery', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerEmail: email.trim(),
            items: items.map((i) => ({ id: i.product.id, qty: i.qty })),
            consent: true,
          }),
        });
      } catch {
        // Non-blocking optional reminder save
      }
    }

    setErrorMessage('');
    setStep('payment');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleInitiatePayment = async () => {
    setErrorMessage('');
    setIsProcessing(true);

    const token = await getAuthIdToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const orderPayload = {
      items: items.map((i) => ({ id: i.product.id, qty: i.qty })),
      couponCode: appliedCouponCode,
      customer: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      },
      shippingAddress: {
        street: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
      },
    };

    if (paymentMethod === 'cod') {
      try {
        const res = await fetch('/api/create-cod-order', {
          method: 'POST',
          headers,
          body: JSON.stringify(orderPayload),
        });
        const data = await res.json();
        if (!res.ok || !data?.order?.orderId) {
          throw new Error(data?.error || 'Could not place COD order. Please try again.');
        }
        setOrderId(data.order.orderId);
        setPaymentId('COD-PENDING');
        setConfirmedTotal(data.order.grandTotal);
        setConfirmedItemCount(items.reduce((s, i) => s + i.qty, 0));
        setConfirmedOrder(data.order);
        setStep('confirmed');
        onOrderSuccess();
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unable to record COD order.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      if (!razorpayConfig.configured || !razorpayConfig.key_id) {
        throw new Error(
          'Online Razorpay checkout is not configured on this server yet. Please use Cash on Delivery.'
        );
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error(
          'Unable to load the Razorpay checkout script. Check your internet connection or use COD.'
        );
      }

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData?.order_id) {
        throw new Error(orderData?.error || 'Failed to initialize Razorpay order.');
      }

      const options: any = {
        key: razorpayConfig.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        order_id: orderData.order_id,
        name: 'ShivAmrit Healers',
        description: `Order ${orderData.store_order_id} • Consecrated Spiritual Artifacts`,
        image: logoImg || '/assets/logo.png',
        prefill: {
          name: name.trim(),
          email: email.trim() || undefined,
          contact: phone.trim(),
        },
        notes: {
          address: `${address}, ${city} - ${pincode}`,
          store_order_id: orderData.store_order_id,
        },
        theme: { color: '#18283e' },
        handler: async function (response: any) {
          setIsProcessing(true);
          const rzpPaymentId = response.razorpay_payment_id;
          const rzpOrderId = response.razorpay_order_id || orderData.order_id;
          const rzpSignature = response.razorpay_signature;

          if (!rzpPaymentId || !rzpSignature) {
            setIsProcessing(false);
            setErrorMessage('Incomplete payment response from Razorpay.');
            return;
          }

          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: rzpOrderId,
                payment_id: rzpPaymentId,
                signature: rzpSignature,
              }),
            });
            const verifyResult = await verifyRes.json();
            if (!verifyRes.ok || !verifyResult?.success) {
              setIsProcessing(false);
              setErrorMessage(
                verifyResult?.error || 'Payment signature verification failed.'
              );
              return;
            }

            setIsProcessing(false);
            setPaymentId(rzpPaymentId);
            setOrderId(verifyResult.store_order_id || rzpOrderId);
            setConfirmedTotal(verifyResult.order?.grandTotal ?? orderData.totals?.grandTotal ?? grandTotal);
            setConfirmedItemCount(items.reduce((s, i) => s + i.qty, 0));
            setConfirmedOrder(
              verifyResult.order || {
                orderId: verifyResult.store_order_id || rzpOrderId,
                customerName: name.trim(),
                customerPhone: phone.trim(),
                customerEmail: email.trim(),
                shippingStreet: address.trim(),
                shippingCity: city.trim(),
                shippingPincode: pincode.trim(),
                items: items.map((i) => ({
                  productId: i.product.id,
                  name: i.product.name,
                  unitPrice: i.product.price,
                  qty: i.qty,
                  lineTotal: i.product.price * i.qty,
                })),
                subtotal: orderData.totals?.subtotal ?? subtotal,
                discountAmount: orderData.totals?.discountAmount ?? discountAmount,
                couponCode: appliedCouponCode,
                shippingFee: orderData.totals?.shippingFee ?? shippingFee,
                grandTotal: orderData.totals?.grandTotal ?? grandTotal,
                paymentMethod: 'razorpay',
                paymentStatus: 'paid',
                fulfillmentStatus: 'processing',
                razorpayPaymentId: rzpPaymentId,
              }
            );
            setStep('confirmed');
            onOrderSuccess();
          } catch (verifyError: any) {
            setIsProcessing(false);
            setErrorMessage(verifyError?.message || 'Verification failed.');
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setErrorMessage('Payment cancelled. You can retry or switch to Cash on Delivery.');
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', function (failureResponse: any) {
        setIsProcessing(false);
        const reason =
          failureResponse?.error?.description ||
          failureResponse?.error?.reason ||
          'Payment could not be completed.';
        setErrorMessage(`Payment Failed: ${reason}`);
      });
      razorpayInstance.open();
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Error communicating with payment server.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl text-slate-900 border border-slate-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-[#121e30] via-[#18283e] to-[#121e30] text-white">
          <div className="flex items-center gap-2">
            {step === 'payment' && (
              <button
                type="button"
                onClick={() => {
                  setStep('details');
                  setErrorMessage('');
                }}
                className="mr-1 p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
                aria-label="Back to details"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <Sparkles className="size-5 text-[#f3d37a]" />
            <h2 id="checkout-title" className="font-serif text-lg md:text-xl font-medium tracking-wide">
              {step === 'confirmed' ? 'Order Recorded & Confirmed' : 'Secure Sacred Checkout'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <strong className="block font-semibold">Notice:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={handleSubmitDetails} className="space-y-5">
              {!currentUser ? (
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-[#e07038] shrink-0" />
                    <span className="text-slate-700">
                      Have a ShivAmrit account? <strong>Sign in</strong> to autofill your saved courier address.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-3 py-1 bg-[#18283e] hover:bg-[#121e30] text-white text-[11px] font-bold rounded-lg transition shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-900 font-medium">
                      Signed in as <strong>{currentUser.name}</strong> ({currentUser.email})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-[11px] text-[#18283e] hover:underline font-bold"
                  >
                    Account
                  </button>
                </div>
              )}

              <div>
                <h3 className="font-serif text-base font-semibold text-[#18283e] mb-3 flex items-center justify-between">
                  <span>1. Courier Delivery Address</span>
                  <span className="text-[11px] font-sans font-normal text-slate-500">
                    Express Delivery across India
                  </span>
                </h3>

                {useSavedAddress && currentUser?.courierAddress ? (
                  <div className="bg-amber-50/60 border border-amber-300/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#18283e] flex items-center gap-1.5">
                        <Truck className="size-4 text-[#e07038]" />
                        <span>Saved Courier Delivery Address</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setUseSavedAddress(false)}
                        className="text-xs text-[#e07038] hover:underline font-bold flex items-center gap-1"
                      >
                        <Edit3 className="size-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200/70 text-xs text-slate-800 space-y-1">
                      <p className="font-bold text-slate-900 text-sm">
                        {name} <span className="font-normal text-slate-500">({phone})</span>
                      </p>
                      <p className="text-slate-600 leading-relaxed">{address}</p>
                      <p className="font-semibold text-slate-800">
                        {city} — {pincode}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentUser?.courierAddress && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setUseSavedAddress(true)}
                          className="text-xs text-[#18283e] hover:underline font-bold"
                        >
                          ← Use Saved Address
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label htmlFor="chk-name" className="block text-[11px] font-medium text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          id="chk-name"
                          type="text"
                          required
                          placeholder="e.g. Parul Suthar"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label htmlFor="chk-phone" className="block text-[11px] font-medium text-slate-700 mb-1">
                          Mobile / WhatsApp Number *
                        </label>
                        <input
                          id="chk-phone"
                          type="tel"
                          required
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="chk-email" className="block text-[11px] font-medium text-slate-700 mb-1">
                          Email Address (For Order Tracking)
                        </label>
                        <input
                          id="chk-email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="chk-street" className="block text-[11px] font-medium text-slate-700 mb-1">
                          Courier Street Address / Flat & Landmark *
                        </label>
                        <input
                          id="chk-street"
                          type="text"
                          required
                          placeholder="Flat 402, Shivam Heights, MG Road"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label htmlFor="chk-city" className="block text-[11px] font-medium text-slate-700 mb-1">
                          City / District *
                        </label>
                        <input
                          id="chk-city"
                          type="text"
                          required
                          placeholder="e.g. Surat, Mumbai"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label htmlFor="chk-pincode" className="block text-[11px] font-medium text-slate-700 mb-1">
                          6-Digit PIN Code *
                        </label>
                        <input
                          id="chk-pincode"
                          type="text"
                          required
                          placeholder="395001"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300"
                        />
                      </div>
                    </div>

                    {currentUser && (
                      <label className="flex items-center gap-2 pt-1 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={saveAddressForFuture}
                          onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                          className="rounded text-[#18283e]"
                        />
                        <Truck className="size-4 text-[#e07038]" />
                        <span>Save this courier address to my profile</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="chk-coupon" className="block text-[11px] font-medium text-slate-700 mb-1">
                  Sacred Blessing Coupon (Try FIRST10, SHIVAMRIT10, BLISS15, or FREESHIP)
                </label>
                <div className="flex gap-2">
                  <input
                    id="chk-coupon"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs uppercase tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-900 transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {couponFeedback && (
                  <p
                    className={`text-[11px] font-medium mt-1 ${
                      couponFeedback.ok ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {couponFeedback.msg}
                  </p>
                )}
              </div>

              <div className="bg-[#fbf9f5] p-4 rounded-xl text-xs space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({appliedCouponCode})</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Express Insured Shipping</span>
                  <span>{shippingFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${shippingFee}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#18283e] pt-2 border-t border-slate-200">
                  <span>Payable Grand Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cartReminderConsent}
                  onChange={(e) => setCartReminderConsent(e.target.checked)}
                  className="mt-0.5 rounded text-[#18283e]"
                />
                <span>
                  Optional: Send me a one-time gentle reminder on WhatsApp or email if I pause before completing checkout (automatically cancelled once ordered).
                </span>
              </label>

              <button
                type="submit"
                className="w-full bg-[#18283e] hover:bg-[#121e30] text-white py-3.5 rounded-xl text-xs font-bold tracking-wide transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Payment Method →</span>
              </button>
            </form>
          )}

          {step === 'payment' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#18283e] mb-1">
                  2. Select Payment Method
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Order totals are verified server-side prior to confirmation.
                </p>

                <div className="space-y-3">
                  <label
                    className={`flex items-start justify-between p-4 rounded-xl border-2 transition ${
                      !razorpayConfig.configured
                        ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : paymentMethod === 'online'
                        ? 'border-[#18283e] bg-slate-50/80 shadow-md ring-1 ring-[#18283e] cursor-pointer'
                        : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payMethod"
                        disabled={!razorpayConfig.configured}
                        checked={paymentMethod === 'online'}
                        onChange={() => setPaymentMethod('online')}
                        className="mt-1 text-[#18283e]"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <QrCode className="size-4 text-[#e07038]" />
                          <span>Razorpay Standard Checkout (UPI • Cards • NetBanking)</span>
                        </div>
                        <p className="text-[11.5px] text-slate-600 mt-1">
                          {razorpayConfig.configured
                            ? 'Pay via Google Pay, PhonePe, Paytm, RuPay, Visa, Mastercard, or NetBanking.'
                            : 'Online Razorpay checkout requires server API credentials. Choose Cash on Delivery below.'}
                        </p>
                        {razorpayConfig.configured && (
                          <div className="flex items-center gap-2 mt-2 text-[10.5px] text-slate-500">
                            <Lock className="size-3 text-emerald-600" />
                            <span>Server-calculated total • HMAC Signature Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                      paymentMethod === 'cod'
                        ? 'border-[#18283e] bg-slate-50/80 shadow-md ring-1 ring-[#18283e]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="mt-1 text-[#18283e]"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <Truck className="size-4 text-slate-600" />
                          <span>Cash on Delivery (COD)</span>
                        </div>
                        <p className="text-[11.5px] text-slate-600 mt-1">
                          Pay upon verified courier delivery at your doorstep across India.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Payable Amount:</span>
                  <span className="text-base text-[#18283e]">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Shipping to: <strong>{name}</strong> • {address}, {city} ({pincode})
                </p>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleInitiatePayment}
                className="w-full bg-gradient-to-r from-[#d26726] to-[#e07038] hover:from-[#bf5b1f] hover:to-[#ce622d] text-white py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Recording Sacred Order...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="size-4" />
                    <span>
                      {paymentMethod === 'online'
                        ? `Pay Securely with Razorpay (₹${grandTotal.toLocaleString('en-IN')})`
                        : `Confirm COD Order (₹${grandTotal.toLocaleString('en-IN')})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="text-center py-6 space-y-4">
              <div className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="size-10" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#18283e]">
                Thank you, {name}!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your order has been saved to our store ledger. Use your Order ID and mobile number or email in Track Order anytime to check consecration and dispatch updates.
              </p>

              <div className="bg-[#fbf9f5] border border-slate-200 rounded-xl p-5 max-w-md mx-auto text-left text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Order ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#18283e]">{orderId}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(orderId)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                      aria-label="Copy Order ID"
                    >
                      {copiedId ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                </div>

                {paymentId && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Payment Reference:</span>
                    <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {paymentId}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">Items Ordered:</span>
                  <span className="font-semibold text-slate-800">{confirmedItemCount} piece(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-semibold text-slate-800">
                    {paymentMethod === 'online' ? 'Razorpay Online Payment' : 'Cash on Delivery (COD)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Address:</span>
                  <span className="font-semibold text-right text-slate-800 truncate max-w-[220px]">
                    {address}, {city} - {pincode}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Payable:</span>
                  <span className="text-emerald-700">
                    ₹{(confirmedTotal ?? grandTotal).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 pt-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Saved under phone {phone} for live status lookup</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                {confirmedOrder && (
                  <button
                    type="button"
                    onClick={() => downloadOrderInvoice(confirmedOrder)}
                    className="bg-amber-50 hover:bg-amber-100 text-[#18283e] border border-amber-300 px-5 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileDown className="size-4 text-[#e07038]" />
                    <span>Download Invoice</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#18283e] text-white px-8 py-3 rounded-xl text-xs font-semibold hover:bg-[#121e30] transition shadow cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setName(user.name || '');
          setPhone(user.mobile || '');
          setEmail(user.email || '');
          if (user.courierAddress?.streetAddress) {
            const fullAddr =
              user.courierAddress.streetAddress +
              (user.courierAddress.landmark ? `, Near ${user.courierAddress.landmark}` : '');
            setAddress(fullAddr);
            setCity(user.courierAddress.city || '');
            setPincode(user.courierAddress.pincode || '');
            setUseSavedAddress(true);
          }
        }}
      />
    </div>
  );
};
