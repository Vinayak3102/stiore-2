/**
 * Core business and calculation logic for ShivAmrit Healers E-Commerce Store.
 * Decoupled from UI components for pure unit testing and server-authoritative calculations.
 */

export interface CartItem {
  id: string;
  name: string;
  category: string;
  priceInr: number;
  originalPriceInr: number;
  quantity: number;
  chakra: string;
}

export interface ServerOrderLineInput {
  id: string;
  qty: number;
}

export interface AuthoritativeProductRecord {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  active: boolean;
}

export interface ValidatedOrderLine {
  productId: string;
  name: string;
  category: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export const FREE_SHIPPING_THRESHOLD_INR = 999;
export const STANDARD_SHIPPING_INR = 99;

export function formatPrice(amountInr: number): string {
  return `₹${Math.round(amountInr).toLocaleString('en-IN')}`;
}

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.priceInr * item.quantity, 0);
}

export function calculateOriginalTotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.originalPriceInr * item.quantity, 0);
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountType: 'percent' | 'fixed' | 'freeship' | 'none';
  discountPercent: number;
  discountAmountInr: number;
  freeShipping: boolean;
  message: string;
}

export function validateCoupon(code: string, subtotalInr: number): CouponValidationResult {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      code: '',
      discountType: 'none',
      discountPercent: 0,
      discountAmountInr: 0,
      freeShipping: false,
      message: '',
    };
  }

  if (normalized === 'FIRST10' || normalized === 'SHIVAMRIT10' || normalized === 'SHIVA10') {
    const discountAmountInr = Math.round((subtotalInr * 10) / 100);
    return {
      valid: true,
      code: normalized,
      discountType: 'percent',
      discountPercent: 10,
      discountAmountInr,
      freeShipping: false,
      message: `${normalized} applied: 10% sacred welcome blessing off!`,
    };
  }

  if (normalized === 'BLISS15') {
    if (subtotalInr >= 2000) {
      const discountAmountInr = Math.round((subtotalInr * 15) / 100);
      return {
        valid: true,
        code: normalized,
        discountType: 'percent',
        discountPercent: 15,
        discountAmountInr,
        freeShipping: false,
        message: 'BLISS15 applied: 15% Sacred Abundance discount!',
      };
    }
    return {
      valid: false,
      code: normalized,
      discountType: 'none',
      discountPercent: 0,
      discountAmountInr: 0,
      freeShipping: false,
      message: 'Coupon BLISS15 requires a minimum subtotal of ₹2,000.',
    };
  }

  if (normalized === 'FREESHIP') {
    return {
      valid: true,
      code: normalized,
      discountType: 'freeship',
      discountPercent: 0,
      discountAmountInr: 0,
      freeShipping: true,
      message: 'FREESHIP applied: Complimentary consecrated express shipping!',
    };
  }

  return {
    valid: false,
    code: normalized,
    discountType: 'none',
    discountPercent: 0,
    discountAmountInr: 0,
    freeShipping: false,
    message: 'Invalid or expired coupon code. Try FIRST10, SHIVAMRIT10, BLISS15, or FREESHIP.',
  };
}

export function calculateServerOrderTotals(
  requestedItems: ServerOrderLineInput[],
  couponCode: string,
  catalogMap: Record<string, AuthoritativeProductRecord>
): {
  valid: boolean;
  error?: string;
  items: ValidatedOrderLine[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  grandTotal: number;
  couponResult: CouponValidationResult;
} {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return {
      valid: false,
      error: 'Your order must contain at least one product.',
      items: [],
      subtotal: 0,
      discountAmount: 0,
      shippingFee: 0,
      grandTotal: 0,
      couponResult: validateCoupon('', 0),
    };
  }

  const aggregatedQty = new Map<string, number>();
  for (const line of requestedItems) {
    const id = typeof line?.id === 'string' ? line.id.trim() : '';
    const qty = Math.floor(Number(line?.qty));
    if (!id || !Number.isFinite(qty) || qty < 1 || qty > 50) {
      return {
        valid: false,
        error: 'Invalid product ID or quantity (must be between 1 and 50).',
        items: [],
        subtotal: 0,
        discountAmount: 0,
        shippingFee: 0,
        grandTotal: 0,
        couponResult: validateCoupon('', 0),
      };
    }
    aggregatedQty.set(id, (aggregatedQty.get(id) || 0) + qty);
  }

  const validatedLines: ValidatedOrderLine[] = [];
  let subtotal = 0;

  for (const [id, qty] of aggregatedQty.entries()) {
    const product = catalogMap[id];
    if (!product || !product.active) {
      return {
        valid: false,
        error: `Product "${id}" is not available in the catalog.`,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        shippingFee: 0,
        grandTotal: 0,
        couponResult: validateCoupon('', 0),
      };
    }
    if (product.inventory < qty) {
      return {
        valid: false,
        error: `Insufficient stock for ${product.name} (available: ${product.inventory}).`,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        shippingFee: 0,
        grandTotal: 0,
        couponResult: validateCoupon('', 0),
      };
    }
    const lineTotal = product.price * qty;
    subtotal += lineTotal;
    validatedLines.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      unitPrice: product.price,
      qty,
      lineTotal,
    });
  }

  const couponResult = validateCoupon(couponCode, subtotal);
  const discountAmount = couponResult.valid ? couponResult.discountAmountInr : 0;
  const qualifiesFreeShipping =
    subtotal >= FREE_SHIPPING_THRESHOLD_INR || (couponResult.valid && couponResult.freeShipping);
  const shippingFee = qualifiesFreeShipping ? 0 : STANDARD_SHIPPING_INR;
  const grandTotal = Math.max(1, subtotal - discountAmount + shippingFee);

  return {
    valid: true,
    items: validatedLines,
    subtotal,
    discountAmount,
    shippingFee,
    grandTotal,
    couponResult,
  };
}

