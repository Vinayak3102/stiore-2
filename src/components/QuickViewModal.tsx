import React, { useEffect, useState } from 'react';
import {
  X,
  Heart,
  Star,
  ShoppingBag,
  ShieldCheck,
  Zap,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Share2,
  Check,
} from 'lucide-react';
import type { ProductItem } from '../data/storeProducts';
import { getAuthIdToken, getCurrentUser } from '../utils/authStorage';

interface QuickViewModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onAddToCart: (product: ProductItem, qty: number) => void;
  onBuyNow: (product: ProductItem, qty: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
}

interface ApprovedReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [qty, setQty] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);
  const [liveStock, setLiveStock] = useState<{ inventory: number; stockStatus: string } | null>(null);
  const [reviews, setReviews] = useState<ApprovedReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQty(1);
    setSelectedImg(0);
    setReviewNotice('');
    setReviewError('');
    setShareCopied(false);
    setLiveStock(null);

    let active = true;
    setReviewsLoading(true);

    fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {
        if (active) setReviews([]);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    fetch('/api/catalog')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data?.products)) return;
        const found = data.products.find((p: any) => p.id === product.id);
        if (found) {
          setLiveStock({
            inventory: Number(found.inventory ?? 0),
            stockStatus: String(found.stockStatus || 'in'),
          });
        }
      })
      .catch(() => {
        // Fallback silently
      });

    return () => {
      active = false;
    };
  }, [product]);

  if (!product) return null;

  const images = product.images?.length > 0 ? product.images : [product.image];
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  const isOutOfStock = liveStock ? liveStock.stockStatus === 'out' || liveStock.inventory <= 0 : false;
  const maxQty = liveStock ? Math.max(1, Math.min(50, liveStock.inventory)) : 50;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewNotice('');

    const user = getCurrentUser();
    const token = await getAuthIdToken();
    if (!user || !token) {
      setReviewError('Please sign in first to submit a customer review.');
      return;
    }
    if (reviewComment.trim().length < 5) {
      setReviewError('Please write at least 5 characters for your review.');
      return;
    }

    setReviewBusy(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data?.error || 'Could not submit review.');
      } else {
        setReviewComment('');
        setReviewNotice(data?.message || 'Thank you! Review submitted.');
        if (data?.review?.approved) {
          setReviews((prev) => [data.review, ...prev]);
        }
      }
    } catch {
      setReviewError('Connection error while submitting review.');
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl text-slate-900 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-20 grid size-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white hover:text-slate-950 transition"
        >
          <X className="size-5" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Product Image Gallery */}
          <div className="bg-[#f9f8f5] p-6 flex flex-col justify-between items-center border-b md:border-b-0 md:border-r border-slate-200">
            <div className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-lg bg-white shadow-inner flex items-center justify-center">
              <img
                src={images[selectedImg] || product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-all duration-300"
              />
              {discountPercent > 0 && (
                <span className="absolute top-3 left-3 bg-[#e07038] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImg(idx)}
                    className={`size-14 rounded-md overflow-hidden border-2 transition ${
                      selectedImg === idx ? 'border-[#18283e] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details & Actions */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 md:pr-9">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
                  {product.sign} • {product.signHi}
                </span>
                <button
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`grid size-8 place-items-center rounded-full border transition ${
                    isWishlisted ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <Heart className={`size-4 ${isWishlisted ? 'fill-red-600' : ''}`} />
                </button>
              </div>

              <h2 id="quick-view-title" className="font-serif text-2xl font-semibold text-[#18283e] mt-1">
                {product.name}
              </h2>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-slate-700">{product.rating}</span>
                <span className="text-xs text-slate-400">
                  ({reviews.length > 0 ? `${reviews.length} verified` : 'New arrival'})
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3 mt-4">
                <span className="font-serif text-3xl font-bold text-[#18283e]">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-slate-400 line-through">
                    ₹{product.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {isOutOfStock ? (
                  <span className="text-xs text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                    Currently Out of Stock
                  </span>
                ) : (
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    {liveStock ? `In Stock (${liveStock.inventory} left) & Consecrated` : 'In Stock & Consecrated'}
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed text-slate-600 mt-4">{product.description}</p>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-slate-400 font-medium">Stone Type:</span>
                  <span className="font-semibold text-slate-800">{product.stoneType}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Bead Size:</span>
                  <span className="font-semibold text-slate-800">{product.size}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-300 rounded-lg">
                  <button
                    disabled={qty <= 1 || isOutOfStock}
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="size-9 grid place-items-center text-slate-700 hover:bg-slate-100 rounded-l-lg disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                  <button
                    disabled={qty >= maxQty || isOutOfStock}
                    onClick={() => setQty(Math.min(maxQty, qty + 1))}
                    className="size-9 grid place-items-center text-slate-700 hover:bg-slate-100 rounded-r-lg disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <button
                  disabled={isOutOfStock}
                  onClick={() => {
                    onAddToCart(product, qty);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#18283e] hover:bg-[#121e30] disabled:opacity-50 text-white py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition shadow cursor-pointer"
                >
                  <ShoppingBag className="size-4" />
                  Add to Cart
                </button>
              </div>

              <button
                disabled={isOutOfStock}
                onClick={() => {
                  onBuyNow(product, qty);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#e07038] hover:bg-[#c95e28] disabled:opacity-50 text-white py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition shadow cursor-pointer"
              >
                <Zap className="size-4" />
                Buy Now (Instant Checkout)
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-600" /> 100% Authentic Crystal · Vedic Attuned
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(product.id)}`;
                    navigator.clipboard?.writeText(url).catch(() => {});
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-[#18283e] font-semibold hover:text-[#e07038] cursor-pointer"
                >
                  {shareCopied ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
                  <span>{shareCopied ? 'Link Copied' : 'Share Product'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Reviews Section */}
        <div className="border-t border-slate-200 bg-[#fbf9f5] px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-[#18283e] flex items-center gap-2">
              <MessageSquare className="size-4 text-[#e07038]" />
              <span>Customer Reviews ({reviews.length})</span>
            </h3>
          </div>

          {reviewsLoading ? (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" /> Loading reviews...
            </p>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-slate-500">
              No published reviews for this artifact yet. Signed-in customers can share their experience below.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {reviews.slice(0, 4).map((rev) => (
                <div key={rev.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18283e]">{rev.authorName}</span>
                    {rev.verifiedPurchase && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`size-3 ${i < rev.rating ? 'fill-amber-400' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="flex flex-col sm:flex-row gap-2 pt-1">
            <select
              aria-label="Review rating"
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
            <input
              type="text"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your honest experience (sign in required)..."
              maxLength={400}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <button
              type="submit"
              disabled={reviewBusy}
              className="px-4 py-2 bg-[#18283e] hover:bg-[#121e30] text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {reviewBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span>Submit</span>
            </button>
          </form>

          {reviewError && <p className="text-[11px] text-rose-600 font-medium">{reviewError}</p>}
          {reviewNotice && (
            <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> {reviewNotice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
