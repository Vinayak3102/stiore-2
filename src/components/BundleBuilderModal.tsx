import React, { useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  ShoppingBag,
  Truck,
  Gem,
  Leaf,
  Plus,
} from 'lucide-react';
import { ZODIAC_PRODUCTS, type ProductItem } from '../data/storeProducts';
import { calculateBundleSummary } from '../utils/storeLogic';

interface BundleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveInventoryMap?: Record<string, { inventory: number; active: boolean }>;
  onAddBundleToCart: (products: ProductItem[]) => void;
}

export const BundleBuilderModal: React.FC<BundleBuilderModalProps> = ({
  isOpen,
  onClose,
  liveInventoryMap,
  onAddBundleToCart,
}) => {
  const bracelets = useMemo(
    () =>
      ZODIAC_PRODUCTS.filter(
        (p) =>
          p.braceletType === 'combination' ||
          p.braceletType === 'single' ||
          p.category === 'Combination Bracelets' ||
          p.category === 'Single Crystal Bracelets' ||
          p.category === 'Zodiac Bracelets'
      ),
    []
  );

  const bathSalts = useMemo(
    () =>
      ZODIAC_PRODUCTS.filter(
        (p) => p.category === 'Botanicals' && (p.id.includes('bath-salt') || p.price === 200)
      ),
    []
  );

  const addOns = useMemo(
    () =>
      ZODIAC_PRODUCTS.filter(
        (p) =>
          p.category === 'Single Crystal Bracelets' ||
          p.category === 'Pendants' ||
          p.category === 'Sacred Artifacts'
      ).slice(0, 8),
    []
  );

  const [braceletFilter, setBraceletFilter] = useState<'all' | 'combination' | 'single'>('all');
  const [selectedBraceletId, setSelectedBraceletId] = useState<string>(
    bracelets[0]?.id || 'aries-bracelet'
  );
  const [selectedSaltId, setSelectedSaltId] = useState<string>(
    bathSalts[0]?.id || 'energy-booster-bath-salt'
  );
  const [selectedAddonId, setSelectedAddonId] = useState<string>('');

  const filteredBracelets = useMemo(() => {
    if (braceletFilter === 'all') return bracelets;
    return bracelets.filter((p) =>
      braceletFilter === 'combination'
        ? p.braceletType === 'combination' || p.category === 'Combination Bracelets'
        : p.braceletType === 'single' || p.category === 'Single Crystal Bracelets'
    );
  }, [bracelets, braceletFilter]);

  const selectedProducts = useMemo(() => {
    const list: ProductItem[] = [];
    const b = bracelets.find((p) => p.id === selectedBraceletId);
    if (b) list.push(b);
    const s = bathSalts.find((p) => p.id === selectedSaltId);
    if (s) list.push(s);
    if (selectedAddonId) {
      const a = addOns.find((p) => p.id === selectedAddonId);
      if (a) list.push(a);
    }
    return list;
  }, [bracelets, bathSalts, addOns, selectedBraceletId, selectedSaltId, selectedAddonId]);

  const summary = useMemo(
    () => calculateBundleSummary(selectedProducts, liveInventoryMap),
    [selectedProducts, liveInventoryMap]
  );

  if (!isOpen) return null;

  const isInStock = (item: ProductItem) => {
    const live = liveInventoryMap?.[item.id];
    return live ? live.active && live.inventory > 0 : item.stockStatus !== 'out';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bundle-builder-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#18283e] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-5 text-[#f3d37a]" />
            <div>
              <h2 id="bundle-builder-title" className="font-serif text-lg font-bold">
                Build Your Sacred Ritual Bundle
              </h2>
              <p className="text-[11px] text-white/75">
                Pair genuine ShivAmrit bracelets (₹599 / ₹799) &amp; Reiki Bath Salts (₹200) for ₹999 free express delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bundle builder"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Step 1: Bracelet */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-base font-bold text-[#18283e] flex items-center gap-2">
                <Gem className="size-4 text-[#e07038]" />
                <span>1. Choose Your Consecrated Bracelet</span>
              </h3>
              <div className="flex gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'combination', label: 'Combination (₹799)' },
                  { id: 'single', label: 'Single Stone (₹599)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBraceletFilter(opt.id as any)}
                    className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer transition ${
                      braceletFilter === opt.id
                        ? 'bg-[#18283e] text-white border-[#18283e]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredBracelets.map((item) => {
                const selected = selectedBraceletId === item.id;
                const available = isInStock(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedBraceletId(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      selected
                        ? 'border-[#18283e] bg-amber-50/70 ring-1 ring-[#18283e]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-11 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{item.sign}</p>
                      <span className="text-xs font-bold text-[#e07038]">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Bath Salt */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#18283e] flex items-center gap-2">
                <Leaf className="size-4 text-emerald-600" />
                <span>2. Pair with Consecrated Reiki Bath Salt (₹200)</span>
              </h3>
              {selectedSaltId && (
                <button
                  type="button"
                  onClick={() => setSelectedSaltId('')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Skip Bath Salt
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {bathSalts.map((salt) => {
                const selected = selectedSaltId === salt.id;
                const available = isInStock(salt);
                return (
                  <button
                    key={salt.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedSaltId(selected ? '' : salt.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-45 ${
                      selected
                        ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-emerald-800">₹{salt.price}</span>
                      {selected && <Check className="size-3.5 text-emerald-700" />}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-900 line-clamp-2">
                      {salt.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 3: Optional Add-on */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#18283e] flex items-center gap-2">
                <Plus className="size-4 text-[#d4af37]" />
                <span>3. Optional Spiritual Companion</span>
              </h3>
              {selectedAddonId && (
                <button
                  type="button"
                  onClick={() => setSelectedAddonId('')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Clear companion
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {addOns.map((addon) => {
                const selected = selectedAddonId === addon.id;
                const available = isInStock(addon);
                return (
                  <button
                    key={addon.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedAddonId(selected ? '' : addon.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer disabled:opacity-45 ${
                      selected
                        ? 'border-[#18283e] bg-amber-50/70 ring-1 ring-[#18283e]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={addon.image}
                      alt={addon.name}
                      className="size-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 truncate">{addon.name}</p>
                      <span className="text-[11px] font-bold text-[#e07038]">
                        ₹{addon.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Bottom Sticky Summary Bar */}
        <div className="border-t border-slate-200 bg-[#fbf9f5] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#18283e] text-sm">
                Bundle Subtotal ({summary.validItems.length} items): ₹
                {summary.subtotalInr.toLocaleString('en-IN')}
              </span>
              {summary.qualifiesForFreeShipping ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  <Truck className="size-3.5" /> FREE Express Shipping Unlocked
                </span>
              ) : (
                <span className="text-amber-800 font-semibold">
                  Add ₹{summary.amountToFreeShippingInr} more for FREE delivery
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600">
              Tip: Apply code <strong className="font-mono">FIRST10</strong> at checkout for ~₹
              {summary.firstOrder10SavingsInr} off (est. payable ₹
              {summary.estimatedTotalWithFirst10Inr.toLocaleString('en-IN')})
            </p>
          </div>

          <button
            type="button"
            disabled={summary.validItems.length === 0}
            onClick={() => {
              const inStockProducts = selectedProducts.filter((p) =>
                summary.validItems.some((v) => v.id === p.id)
              );
              if (inStockProducts.length > 0) {
                onAddBundleToCart(inStockProducts);
                onClose();
              }
            }}
            className="px-6 py-3 rounded-xl bg-[#18283e] hover:bg-[#121e30] text-white text-xs font-bold inline-flex items-center gap-2 transition shadow cursor-pointer disabled:opacity-50"
          >
            <ShoppingBag className="size-4 text-[#f3d37a]" />
            <span>Add Custom Ritual Bundle to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