export function calculateCartSummary(items: CartItem[], couponCode: string = '') {
  const subtotalInr = calculateSubtotal(items);
  const originalTotalInr = calculateOriginalTotal(items);
  const couponResult = couponCode ? validateCoupon(couponCode, subtotalInr) : validateCoupon('', subtotalInr);

  const discountAmountInr = couponResult.valid ? couponResult.discountAmountInr : 0;
  const qualifiesForFreeShipping =
    subtotalInr >= FREE_SHIPPING_THRESHOLD_INR ||
    (couponResult.valid && couponResult.freeShipping) ||
    items.length === 0;
  const shippingInr = items.length === 0 || qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_INR;

  const finalTotalInr = Math.max(0, subtotalInr - discountAmountInr + shippingInr);
  const totalSavingsInr = Math.max(0, originalTotalInr - subtotalInr + discountAmountInr);

  return {
    subtotalInr,
    originalTotalInr,
    discountAmountInr,
    shippingInr,
    finalTotalInr,
    totalSavingsInr,
    qualifiesForFreeShipping,
    amountNeededForFreeShippingInr: Math.max(0, FREE_SHIPPING_THRESHOLD_INR - subtotalInr),
    couponResult,
    subtotalFormatted: formatPrice(subtotalInr),
    discountFormatted: formatPrice(discountAmountInr),
    shippingFormatted: shippingInr === 0 ? 'FREE' : formatPrice(shippingInr),
    finalTotalFormatted: formatPrice(finalTotalInr),
    savingsFormatted: formatPrice(totalSavingsInr),
  };
}

export interface ChakraQuizAnswers {
  primaryStruggle: 'anxiety' | 'fatigue' | 'heartbreak' | 'expression' | 'lack_clarity';
  energyGoal: 'deep_peace' | 'vitality' | 'protection' | 'love' | 'spiritual_connection';
  preferredRitual: 'bath' | 'meditation' | 'wearing' | 'oil_massage';
}

export interface ChakraPrescription {
  chakraName: string;
  sanskritName: string;
  theme: string;
  affirmation: string;
  recommendedProductId: string;
  reason: string;
}

export function evaluateChakraDiagnostic(answers: ChakraQuizAnswers): ChakraPrescription {
  if (answers.primaryStruggle === 'fatigue' || answers.energyGoal === 'vitality') {
    return {
      chakraName: 'Solar Plexus & Root',
      sanskritName: 'Manipura & Muladhara',
      theme: 'Vital Energy, Grounding & Restorative Power',
      affirmation: 'I am grounded in sacred strength. Peaceful vitality flows effortlessly through me.',
      recommendedProductId: 'health-booster-bath-salt',
      reason: 'For restorative relaxation after draining days, the Health Booster Consecrated Bath Salt supports a soothing mineral soak ritual.',
    };
  }

  if (answers.primaryStruggle === 'heartbreak' || answers.energyGoal === 'love') {
    return {
      chakraName: 'Heart Chakra',
      sanskritName: 'Anahata',
      theme: 'Unconditional Compassion, Emotional Release & Inner Harmony',
      affirmation: 'My heart space is open, peaceful, and bathed in calm mindfulness.',
      recommendedProductId: 'rose-quartz-bracelet',
      reason: 'Rose Quartz is traditionally cherished for gentle heart-centered reflection and emotional warmth.',
    };
  }

  if (answers.primaryStruggle === 'anxiety' || answers.energyGoal === 'deep_peace') {
    return {
      chakraName: 'Crown & Third Eye',
      sanskritName: 'Sahasrara & Ajna',
      theme: 'Mental Stillness, Grounding & Mindfulness',
      affirmation: 'My mind is a serene sanctuary. I am calm, centered, and present.',
      recommendedProductId: 'amethyst-bracelet',
      reason: 'Amethyst is traditionally worn during meditation and evening reflection to encourage calm focus.',
    };
  }

  if (answers.primaryStruggle === 'expression') {
    return {
      chakraName: 'Throat Chakra',
      sanskritName: 'Vishuddha',
      theme: 'Authentic Truth, Clear Speech & Confidence',
      affirmation: 'I express my thoughts with clarity, kindness, and calm confidence.',
      recommendedProductId: 'rudraksha-mala',
      reason: 'The 108+1 Panchamukhi Rudraksha Mala supports mindful breathwork and japa meditation.',
    };
  }

  return {
    chakraName: 'All 7 Sacred Energy Centers',
    sanskritName: 'Sapta Chakra System',
    theme: 'Holistic Balance & Daily Mindfulness',
    affirmation: 'All aspects of my mind and spirit move in balanced harmony.',
    recommendedProductId: 'chakra-bracelet',
    reason: 'The 7 Chakra Healing Combination Bracelet brings together seven classic gemstones for holistic daily mindfulness.',
  };
}

