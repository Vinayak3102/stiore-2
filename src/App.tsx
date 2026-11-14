/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Heart,
  UserRound,
  Eye,
  Minus,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Gem,
  Gift,
  HelpCircle,
  SlidersHorizontal,
  BookOpen,
  ArrowRight,
  Instagram,
  Facebook,
  MessageCircle,
  Menu,
  X,
  ShieldCheck,
  Check,
  Bell,
  CircleDot,
  Leaf,
  Layers,
  Flame,
} from 'lucide-react';

import {
  ZODIAC_PRODUCTS,
  STONE_CATEGORIES,
  BRAND_TAGLINE,
  ANNOUNCEMENT_TEXT,
  logoImg,
  studioHeroImg,
  showcaseAriesImg,
  showcaseVirgoImg,
  bannerZodiacImg,
  bannerGiftImg,
  bannerEverydayImg,
  type ProductItem,
} from './data/storeProducts';

import { QuickViewModal } from './components/QuickViewModal';
import { CartDrawer, type CartLineItem } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { SearchModal } from './components/SearchModal';
import { ChakraQuizModal } from './components/ChakraQuizModal';
import { AuthModal } from './components/AuthModal';
import type { UserProfile } from './types/auth';
import { getCurrentUser } from './utils/authStorage';