export type ProductSortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating-desc';

export interface FilterableProduct {
  id: string;
  price: number;
  rating?: number;
  inStock?: boolean;
}

export function filterAndSortProducts<T extends FilterableProduct>(
  products: T[],
  options: {
    inStockOnly?: boolean;
    sortBy?: ProductSortOption;
    liveInventoryMap?: Record<string, { inventory: number; active: boolean }>;
  }
): T[] {
  const { inStockOnly = false, sortBy = 'featured', liveInventoryMap } = options;

  const filtered = products.filter((p) => {
    const live = liveInventoryMap?.[p.id];
    if (live && !live.active) return false;
    if (!inStockOnly) return true;
    if (live) return live.inventory > 0;
    return p.inStock !== false;
  });

  if (sortBy === 'featured') {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'rating-desc') return (b.rating ?? 0) - (a.rating ?? 0);
    return 0;
  });
}

export function getCustomerOrderActionEligibility(fulfillmentStatus: string): {
  canCancel: boolean;
  canRequestReturn: boolean;
} {
  const status = (fulfillmentStatus || '').toLowerCase();
  return {
    canCancel: status === 'pending_payment' || status === 'processing' || status === 'packed',
    canRequestReturn: status === 'delivered',
  };
}

export interface BundleSelectionInput {
  id: string;
  name: string;
  price: number;
  stockStatus?: 'in' | 'low' | 'out';
}

export interface BundleSummaryResult {
  validItems: BundleSelectionInput[];
  outOfStockIds: string[];
  subtotalInr: number;
  qualifiesForFreeShipping: boolean;
  amountToFreeShippingInr: number;
  shippingInr: number;
  firstOrder10SavingsInr: number;
  estimatedTotalWithFirst10Inr: number;
}

export function calculateBundleSummary(
  selectedItems: BundleSelectionInput[],
  liveInventoryMap?: Record<string, { inventory: number; active: boolean }>
): BundleSummaryResult {
  const validItems: BundleSelectionInput[] = [];
  const outOfStockIds: string[] = [];

  for (const item of selectedItems) {
    if (!item || !item.id) continue;
    const live = liveInventoryMap?.[item.id];
    const inStock = live ? live.active && live.inventory > 0 : item.stockStatus !== 'out';
    if (!inStock) {
      outOfStockIds.push(item.id);
    } else {
      validItems.push(item);
    }
  }

  const subtotalInr = validItems.reduce((sum, i) => sum + Math.max(0, Number(i.price) || 0), 0);
  const qualifiesForFreeShipping = subtotalInr >= FREE_SHIPPING_THRESHOLD_INR;
  const amountToFreeShippingInr = Math.max(0, FREE_SHIPPING_THRESHOLD_INR - subtotalInr);
  const shippingInr = validItems.length === 0 || qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_INR;
  const firstOrder10SavingsInr = Math.round((subtotalInr * 10) / 100);
  const estimatedTotalWithFirst10Inr = Math.max(
    0,
    subtotalInr - firstOrder10SavingsInr + shippingInr
  );

  return {
    validItems,
    outOfStockIds,
    subtotalInr,
    qualifiesForFreeShipping,
    amountToFreeShippingInr,
    shippingInr,
    firstOrder10SavingsInr,
    estimatedTotalWithFirst10Inr,
  };
}