export default function App() {
  // Navigation & Page State
  const [activeNav, setActiveNav] = useState<'home' | 'zodiac' | 'shop' | 'about' | 'contact' | 'faq'>('home');
  const [giftGuideTab, setGiftGuideTab] = useState<'combination' | 'single' | 'salts' | 'gifting' | 'zodiac' | 'stones'>('combination');
  const [selectedStoneFilter, setSelectedStoneFilter] = useState<string | null>(null);

  // Modals & Drawers
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChakraQuizOpen, setIsChakraQuizOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [braceletDropdownOpen, setBraceletDropdownOpen] = useState(false);
  const [crystalDropdownOpen, setCrystalDropdownOpen] = useState(false);
  const [customiseDropdownOpen, setCustomiseDropdownOpen] = useState(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // User Profile & Authentication with saved Courier Address
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register' | 'profile'>('login');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('shivamrit-auth-change', syncUser);
    return () => window.removeEventListener('shivamrit-auth-change', syncUser);
  }, []);

  // Cart & Wishlist persistence
  const [cartItems, setCartItems] = useState<CartLineItem[]>(() => {
    try {
      const saved = localStorage.getItem('shivamrit-cart');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Default starting cart item matching screenshot
    return [{ product: ZODIAC_PRODUCTS[0], qty: 1 }];
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shivamrit-wishlist');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return ['aries-bracelet', 'gemini-bracelet'];
  });

  // Quantity counters for inline product cards
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});

  // Accordion state for FAQs
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Newsletter feedback state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  // Persist Cart
  useEffect(() => {
    try {
      localStorage.setItem('shivamrit-cart', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  // Persist Wishlist
  useEffect(() => {
    try {
      localStorage.setItem('shivamrit-wishlist', JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  // Total cart count
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  // Close dropdowns on click outside or escape key
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-dropdown-wrapper')) {
        setCustomiseDropdownOpen(false);
        setBraceletDropdownOpen(false);
        setCrystalDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCustomiseDropdownOpen(false);
        setBraceletDropdownOpen(false);
        setCrystalDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openProductQuickView = (productId: string) => {
    const found = ZODIAC_PRODUCTS.find((p) => p.id === productId);
    if (found) {
      setQuickViewProduct(found);
    }
  };

  // Helpers
  const getCardQty = (id: string) => cardQuantities[id] || 1;
  const setCardQty = (id: string, qty: number) => {
    setCardQuantities((prev) => ({ ...prev, [id]: Math.max(1, qty) }));
  };

  const handleAddToCart = (product: ProductItem, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { product, qty }];
    });
    setIsCartOpen(true);
  };

  const handleBuyNow = (product: ProductItem, qty = 1) => {
    handleAddToCart(product, qty);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleUpdateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, qty: newQty } : item))
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const scrollToGiftGuide = () => {
    document.getElementById('gift-guide')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filtered products for Gift Guide
  const giftGuideProducts = React.useMemo(() => {
    if (giftGuideTab === 'single') {
      return ZODIAC_PRODUCTS.filter(
        (p) => p.braceletType === 'single' || p.category === 'Single Crystal Bracelets'
      );
    }
    if (giftGuideTab === 'combination' || giftGuideTab === 'zodiac') {
      return ZODIAC_PRODUCTS.filter(
        (p) =>
          p.braceletType === 'combination' ||
          p.category === 'Combination Bracelets' ||
          p.category === 'Zodiac Bracelets'
      );
    }
    if (giftGuideTab === 'salts') {
      return ZODIAC_PRODUCTS.filter((p) => p.category === 'Botanicals');
    }
    if (giftGuideTab === 'stones') {
      return ZODIAC_PRODUCTS.filter(
        (p) => p.braceletType === 'single' || p.category === 'Single Crystal Bracelets'
      );
    }
    return ZODIAC_PRODUCTS.filter(
      (p) => p.category === 'Gift Sets' || p.category === 'Pendants' || p.bestseller
    );
  }, [giftGuideTab]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased">
      {/* 1. ANNOUNCEMENT BAR (MEERANSHU STYLE) */}
      <div className="reference-announcement flex items-center justify-center px-4 py-2 gap-3 text-xs md:text-[13px] font-semibold text-white">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-amber-200" />
          <span>Get 10% Off your first sacred order | USE CODE: <strong>FIRST10</strong></span>
        </span>
        <span className="hidden md:inline text-white/40">•</span>
        <span className="hidden md:inline-flex items-center gap-1.5">
          <span>🌿 100% Consecrated Crystals & Energized Rudraksha</span>
        </span>
        <span className="hidden lg:inline text-white/40">•</span>
        <span className="hidden lg:inline-flex items-center gap-1.5">
          <span>🚚 Free Express Shipping across India over ₹999</span>
        </span>
      </div>

      {/* 2. MAIN HEADER (ENLARGED LOGO & PROMINENT NAVIGATION) */}
      <header className="reference-header">
        <div className="reference-header-inner px-4 sm:px-8">
          {/* Brand Logo & Name - Much bigger and prominent */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="reference-brand group"
          >
            <div className="relative">
              <img
                src={logoImg}
                alt="ShivAmrit Healers sacred logo"
                className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover p-1 bg-white/10 ring-2 ring-[#d4af37]/70 shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d4af37] text-[9px] font-black text-[#142438] shadow">
                🕉️
              </span>
            </div>
            <div>
              <strong className="text-xl md:text-[25px] font-bold tracking-wide text-white drop-shadow-sm font-serif">
                ShivAmrit Healers
              </strong>
              <small className="flex items-center gap-1.5 text-[9.5px] md:text-[10.5px] tracking-[0.26em] text-[#f3d37a] font-bold uppercase mt-0.5">
                <span>ALIGN</span> • <span>HEAL</span> • <span>EVOLVE</span>
              </small>
            </div>
          </a>

          {/* Desktop Navigation Links - Bigger, bolder & high impact */}
          <nav className="hidden lg:flex reference-desktop-nav" aria-label="Main Navigation">
            {/* 1. Home */}
            <button
              onClick={() => {
                setActiveNav('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={activeNav === 'home' ? 'reference-active font-bold text-[#f3d37a]' : ''}
            >
              Home
            </button>

            {/* 2. Customise Bracelet */}
            <div
              className="relative nav-dropdown-wrapper"
              onMouseEnter={() => setCustomiseDropdownOpen(true)}
              onMouseLeave={() => setCustomiseDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setCustomiseDropdownOpen((prev) => !prev);
                  setBraceletDropdownOpen(false);
                  setCrystalDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 transition-colors py-2 px-1 ${
                  customiseDropdownOpen || activeNav === 'zodiac'
                    ? 'reference-active font-semibold text-[#f3d37a]'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                <span>Customise Bracelet</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    customiseDropdownOpen ? 'rotate-180 text-[#f3d37a]' : 'opacity-70'
                  }`}
                />
              </button>

              {customiseDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-[#121f31]/95 border border-[#d4af37]/40 rounded-2xl shadow-2xl py-3 z-50 text-left backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/40">
                  <div className="px-4 py-1.5 border-b border-white/10 text-[10.5px] font-bold tracking-widest text-[#d4af37] uppercase flex items-center justify-between">
                    <span>12 Sacred Zodiac Alignments</span>
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#d4af37]/20 text-[#f3d37a]">
                      Vedic Energized
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-2.5 max-h-72 overflow-y-auto">
                    {ZODIAC_PRODUCTS.slice(0, 12).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCustomiseDropdownOpen(false);
                          openProductQuickView(item.id);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl text-left text-xs text-white/90 hover:text-[#f3d37a] hover:bg-white/10 transition group"
                      >
                        <span className="text-sm size-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#d4af37]/40">
                          {item.symbol}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-xs leading-tight text-white group-hover:text-[#f3d37a]">
                            {item.sign}
                          </p>
                          <p className="text-[10px] text-white/50">{item.signHi}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2.5 border-t border-white/10 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomiseDropdownOpen(false);
                        setIsChakraQuizOpen(true);
                      }}
                      className="w-full text-center py-2.5 px-3 bg-gradient-to-r from-[#d26726] to-[#e07038] hover:from-[#bf5b1f] hover:to-[#ce622d] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="size-3.5 text-amber-200" />
                      <span>Take Chakra Diagnostic Quiz</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Bracelet Dropdown */}
            <div
              className="relative nav-dropdown-wrapper"
              onMouseEnter={() => setBraceletDropdownOpen(true)}
              onMouseLeave={() => setBraceletDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setBraceletDropdownOpen((prev) => !prev);
                  setCustomiseDropdownOpen(false);
                  setCrystalDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 transition-colors py-2 px-1 ${
                  braceletDropdownOpen
                    ? 'reference-active font-semibold text-[#f3d37a]'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                <span>Bracelets</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    braceletDropdownOpen ? 'rotate-180 text-[#f3d37a]' : 'opacity-70'
                  }`}
                />
              </button>

              {braceletDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-76 bg-[#121f31]/95 border border-[#d4af37]/40 rounded-2xl shadow-2xl py-2.5 z-50 text-left backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/40">
                  <div className="px-4 py-1.5 border-b border-white/10 text-[10.5px] font-bold tracking-widest text-[#d4af37] uppercase">
                    Sacred Bracelet Collections
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBraceletDropdownOpen(false);
                        setGiftGuideTab('combination');
                        scrollToGiftGuide();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-white/90 hover:text-[#f3d37a] hover:bg-white/10 transition group"
                    >
                      <div className="size-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-300">
                        <Sparkles className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                            Combination Bracelets
                          </p>
                          <span className="text-[10px] bg-[#d4af37] text-slate-900 font-bold px-1.5 py-0.2 rounded-full">
                            ₹799
                          </span>
                        </div>
                        <p className="text-[10.5px] text-white/50">All 12 Zodiacs, 7 Chakra, Money Magnet & Shields</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBraceletDropdownOpen(false);
                        setGiftGuideTab('single');
                        scrollToGiftGuide();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-white/90 hover:text-[#f3d37a] hover:bg-white/10 transition group"
                    >
                      <div className="size-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
                        <Gem className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                            Single Crystal Bracelets
                          </p>
                          <span className="text-[10px] bg-emerald-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                            ₹599
                          </span>
                        </div>
                        <p className="text-[10.5px] text-white/50">Pure Amethyst, Pyrite, Citrine, Rose Quartz & Turquoise</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBraceletDropdownOpen(false);
                        openProductQuickView('chakra-bracelet');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-white/90 hover:text-[#f3d37a] hover:bg-white/10 transition group"
                    >
                      <div className="size-8 rounded-lg bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0 text-rose-300">
                        <CircleDot className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                          7 Chakra Balance Combination
                        </p>
                        <p className="text-[10.5px] text-white/50">Lava stone & 7 semi-precious balancing crystals • ₹799</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBraceletDropdownOpen(false);
                        openProductQuickView('karungali-bracelet');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-white/90 hover:text-[#f3d37a] hover:bg-white/10 transition group"
                    >
                      <div className="size-8 rounded-lg bg-amber-600/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-200">
                        <Flame className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                          Consecrated Karungali Ebony Wood
                        </p>
                        <p className="text-[10.5px] text-white/50">Black ebony beads blessed for Mars energy & shield • ₹599</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Crystals Dropdown (High-End Luxury Redesign) */}
            <div
              className="relative nav-dropdown-wrapper"
              onMouseEnter={() => setCrystalDropdownOpen(true)}
              onMouseLeave={() => setCrystalDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setCrystalDropdownOpen((prev) => !prev);
                  setCustomiseDropdownOpen(false);
                  setBraceletDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 transition-colors py-2 px-1 ${
                  crystalDropdownOpen
                    ? 'reference-active font-semibold text-[#f3d37a]'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                <span>Crystals</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    crystalDropdownOpen ? 'rotate-180 text-[#f3d37a]' : 'opacity-70'
                  }`}
                />
              </button>

              {crystalDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-84 bg-[#121f31]/95 border border-[#d4af37]/40 rounded-2xl shadow-2xl py-3 z-50 text-left backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/40">
                  <div className="px-4 py-1.5 border-b border-white/10 text-[10.5px] font-bold tracking-widest text-[#d4af37] uppercase flex items-center justify-between">
                    <span>Sacred Healing Crystals & Artifacts</span>
                    <span className="text-[9.5px] text-[#f3d37a]">100% Genuine</span>
                  </div>

                  <div className="p-2 space-y-1">
                    {/* Item 1: Raw Natural Clusters & Geodes */}
                    <button
                      type="button"
                      onClick={() => {
                        setCrystalDropdownOpen(false);
                        openProductQuickView('amethyst-geode');
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left text-white hover:text-[#f3d37a] hover:bg-white/10 transition group cursor-pointer"
                    >
                      <div className="size-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0 text-purple-300 group-hover:scale-105 transition-transform">
                        <Gem className="size-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                            Raw Natural Clusters & Geodes
                          </p>
                          <span className="text-[10px] font-mono text-[#d4af37]">₹1,899</span>
                        </div>
                        <p className="text-[11px] text-white/55 leading-relaxed mt-0.5">
                          Uncut Uruguayan amethyst caves & specimens for auric clearing
                        </p>
                      </div>
                    </button>

                    {/* Item 2: 7 Chakra Consecrated Pyramids */}
                    <button
                      type="button"
                      onClick={() => {
                        setCrystalDropdownOpen(false);
                        openProductQuickView('chakra-pyramid');
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left text-white hover:text-[#f3d37a] hover:bg-white/10 transition group cursor-pointer"
                    >
                      <div className="size-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 group-hover:scale-105 transition-transform">
                        <Layers className="size-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                            7 Chakra Consecrated Pyramids
                          </p>
                          <span className="text-[10px] font-mono text-[#d4af37]">₹1,499</span>
                        </div>
                        <p className="text-[11px] text-white/55 leading-relaxed mt-0.5">
                          Sacred geometric orgone generator with copper induction coil
                        </p>
                      </div>
                    </button>

                    {/* Item 3: Authentic 108 Rudraksha Malas */}
                    <button
                      type="button"
                      onClick={() => {
                        setCrystalDropdownOpen(false);
                        openProductQuickView('rudraksha-mala');
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left text-white hover:text-[#f3d37a] hover:bg-white/10 transition group cursor-pointer"
                    >
                      <div className="size-9 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center shrink-0 text-orange-300 group-hover:scale-105 transition-transform">
                        <CircleDot className="size-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                            Authentic 108 Rudraksha Malas
                          </p>
                          <span className="text-[10px] font-mono text-[#d4af37]">₹899</span>
                        </div>
                        <p className="text-[11px] text-white/55 leading-relaxed mt-0.5">
                          Panchamukhi prayer beads energized with Vedic Mahamrityunjaya
                        </p>
                      </div>
                    </button>

                    {/* Item 4: Handcrafted Singing Bowls */}
                    <button
                      type="button"
                      onClick={() => {
                        setCrystalDropdownOpen(false);
                        openProductQuickView('singing-bowl');
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left text-white hover:text-[#f3d37a] hover:bg-white/10 transition group cursor-pointer"
                    >
                      <div className="size-9 rounded-xl bg-yellow-500/20 border border-yellow-400/40 flex items-center justify-center shrink-0 text-yellow-300 group-hover:scale-105 transition-transform">
                        <Bell className="size-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-white group-hover:text-[#f3d37a]">
                            Handcrafted Singing Bowls
                          </p>
                          <span className="text-[10px] font-mono text-[#d4af37]">₹2,199</span>
                        </div>
                        <p className="text-[11px] text-white/55 leading-relaxed mt-0.5">
                          7-metal hand-hammered acoustic vessel for 432Hz deep sound healing
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="p-2 border-t border-white/10 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCrystalDropdownOpen(false);
                        document.getElementById('sacred-store-products')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full text-center py-2 px-3 bg-white/10 hover:bg-white/15 text-[#f3d37a] font-semibold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Explore All Crystals & Salt Session</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Bath Salts / Botanicals (Special ₹200 Session) */}
            <button
              type="button"
              onClick={() => {
                setCrystalDropdownOpen(false);
                document.getElementById('salt-session')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="py-2 px-1 text-white/90 hover:text-white transition flex items-center gap-1.5"
            >
              <span>Bath Salts</span>
              <span className="text-[10px] bg-[#d4af37] text-slate-900 font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                ₹200
              </span>
            </button>

            {/* 6. Combos */}
            <button
              type="button"
              onClick={() => {
                setGiftGuideTab('gifting');
                scrollToGiftGuide();
              }}
              className="py-2 px-1 text-white/90 hover:text-white transition"
            >
              Combos
            </button>

            {/* 7. Chakra Diagnostic Quiz */}
            <button
              onClick={() => setIsChakraQuizOpen(true)}
              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200"
            >
              <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
              <span>Chakra Quiz</span>
            </button>

            {/* 8. About */}
            <button
              onClick={() => setAboutModalOpen(true)}
              className={activeNav === 'about' ? 'reference-active' : ''}
            >
              About
            </button>

            {/* 9. Contact */}
            <button
              onClick={() => setContactModalOpen(true)}
              className={activeNav === 'contact' ? 'reference-active' : ''}
            >
              Contact
            </button>
          </nav>

          {/* Header Action Tools */}
          <div className="reference-header-tools">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="reference-search"
              aria-label="Search crystals and bracelets"
              title="Search store"
            >
              <Search className="size-4 shrink-0 text-white/90" />
              <span className="font-normal text-white/85 hidden sm:inline text-xs">I'm looking for...</span>
            </button>

            <button
              onClick={() => {
                if (currentUser) {
                  setAuthModalInitialMode('profile');
                } else {
                  setAuthModalInitialMode('login');
                }
                setAuthModalOpen(true);
              }}
              aria-label={currentUser ? `Account: ${currentUser.name}` : "Sign in / Register"}
              title={
                currentUser
                  ? `Signed in as ${currentUser.name} (${currentUser.courierAddress?.streetAddress ? 'Saved Courier Address ✓' : 'Add Courier Address'})`
                  : "Sign In / Register (Save Courier Address for 1-Click Purchase)"
              }
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all text-xs text-white border border-white/15"
            >
              <UserRound className="size-4 text-[#d4af37]" />
              <span className="font-medium max-w-[110px] truncate hidden md:inline">
                {currentUser ? `Namaste, ${currentUser.name.split(' ')[0]}` : 'Sign In'}
              </span>
              {currentUser?.courierAddress?.streetAddress && (
                <span className="hidden xl:inline text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                  Address Saved
                </span>
              )}
            </button>

            <button
              onClick={() => setWishlistModalOpen(true)}
              aria-label="Wishlist items"
              className="relative hover:scale-110 transition-transform"
              title="Saved Wishlist"
            >
              <Heart className={`size-5 ${wishlist.length > 0 ? 'fill-[#e07038] text-[#e07038]' : ''}`} />
              {wishlist.length > 0 && <span className="tool-badge">{wishlist.length}</span>}
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Shopping Cart"
              className="relative hover:scale-110 transition-transform"
              title="View Cart"
            >
              <ShoppingBag className="size-5 text-[#d4af37]" />
              {cartCount > 0 && <span className="tool-badge">{cartCount}</span>}
            </button>

            {/* Mobile / Tablet Hamburger Button (Always visible on screens < 1024px) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center focus:outline-none"
              aria-label="Toggle navigation menu"
              title="Menu"
            >
              {isMobileMenuOpen ? <X className="size-5 text-[#d4af37]" /> : <Menu className="size-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#121e30]/98 backdrop-blur-xl border-t border-slate-700/80 px-5 py-4 space-y-3 text-sm shadow-2xl">
            <button
              onClick={() => {
                setActiveNav('home');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              Home
            </button>
            <button
              onClick={() => {
                setActiveNav('zodiac');
                setIsMobileMenuOpen(false);
                setGiftGuideTab('combination');
                scrollToGiftGuide();
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              <span className="flex items-center justify-between">
                <span>✨ Combination Bracelets (12 Signs)</span>
                <span className="text-[10px] bg-[#d4af37] text-slate-900 font-bold px-2 py-0.5 rounded-full">
                  ₹799
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setGiftGuideTab('single');
                scrollToGiftGuide();
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              <span className="flex items-center justify-between">
                <span>💎 Single Crystal Bracelets</span>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                  ₹599
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                document.getElementById('shop-by-stone')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              🔮 Crystals & Raw Minerals
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                document.getElementById('sacred-store-products')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              <span className="flex items-center justify-between">
                <span>🌿 Botanicals & Reiki Salts</span>
                <span className="text-[10px] bg-[#d4af37] text-slate-900 font-bold px-2 py-0.5 rounded-full">
                  ₹200 Each
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setGiftGuideTab('gifting');
                scrollToGiftGuide();
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              🎁 Combos & Gift Sets
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (currentUser) {
                  setAuthModalInitialMode('profile');
                } else {
                  setAuthModalInitialMode('login');
                }
                setAuthModalOpen(true);
              }}
              className="flex items-center justify-between w-full text-left py-2 px-3 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition"
            >
              <span className="flex items-center gap-2">
                <UserRound className="size-4 text-[#d4af37]" />
                <span>{currentUser ? `Account: ${currentUser.name}` : 'Sign In / Register'}</span>
              </span>
              <span className="text-[10px] text-[#d4af37] font-medium">
                {currentUser?.courierAddress?.streetAddress ? 'Address Saved ✓' : '1-Click Checkout'}
              </span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsChakraQuizOpen(true);
              }}
              className="block w-full text-left py-1 text-amber-300 font-bold hover:text-amber-200"
            >
              ✨ Take Chakra Energy Quiz
            </button>
            <button
              onClick={() => {
                setAboutModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              About Grandmaster Parul
            </button>
            <button
              onClick={() => {
                setContactModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              Contact Sanctuary
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                document.getElementById('homepage-faq')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="block w-full text-left py-1 text-white font-semibold hover:text-[#d4af37]"
            >
              FAQ
            </button>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION */}
      <section className="reference-hero" aria-label="ShivAmrit crystal bracelets hero">
        <img
          src={studioHeroImg}
          alt="Artisan jeweller crafting authentic natural gemstone bracelets with raw crystal beads"
          width={1920}
          height={640}
          className="reference-hero-photo"
        />
        <div className="reference-hero-shade" />
        <div className="shell reference-hero-inner">
          <h1>ShivAmrit Healers</h1>
          <p className="hero-tagline">{BRAND_TAGLINE}</p>
          <p className="hero-description">
            Natural stone colours. A connection that feels personal.
            Find a bracelet inspired by your sign.
          </p>
          <button onClick={scrollToGiftGuide} className="hero-cta">
            Shop now
          </button>
        </div>
      </section>

      {/* 4. OUR CATEGORY (Row 1: Aries, Taurus, Gemini, Cancer, Leo, Virgo) */}
      <section className="reference-section bg-white" aria-labelledby="cat-heading-1">
        <div className="shell">
          <div className="reference-section-heading">
            <h2 id="cat-heading-1">Our Category</h2>
            <p>Find your sign. Find your stone.</p>
          </div>

          <div className="circle-category-row">
            {ZODIAC_PRODUCTS.slice(0, 6).map((product) => (
              <div
                key={product.id}
                onClick={() => setQuickViewProduct(product)}
                className="circle-category-card group"
              >
                <div className="circle-img-wrap">
                  <img
                    src={product.image}
                    alt={`${product.sign} crystal bracelet`}
                    width={200}
                    height={200}
                    loading="lazy"
                  />
                </div>
                <h3>{product.sign} Bracelets</h3>
                <p>
                  {product.signHi} · {product.stones.split(',').slice(0, 2).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. A GIFT FOR EVERY BOND (Row 2: Virgo, Libra, Scorpio, Sagittarius, Capricorn, Pisces) */}
      <section className="reference-section pt-0 bg-white" aria-labelledby="cat-heading-2">
        <div className="shell">
          <div className="reference-section-heading">
            <h2 id="cat-heading-2">A Gift for Every Bond</h2>
            <p>Thoughtful bracelets for the people who mean the most.</p>
          </div>

          <div className="circle-category-row">
            {[ZODIAC_PRODUCTS[5], ...ZODIAC_PRODUCTS.slice(6, 11)].map((product) => (
              <div
                key={product.id}
                onClick={() => setQuickViewProduct(product)}
                className="circle-category-card group"
              >
                <div className="circle-img-wrap">
                  <img
                    src={product.image}
                    alt={`${product.sign} crystal bracelet`}
                    width={200}
                    height={200}
                    loading="lazy"
                  />
                </div>
                <h3>{product.sign} Bracelets</h3>
                <p>
                  {product.signHi} · {product.stones.split(',').slice(0, 2).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. GIFT GUIDE SECTION WITH TABS AND 4-COLUMN PRODUCT GRID */}
      <section id="gift-guide" className="reference-section bg-[#fdfdfb]">
        <div className="shell">
          <div className="reference-section-heading">
            <h2>Gift Guide</h2>
            <p>A little meaning for someone special.</p>
          </div>

          {/* Filter Tabs */}
          <div className="gift-guide-tabs">
            <button
              onClick={() => setGiftGuideTab('combination')}
              className={`gift-guide-tab ${giftGuideTab === 'combination' || giftGuideTab === 'zodiac' ? 'active' : ''}`}
            >
              ✨ Combination Bracelets (₹799)
            </button>
            <button
              onClick={() => setGiftGuideTab('single')}
              className={`gift-guide-tab ${giftGuideTab === 'single' ? 'active' : ''}`}
            >
              💎 Single Crystal Bracelets (₹599)
            </button>
            <button
              onClick={() => setGiftGuideTab('salts')}
              className={`gift-guide-tab ${giftGuideTab === 'salts' ? 'active' : ''}`}
            >
              🌿 Bath Salts (₹200)
            </button>
            <button
              onClick={() => setGiftGuideTab('gifting')}
              className={`gift-guide-tab ${giftGuideTab === 'gifting' ? 'active' : ''}`}
            >
              🎁 Combos & Sets
            </button>
          </div>

          {/* Product Grid */}
          <div className="reference-product-grid">
            {giftGuideProducts.map((product) => {
              const qty = getCardQty(product.id);
              const isSaved = wishlist.includes(product.id);

              return (
                <article key={product.id} className="catalog-card">
                  <div className="catalog-card-image">
                    <img
                      src={product.image}
                      alt={product.name}
                      onClick={() => setQuickViewProduct(product)}
                      className="cursor-pointer"
                    />

                    {/* Stock status badge */}
                    <span className="catalog-stock">In Stock</span>

                    {/* Wishlist toggle */}
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      aria-label={isSaved ? `Unsave ${product.name}` : `Save ${product.name}`}
                      className={`catalog-heart ${isSaved ? 'active' : ''}`}
                    >
                      <Heart className={`size-3.5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>

                    {/* Hover actions */}
                    <div className="catalog-actions">
                      <button
                        onClick={() => setQuickViewProduct(product)}
                        aria-label={`Quick view ${product.name}`}
                        title="Quick View"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => handleAddToCart(product, qty)}
                        aria-label={`Add ${product.name} to cart`}
                        title="Add to Basket"
                      >
                        <ShoppingBag className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="catalog-card-copy">
                    <h3 onClick={() => setQuickViewProduct(product)}>
                      {product.name}
                    </h3>
                    <p className="catalog-sign">
                      {product.sign} · {product.signHi}
                    </p>
                    <p className="catalog-price">
                      ₹{product.price.toLocaleString('en-IN')}{' '}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <del>₹{product.compareAtPrice.toLocaleString('en-IN')}</del>
                      )}
                    </p>

                    <div className="catalog-quantity">
                      <button
                        onClick={() => setCardQty(product.id, qty - 1)}
                        disabled={qty <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span>{qty}</span>
                      <button
                        onClick={() => setCardQty(product.id, qty + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. SHOP BY COLLECTION (3 SPLIT BANNERS) */}
      <section className="reference-section bg-white">
        <div className="shell">
          <div className="reference-section-heading">
            <h2>Shop by Collection</h2>
          </div>

          <div className="collection-banner-grid">
            {/* Banner 1 */}
            <div
              onClick={() => {
                setGiftGuideTab('zodiac');
                scrollToGiftGuide();
              }}
              className="collection-banner group rounded-xl overflow-hidden shadow-md transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
            >
              <img
                src={bannerZodiacImg}
                alt="Zodiac Crystal Bracelets — Your sign, your story"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Banner 2 */}
            <div
              onClick={() => {
                setGiftGuideTab('gifting');
                scrollToGiftGuide();
              }}
              className="collection-banner group rounded-xl overflow-hidden shadow-md transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
            >
              <img
                src={bannerGiftImg}
                alt="A Thoughtful Gift — A little more personal"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Banner 3 */}
            <div
              onClick={() => {
                setGiftGuideTab('stones');
                scrollToGiftGuide();
              }}
              className="collection-banner group rounded-xl overflow-hidden shadow-md transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
            >
              <img
                src={bannerEverydayImg}
                alt="Everyday Stone Jewellery — Colours to make your own"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 8. SHOP BY STONE SPECIMEN (10 REAL MINERAL PHOTOGRAPHS) */}
      <section id="shop-by-stone" className="reference-section bg-[#fbf9f5]">
        <div className="shell">
          <div className="reference-section-heading">
            <h2>Shop by Stone</h2>
            <p>Explore geological authenticity, natural crystal vibrations, and mineral properties.</p>
          </div>

          <div className="stone-category-grid">
            {STONE_CATEGORIES.map((stone) => (
              <div
                key={stone.name}
                onClick={() => {
                  setSelectedStoneFilter(stone.name);
                  scrollToGiftGuide();
                }}
                className="stone-category-card group"
              >
                <div className="stone-img-wrap shadow-sm">
                  <img src={stone.image} alt={stone.name} loading="lazy" />
                </div>
                <h3>{stone.name}</h3>
                <p>{stone.hindi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. NAVY DIVIDER RIBBON */}
      <div className="reference-divider">
        <span>{BRAND_TAGLINE}</span>
        <span>•</span>
        <span>ZODIAC CRYSTAL BRACELETS</span>
        <span>•</span>
        <span className="hidden sm:inline">CHOSEN WITH MEANING</span>
      </div>

      {/* 10. PRODUCT SHOWCASE 1: THE ZODIAC EDIT (Large Featured Aries on Left, 4 Cards on Right) */}
      <section className="reference-section bg-white">
        <div className="shell">
          <div className="product-showcase">
            {/* Left Feature */}
            <div
              onClick={() => setQuickViewProduct(ZODIAC_PRODUCTS[0])}
              className="showcase-feature group shadow-md"
            >
              <img src={showcaseAriesImg} alt="Your sign, your bracelet featured showcase" />
              <div className="showcase-feature-glass">
                Your sign. Your bracelet.
                <small>Explore the edit →</small>
              </div>
            </div>

            {/* Right 4 Cards (Taurus, Gemini, Cancer, Leo) */}
            <div className="showcase-products">
              {ZODIAC_PRODUCTS.slice(1, 5).map((product) => {
                const qty = getCardQty(product.id);
                const isSaved = wishlist.includes(product.id);

                return (
                  <article key={product.id} className="catalog-card">
                    <div className="catalog-card-image">
                      <img
                        src={product.image}
                        alt={product.name}
                        onClick={() => setQuickViewProduct(product)}
                        className="cursor-pointer"
                      />
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className={`catalog-heart ${isSaved ? 'active' : ''}`}
                      >
                        <Heart className={`size-3 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>
                      <div className="catalog-actions">
                        <button onClick={() => setQuickViewProduct(product)}>
                          <Eye className="size-3.5" />
                        </button>
                        <button onClick={() => handleAddToCart(product, qty)}>
                          <ShoppingBag className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="catalog-card-copy">
                      <h3 onClick={() => setQuickViewProduct(product)}>
                        {product.name}
                      </h3>
                      <p className="catalog-sign">{product.sign} · {product.signHi}</p>
                      <p className="catalog-price">₹{product.price.toLocaleString('en-IN')}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 11. PRODUCT SHOWCASE 2: THE GIFTING EDIT (4 Cards on Left, Large Featured Virgo on Right - Reverse) */}
      <section className="reference-section bg-white pt-0">
        <div className="shell">
          <div className="product-showcase showcase-reverse">
            {/* Right Feature (Virgo) */}
            <div
              onClick={() => setQuickViewProduct(ZODIAC_PRODUCTS[5])}
              className="showcase-feature group shadow-md"
            >
              <img src={showcaseVirgoImg} alt="A gift that feels personal featured showcase" />
              <div className="showcase-feature-glass">
                A gift that feels personal
                <small>Explore the edit →</small>
              </div>
            </div>

            {/* Left 4 Cards (Libra, Scorpio, Sagittarius, Capricorn) */}
            <div className="showcase-products">
              {ZODIAC_PRODUCTS.slice(6, 10).map((product) => {
                const qty = getCardQty(product.id);
                const isSaved = wishlist.includes(product.id);

                return (
                  <article key={product.id} className="catalog-card">
                    <div className="catalog-card-image">
                      <img
                        src={product.image}
                        alt={product.name}
                        onClick={() => setQuickViewProduct(product)}
                        className="cursor-pointer"
                      />
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className={`catalog-heart ${isSaved ? 'active' : ''}`}
                      >
                        <Heart className={`size-3 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>
                      <div className="catalog-actions">
                        <button onClick={() => setQuickViewProduct(product)}>
                          <Eye className="size-3.5" />
                        </button>
                        <button onClick={() => handleAddToCart(product, qty)}>
                          <ShoppingBag className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="catalog-card-copy">
                      <h3 onClick={() => setQuickViewProduct(product)}>
                        {product.name}
                      </h3>
                      <p className="catalog-sign">{product.sign} · {product.signHi}</p>
                      <p className="catalog-price">₹{product.price.toLocaleString('en-IN')}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 12. THE SHIVAMRIT ASSURANCE */}
      <section className="assurance-section">
        <div className="shell">
          <div className="assurance-heading">
            <Sparkles className="size-8 text-[#d4af37]" />
            <div>
              <p>The ShivAmrit</p>
              <h2>Assurance</h2>
            </div>
            <Sparkles className="size-8 text-[#d4af37]" />
          </div>

          <div className="assurance-grid">
            <div className="assurance-item">
              <span className="assurance-icon">
                <Eye className="size-8" strokeWidth={1.4} />
              </span>
              <h3>Real Product Photos</h3>
              <p>Explore each listed design exactly as photographed.</p>
            </div>

            <div className="assurance-item">
              <span className="assurance-icon">
                <Gem className="size-8" strokeWidth={1.4} />
              </span>
              <h3>Stone Information</h3>
              <p>Know the genuine natural stones in your bracelet.</p>
            </div>

            <div className="assurance-item">
              <span className="assurance-icon">
                <Sparkles className="size-8" strokeWidth={1.4} />
              </span>
              <h3>Zodiac Inspired</h3>
              <p>Find a sign and planetary affinity that feels personal.</p>
            </div>

            <div className="assurance-item">
              <span className="assurance-icon">
                <ShoppingBag className="size-8" strokeWidth={1.4} />
              </span>
              <h3>Easy Browsing</h3>
              <p>Keep your choices in one unified shopping cart.</p>
            </div>

            <div className="assurance-item">
              <span className="assurance-icon">
                <Gift className="size-8" strokeWidth={1.4} />
              </span>
              <h3>Thoughtful Gifting</h3>
              <p>Choose with someone meaningful in mind.</p>
            </div>

            <div className="assurance-item">
              <span className="assurance-icon">
                <HelpCircle className="size-8" strokeWidth={1.4} />
              </span>
              <h3>Product Enquiries</h3>
              <p>Ask Grandmaster Parul about details that matter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 13. SHIVAMRIT FAVOURITES */}
      <section className="reference-section bg-white">
        <div className="shell">
          <div className="reference-section-heading">
            <h2>ShivAmrit Favourites</h2>
            <p>Natural colours. Personal stories. Your everyday bracelet.</p>
          </div>

          <div className="reference-product-grid">
            {ZODIAC_PRODUCTS.slice(2, 6).map((product) => {
              const qty = getCardQty(product.id);
              const isSaved = wishlist.includes(product.id);

              return (
                <article key={product.id} className="catalog-card">
                  <div className="catalog-card-image">
                    <img
                      src={product.image}
                      alt={product.name}
                      onClick={() => setQuickViewProduct(product)}
                      className="cursor-pointer"
                    />
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`catalog-heart ${isSaved ? 'active' : ''}`}
                    >
                      <Heart className={`size-3.5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <div className="catalog-actions">
                      <button onClick={() => setQuickViewProduct(product)}>
                        <Eye className="size-4" />
                      </button>
                      <button onClick={() => handleAddToCart(product, qty)}>
                        <ShoppingBag className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="catalog-card-copy">
                    <h3 onClick={() => setQuickViewProduct(product)}>
                      {product.name}
                    </h3>
                    <p className="catalog-sign">{product.sign} · {product.signHi}</p>
                    <p className="catalog-price">₹{product.price.toLocaleString('en-IN')}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 13B. SACRED SALT SESSION & HOLISTIC BOTANICALS */}
      <section
        id="sacred-store-products"
        className="reference-section bg-[#FAF8F5] border-y border-stone-200 scroll-mt-20 py-16"
      >
        <div id="salt-session" className="shell">
          <div className="reference-section-heading">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-100/90 border border-amber-300/80 rounded-full text-[#8e5e16] text-xs font-bold mb-3 shadow-xs">
              <Sparkles className="size-3.5 text-amber-600 animate-pulse" />
              <span>SACRED SALT SESSION • ALL VARIETIES ₹200 EACH</span>
            </div>
            <h2>Consecrated Aura & Bath Salt Collection</h2>
            <p className="max-w-2xl mx-auto text-slate-600 text-sm">
              Formulated with Himalayan mineral crystal salts, therapeutic epsom, and ancient Vedic mantras by Reiki Grandmaster Parul Suthar. ₹200 each with full Razorpay secure checkout.
            </p>
          </div>

          {/* 5 Special ₹200 Bath Salt Products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-14">
            {ZODIAC_PRODUCTS.filter((p) => p.category === 'Botanicals' && p.id.includes('bath-salt')).slice(0, 5).map((product) => {
              const qty = getCardQty(product.id);
              const isSaved = wishlist.includes(product.id);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                >
                  {/* Photo container */}
                  <div className="relative aspect-square overflow-hidden bg-stone-100 cursor-pointer">
                    <img
                      src={product.image}
                      alt={product.name}
                      onClick={() => setQuickViewProduct(product)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="bg-[#18283e] text-[#f3d37a] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        ₹200 ONLY
                      </span>
                    </div>
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`absolute top-2.5 right-2.5 size-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-sm transition hover:scale-110 ${
                        isSaved ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`size-4 ${isSaved ? 'fill-red-500' : ''}`} />
                    </button>
                  </div>

                  {/* Body copy */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-500 text-xs mb-1">
                        <span>★★★★★</span>
                        <span className="text-slate-400 text-[11px]">({product.reviewCount})</span>
                      </div>
                      <h3
                        onClick={() => setQuickViewProduct(product)}
                        className="font-serif text-sm font-bold text-slate-900 group-hover:text-[#e07038] transition cursor-pointer line-clamp-1"
                      >
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {product.shortDescription}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-serif text-lg font-bold text-[#18283e]">
                            ₹{product.price}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            ₹{product.compareAtPrice}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          SAVE 40%
                        </span>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
                        <span className="text-[11px] text-slate-500 px-2 font-medium">Qty:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCardQty(product.id, Math.max(1, qty - 1))}
                            className="size-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-slate-800">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setCardQty(product.id, qty + 1)}
                            className="size-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product, qty)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ShoppingBag className="size-3.5" />
                          <span>Add</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBuyNow(product, qty)}
                          className="w-full py-2 bg-[#18283e] hover:bg-[#121e30] text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-sm hover:shadow"
                        >
                          <span>Buy Now</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Consecrated Sacred Artifacts Banner */}
          <div className="bg-[#18283e] text-white rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div>
                <span className="text-xs font-bold text-[#f3d37a] uppercase tracking-wider block mb-1">
                  Vedic Consecration & Healing Artifacts
                </span>
                <h3 className="font-serif text-xl md:text-2xl font-bold text-white">
                  Handcrafted Singing Bowls, Pyramids & Rudraksha
                </h3>
                <p className="text-white/70 text-xs md:text-sm mt-1 max-w-xl">
                  Energized with traditional Prana Pratishtha Vedic rituals. Free expedited shipping on all sacred combo orders.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const bundleProducts = ZODIAC_PRODUCTS.filter((p) => p.category === 'Botanicals' && p.id.includes('bath-salt')).slice(0, 5);
                    bundleProducts.forEach((p) => handleAddToCart(p, 1));
                  }}
                  className="px-4 py-2.5 bg-[#f3d37a] hover:bg-[#e4c367] text-slate-900 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="size-4" />
                  <span>Add All 5 Salts (₹1,000)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 pt-6">
              {[
                { id: 'amethyst-geode', name: 'Raw Amethyst Geode', price: 1899, img: '/images/amethyst_geode.jpg' },
                { id: 'chakra-pyramid', name: '7 Chakra Pyramid', price: 1499, img: '/images/chakra_pyramid.jpg' },
                { id: 'rudraksha-mala', name: '108 Rudraksha Mala', price: 899, img: '/images/rudraksha_mala.jpg' },
                { id: 'singing-bowl', name: 'Tibetan Singing Bowl', price: 2199, img: '/images/singing_bowl.jpg' },
                { id: 'kumkumadi-oil', name: 'Kumkumadi Tailam', price: 999, img: '/images/kumkumadi_oil.jpg' },
                { id: 'bath-salt-cleanser', name: 'Reiki Salt (Jar)', price: 200, img: '/images/bath_salt_cleanser.jpg' },
              ].map((artifact) => {
                const prod = ZODIAC_PRODUCTS.find((p) => p.id === artifact.id);
                return (
                  <div
                    key={artifact.id}
                    onClick={() => {
                      if (prod) setQuickViewProduct(prod);
                      else openProductQuickView(artifact.id);
                    }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition cursor-pointer group"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-black/20">
                      <img
                        src={artifact.img}
                        alt={artifact.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{artifact.name}</p>
                    <p className="text-[11px] font-mono text-[#f3d37a] font-bold mt-0.5">₹{artifact.price.toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 14. CUSTOMER SAYS! (SAMPLE REVIEWS) */}
      <section className="reference-section bg-[#fcfbf9]">
        <div className="shell">
          <div className="reference-section-heading">
            <h2>Customer Says!</h2>
            <p>Sample content · real customer experiences & testimonials.</p>
          </div>

          <div className="review-grid">
            <div className="review-card">
              <span className="sample-review-label">Illustrative sample — verified customer</span>
              <h3>A personal choice</h3>
              <p>
                &ldquo;A bracelet chosen for its colours and zodiac connection — a small detail with a personal story that makes my mornings feel grounded.&rdquo;
              </p>
              <div
                onClick={() => setQuickViewProduct(ZODIAC_PRODUCTS[0])}
                className="review-product"
              >
                <img src={ZODIAC_PRODUCTS[0].image} alt="Aries Crystal Bracelet" />
                <div>
                  <span>Aries Crystal Bracelet</span>
                  <small>Explore bracelet →</small>
                </div>
              </div>
            </div>

            <div className="review-card">
              <span className="sample-review-label">Illustrative sample — verified customer</span>
              <h3>A thoughtful gift</h3>
              <p>
                &ldquo;A birthday gift inspired by their sign, with natural stone colours that suit their everyday style and arrived with beautiful blessing notes.&rdquo;
              </p>
              <div
                onClick={() => setQuickViewProduct(ZODIAC_PRODUCTS[1])}
                className="review-product"
              >
                <img src={ZODIAC_PRODUCTS[1].image} alt="Taurus Crystal Bracelet" />
                <div>
                  <span>Taurus Crystal Bracelet</span>
                  <small>Explore bracelet →</small>
                </div>
              </div>
            </div>

            <div className="review-card">
              <span className="sample-review-label">Illustrative sample — verified customer</span>
              <h3>Everyday inspiration</h3>
              <p>
                &ldquo;A simple piece to wear with favourite jewellery and a reminder of an intention that matters. The stone textures are remarkably soothing.&rdquo;
              </p>
              <div
                onClick={() => setQuickViewProduct(ZODIAC_PRODUCTS[2])}
                className="review-product"
              >
                <img src={ZODIAC_PRODUCTS[2].image} alt="Gemini Crystal Bracelet" />
                <div>
                  <span>Gemini Crystal Bracelet</span>
                  <small>Explore bracelet →</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 15. #INSTAGRAM GALLERY */}
      <section className="reference-section bg-white">
        <div className="shell">
          <div className="reference-section-heading">
            <h2>#Instagram</h2>
            <p>Tag @shivamrithealers to be featured in our conscious community gallery.</p>
          </div>

          <div className="instagram-grid">
            {ZODIAC_PRODUCTS.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => setQuickViewProduct(item)}
                className="instagram-card group"
              >
                <img src={item.image} alt={item.name} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 16. SERVICE BENEFITS */}
      <section className="service-benefits shell" aria-label="Shopping details">
        <div className="benefit-item">
          <div className="benefit-icon">
            <Search className="size-5" />
          </div>
          <h3>Find Your Sign</h3>
          <p>Browse zodiac designs in English and Hindi with planetary stones.</p>
        </div>

        <div className="benefit-item">
          <div className="benefit-icon">
            <SlidersHorizontal className="size-5" />
          </div>
          <h3>Your Kind of Stone</h3>
          <p>Compare colours, stones and current prices with transparent clarity.</p>
        </div>

        <div className="benefit-item">
          <div className="benefit-icon">
            <BookOpen className="size-5" />
          </div>
          <h3>Read the Details</h3>
          <p>Explore original photographs and accurate geological mineral information.</p>
        </div>

        <div className="benefit-item">
          <div className="benefit-icon">
            <Heart className="size-5" />
          </div>
          <h3>Choose with Meaning</h3>
          <p>Everyday wearable jewellery and thoughtful gifting that endures.</p>
        </div>
      </section>

      {/* 17. EDITORIAL INFORMATIONAL AREA */}
      <section className="shell storefront-information" aria-label="Crystal shopping guide">
        <article>
          <h2>Shop Crystal Bracelets Online in India</h2>
          <p>
            Finding a crystal bracelet begins with the details that speak to you: a colour, a stone, a zodiac sign or a personal memory. ShivAmrit Healers brings these choices together in a collection of zodiac-inspired natural stone jewellery. Browse the photographs, read the stone information and choose at your own pace.
          </p>
          <p>
            Our online collection keeps each bracelet&apos;s name, price and availability together, so you can compare pieces without moving between different catalogues. The photographs are a useful starting point; the description gives you more context about the design and its materials.
          </p>
        </article>

        <article>
          <h2>Natural Stones — Explore Colour, Texture and Meaning</h2>
          <p>
            Natural stones have their own visual character. Some show subtle bands, some have small inclusions, and others are appreciated for a clear or richly coloured surface. These differences are part of what makes stone jewellery interesting.
          </p>
          <ul>
            <li>Explore the stone names in each bracelet&apos;s product information.</li>
            <li>Compare light, dark and mixed-colour designs.</li>
            <li>Read the size and available details before adding a piece to your cart.</li>
            <li>Treat symbolic meanings as personal inspiration, not promised medical outcomes.</li>
          </ul>
        </article>

        <article>
          <h2>Get to Know ShivAmrit Healers</h2>
          <p>
            ALIGN • HEAL • EVOLVE is our brand tagline: an invitation to personal reflection, not a medical claim. ShivAmrit Healers focuses on zodiac-inspired crystal bracelets, visual simplicity and jewellery that can hold an individual meaning. Original product photography remains the basis for comparing each design.
          </p>
        </article>
      </section>

      {/* 18. FREQUENTLY ASKED QUESTIONS ACCORDION */}
      <section id="homepage-faq" className="shell reference-section pt-0">
        <div className="reference-section-heading">
          <h2>Frequently Asked Questions</h2>
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-slate-200">
          {[
            {
              q: 'How do I choose my zodiac bracelet?',
              a: 'Start with your zodiac sign, then explore the stone names, colours and product details. You can also choose a bracelet simply because you feel drawn to its style or mineral energy.',
            },
            {
              q: 'Can I shop by crystal or stone?',
              a: 'Yes. Choose a stone in the Shop by Stone section to browse matching bracelets and specimens. Our catalogue includes Selenite, Rose Quartz, Pyrite, Citrine, Amethyst, Lapis Lazuli, and Tiger Eye.',
            },
            {
              q: 'Will my bracelet look exactly like the photograph?',
              a: 'The photographs show our actual handcrafted designs on gold pedestals. Natural stones can vary slightly in colour, pattern and texture, meaning every piece is genuinely one of a kind.',
            },
            {
              q: 'How should I care for my bracelet?',
              a: 'Avoid harsh chemical detergents, swimming, and heavy impact. Wipe gently with a soft microfibre cloth and store in the complimentary pouch provided.',
            },
            {
              q: 'Are crystal bracelets a medical treatment?',
              a: 'No. Our bracelets are conscious jewellery pieces and sacred personal talismans. They are not intended to diagnose, treat, or prevent any clinical medical condition.',
            },
            {
              q: 'Where can I ask about sizing, delivery or an order?',
              a: 'Click the green WhatsApp button at the bottom right to connect directly with our support team, or visit our Contact Us page for immediate assistance.',
            },
          ].map((faq, idx) => (
            <div key={idx} className="faq-item">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="faq-trigger"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {openFaq === idx && (
                <div className="faq-content">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 19. MAIN FOOTER */}
      <footer className="reference-footer">
        <div className="shell reference-footer-grid">
          {/* Brand Col */}
          <div className="footer-brand">
            <img src={logoImg} alt="ShivAmrit Healers" width={80} height={80} />
            <h2>ShivAmrit Healers</h2>
            <p>{BRAND_TAGLINE}</p>
            <div className="footer-socials">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram className="size-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook className="size-4" />
              </a>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <MessageCircle className="size-4" />
              </a>
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h3>Explore</h3>
            <ul>
              <li>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Home
                </button>
              </li>
              <li>
                <button onClick={scrollToGiftGuide}>
                  Shop All
                </button>
              </li>
              <li>
                <button onClick={scrollToGiftGuide}>
                  Zodiac Bracelets
                </button>
              </li>
              <li>
                <button onClick={() => setAboutModalOpen(true)}>
                  About Us
                </button>
              </li>
            </ul>
          </div>

          {/* Information Links */}
          <div>
            <h3>Information</h3>
            <ul>
              <li>
                <button onClick={() => setContactModalOpen(true)}>
                  Contact Us
                </button>
              </li>
              <li>
                <button onClick={() => document.getElementById('homepage-faq')?.scrollIntoView({ behavior: 'smooth' })}>
                  FAQs & Care
                </button>
              </li>
              <li>
                <button onClick={() => setIsCartOpen(true)}>
                  Your Cart ({cartCount})
                </button>
              </li>
              <li>
                <button onClick={() => setWishlistModalOpen(true)}>
                  Wishlist ({wishlist.length})
                </button>
              </li>
            </ul>
          </div>

          {/* Stay in the Loop Newsletter */}
          <div>
            <h3>Stay in the Loop</h3>
            <p>Discover new bracelets, planetary stone stories and thoughtful gifting ideas.</p>
            <form
              className="newsletter-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail.includes('@')) {
                  setNewsletterMsg('Thank you for subscribing to ShivAmrit Blessings!');
                  setNewsletterEmail('');
                } else {
                  setNewsletterMsg('Please enter a valid email address.');
                }
              }}
            >
              <div className="newsletter-input">
                <input
                  type="email"
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
                <button type="submit" aria-label="Subscribe to newsletter">
                  <ArrowRight className="size-4" />
                </button>
              </div>
              <small>{newsletterMsg || 'News and sacred arrivals. Subscription service coming soon.'}</small>
            </form>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="shell reference-footer-bottom">
          <span>© 2026 ShivAmrit Healers. All rights reserved.</span>
          <span>Crystal jewellery · Personal meaning · Consecrated with Vedic Prana</span>
        </div>
      </footer>

      {/* 20. FLOATING WHATSAPP BUTTON */}
      {/* 20. FLOATING WHATSAPP BUTTON (MEERANSHU STYLE) */}
      <div className="fixed right-5 bottom-6 flex items-center z-50 group">
        <a
          href="https://wa.me/919876543210?text=Hello%20ShivAmrit%20Healers,%20I%20would%20like%20guidance%20on%20choosing%20my%20consecrated%20zodiac%20crystal%20bracelet."
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-decoration-none group cursor-pointer"
          aria-label="Chat on WhatsApp with Grandmaster Parul"
          title="Chat on WhatsApp"
        >
          <span className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 text-xs font-bold rounded-full shadow-xl border border-slate-200/90 group-hover:bg-amber-50 group-hover:text-amber-950 transition-all transform group-hover:-translate-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Need Help? Chat with us
          </span>
          <div className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 ring-4 ring-[#25D366]/20">
            <MessageCircle className="size-7" />
          </div>
        </a>
      </div>

      {/* 21. INTERACTIVE MODALS & DRAWERS */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        isWishlisted={quickViewProduct ? wishlist.includes(quickViewProduct.id) : false}
        onToggleWishlist={toggleWishlist}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderSuccess={() => {
          setCartItems([]);
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalInitialMode}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={ZODIAC_PRODUCTS}
        onSelectProduct={(p) => setQuickViewProduct(p)}
      />

      <ChakraQuizModal
        isOpen={isChakraQuizOpen}
        onClose={() => setIsChakraQuizOpen(false)}
        onAddToCart={(p) => {
          const matched = ZODIAC_PRODUCTS.find((z) => z.id.includes(p.id)) || ZODIAC_PRODUCTS[0];
          handleAddToCart(matched);
        }}
        onSelectProduct={(p) => {
          const matched = ZODIAC_PRODUCTS.find((z) => z.id.includes(p.id)) || ZODIAC_PRODUCTS[0];
          setQuickViewProduct(matched);
        }}
      />

      {/* Wishlist Modal */}
      {wishlistModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setWishlistModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-6 text-slate-900 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="font-serif text-xl font-bold text-[#18283e] flex items-center gap-2">
                <Heart className="size-5 text-red-500 fill-red-500" /> Your Saved Wishlist ({wishlist.length})
              </h3>
              <button onClick={() => setWishlistModalOpen(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 py-2">
              {wishlist.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">
                  No saved pieces yet. Tap the heart icon on any bracelet to save it for later.
                </p>
              ) : (
                ZODIAC_PRODUCTS.filter((p) => wishlist.includes(p.id)).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="size-12 rounded object-cover" />
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">{item.name}</h4>
                        <span className="text-[11px] text-slate-500">{item.sign} · ₹{item.price.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleAddToCart(item, 1);
                          setWishlistModalOpen(false);
                        }}
                        className="bg-[#18283e] text-white text-[11px] px-3 py-1.5 rounded font-semibold hover:bg-[#121e30]"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => toggleWishlist(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* About Us Modal */}
      {aboutModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setAboutModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 md:p-8 text-slate-900 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="" className="size-10 rounded-full" />
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#18283e]">About ShivAmrit Healers</h3>
                  <p className="text-[11px] text-[#d4af37] font-semibold">{BRAND_TAGLINE}</p>
                </div>
              </div>
              <button onClick={() => setAboutModalOpen(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-700 py-4 max-h-[65vh] overflow-y-auto">
              <p>
                Founded under the sacred guidance of certified <strong>Reiki Grandmaster Parul Suthar</strong>, ShivAmrit Healers is dedicated to making authentic, spiritually attuned natural stone jewelry accessible to conscious seekers across the globe.
              </p>
              <p>
                Every piece in our zodiac and gemstone collection begins with naturally mined mineral crystals—free from synthetic dyes or plastic composites. Prior to departure from our temple workshop, each bracelet rests on our sacred Himalayan salt bed and undergoes traditional <em>Prana Pratishtha</em> Vedic energization mantras.
              </p>
              <div className="bg-[#fbf9f5] border border-slate-200 p-4 rounded-lg space-y-2">
                <h4 className="font-serif text-sm font-bold text-[#18283e]">The 3 Sacred Pillars</h4>
                <div className="grid grid-cols-3 gap-3 text-center pt-2">
                  <div className="p-2 bg-white rounded border border-slate-100">
                    <span className="block font-bold text-[#e07038]">1. Authenticity</span>
                    <span className="text-[10px] text-slate-500">100% natural earth-mined stones</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-100">
                    <span className="block font-bold text-[#d4af37]">2. Consecration</span>
                    <span className="text-[10px] text-slate-500">Reiki cleansed & Vedic energized</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-100">
                    <span className="block font-bold text-[#18283e]">3. Integrity</span>
                    <span className="text-[10px] text-slate-500">Zero false promises or medical claims</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setAboutModalOpen(false)}
              className="w-full bg-[#18283e] text-white py-2.5 rounded-lg text-xs font-semibold hover:bg-[#121e30] transition mt-2"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {contactModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setContactModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 md:p-8 text-slate-900 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="font-serif text-xl font-bold text-[#18283e]">Contact ShivAmrit Healers</h3>
              <button onClick={() => setContactModalOpen(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Have questions regarding your zodiac sign, custom bead sizing, or order dispatch status? Reach out to our healing sanctuary directly.
              </p>

              <div className="space-y-3">
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition"
                >
                  <MessageCircle className="size-5 text-emerald-600" />
                  <div>
                    <span className="font-bold block">Instant WhatsApp Support</span>
                    <span className="text-[11px] text-emerald-700">+91 98765 43210 (10:00 AM – 7:00 PM IST)</span>
                  </div>
                </a>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-800 block">Sanctuary Email</span>
                  <p className="text-slate-600">contact@shivamrithealers.com</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-800 block">Dispatch Location</span>
                  <p className="text-slate-600">ShivAmrit Spiritual Center, Jaipur & Mumbai, India</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setContactModalOpen(false)}
              className="w-full bg-[#18283e] text-white py-2.5 rounded-lg text-xs font-semibold hover:bg-[#121e30] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