function escapeCsvCell(value: unknown): string {
  let str = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvOrderRecord {
  orderId: string;
  createdAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingCity?: string;
  shippingPincode?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  grandTotal?: number;
  trackingNumber?: string;
  customerNote?: string;
}

export function buildOrdersCsv(orders: CsvOrderRecord[]): string {
  const headers = [
    'Order ID',
    'Created At',
    'Customer Name',
    'Phone',
    'Email',
    'City',
    'Pincode',
    'Payment Method',
    'Payment Status',
    'Fulfillment Status',
    'Grand Total INR',
    'Tracking AWB',
    'Customer Note',
  ];

  const rows = orders.map((ord) =>
    [
      ord.orderId,
      ord.createdAt || '',
      ord.customerName || '',
      ord.customerPhone || '',
      ord.customerEmail || '',
      ord.shippingCity || '',
      ord.shippingPincode || '',
      ord.paymentMethod || '',
      ord.paymentStatus || '',
      ord.fulfillmentStatus || '',
      Number(ord.grandTotal || 0),
      ord.trackingNumber || '',
      ord.customerNote || '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

export const SHIVAMRIT_WHATSAPP_NUMBER = '919876543210';

export const HERO_INQUIRY_INTERESTS = [
  'Reiki, Astrology & Tarot Consultation',
  'Reiki Certification & Crystal Workshop',
  'Zodiac & Combination Bracelets (₹799)',
  'Single Crystal Bracelets (₹599) & Bath Salts (₹200)',
  'Custom Healing Bundle / Gift Set',
] as const;

export interface LeadInquiryInput {
  name: string;
  phone: string;
  email?: string;
  interest: string;
  message?: string;
  sourceSlide?: string;
}

export interface NormalizedLeadInquiry {
  name: string;
  phone: string;
  email: string;
  interest: string;
  message: string;
  sourceSlide: string;
}

export function validateLeadInquiry(input: LeadInquiryInput): {
  valid: boolean;
  error?: string;
  normalized?: NormalizedLeadInquiry;
} {
  const cleanName = String(input?.name || '').trim().slice(0, 120);
  if (cleanName.length < 2) {
    return { valid: false, error: 'Please enter your full name (at least 2 characters).' };
  }

  const rawPhone = String(input?.phone || '').trim();
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, error: 'Please enter a valid 10-digit WhatsApp mobile number.' };
  }
  const normalizedPhone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

  const cleanEmail = String(input?.email || '').trim().toLowerCase().slice(0, 160);
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { valid: false, error: 'Please enter a valid email address or leave email blank.' };
  }

  const cleanInterest =
    String(input?.interest || '').trim().slice(0, 120) || HERO_INQUIRY_INTERESTS[0];
  const cleanMessage = String(input?.message || '').trim().slice(0, 500);
  const cleanSourceSlide = String(input?.sourceSlide || 'hero-slideshow').trim().slice(0, 60);

  return {
    valid: true,
    normalized: {
      name: cleanName,
      phone: normalizedPhone,
      email: cleanEmail,
      interest: cleanInterest,
      message: cleanMessage,
      sourceSlide: cleanSourceSlide,
    },
  };
}

export function buildWhatsAppInquiryUrl(
  lead: {
    leadId?: string;
    name: string;
    phone: string;
    email?: string;
    interest: string;
    message?: string;
  },
  whatsappNumber: string = SHIVAMRIT_WHATSAPP_NUMBER
): string {
  const targetDigits = whatsappNumber.replace(/\D/g, '') || SHIVAMRIT_WHATSAPP_NUMBER;
  const lines = [
    'Namaste ShivAmrit Healers,',
    'I would like to submit an inquiry from your website:',
    lead.leadId ? `Inquiry Ref: ${lead.leadId}` : '',
    `Name: ${lead.name.trim()}`,
    `WhatsApp / Mobile: ${lead.phone.trim()}`,
    lead.email?.trim() ? `Email: ${lead.email.trim()}` : '',
    `Interested In: ${lead.interest.trim()}`,
    lead.message?.trim() ? `Details: ${lead.message.trim()}` : '',
  ].filter(Boolean);

  return `https://wa.me/${targetDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function sanitizeSheetCell(value: unknown): string {
  const str = value == null ? '' : String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function formatLeadSheetRow(lead: {
  leadId: string;
  createdAt: string;
  name: string;
  phone: string;
  email?: string;
  interest: string;
  message?: string;
  sourceSlide?: string;
}): string[] {
  return [
    sanitizeSheetCell(lead.leadId),
    sanitizeSheetCell(lead.createdAt),
    sanitizeSheetCell(lead.name),
    sanitizeSheetCell(lead.phone),
    sanitizeSheetCell(lead.email || ''),
    sanitizeSheetCell(lead.interest),
    sanitizeSheetCell(lead.message || ''),
    sanitizeSheetCell(lead.sourceSlide || 'hero-slideshow'),
    'New Inquiry',
  ];
}
