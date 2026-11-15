import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Truck,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileSpreadsheet,
  Gem,
} from 'lucide-react';
import {
  HERO_INQUIRY_INTERESTS,
  validateLeadInquiry,
  formatLeadSheetRow,
} from '../utils/storeLogic';
import {
  getCachedSheetsAccessToken,
  getSavedSpreadsheetId,
  appendLeadRowsToSheet,
} from '../utils/googleSheets';
import { getAuthIdToken } from '../utils/authStorage';
import { studioHeroImg, showcaseAriesImg, showcaseVirgoImg } from '../data/storeProducts';

interface HeroSlide {
  id: 'consultations' | 'workshops' | 'crystals';
  stepLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  defaultInterest: string;
  image: string;
  imageAlt: string;
  highlights: string[];
  primaryLabel: string;
  secondaryLabel: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'consultations',
    stepLabel: '01 · Consultations',
    eyebrow: '1-ON-1 GUIDED SESSIONS',
    title: 'Reiki, Astrology & Tarot Consultations',
    description:
      'Reserve a private slot with Grandmaster Parul Suthar for Reiki Healing, Crystal Guidance, Vedic Astrology, Akashic Record Reading, or Intuitive Tarot.',
    defaultInterest: HERO_INQUIRY_INTERESTS[0],
    image: studioHeroImg,
    imageAlt: 'Sacred crystal consultation desk at ShivAmrit Healers studio',
    highlights: ['Grandmaster Parul Suthar', 'Online & Surat Studio', '40–60 Min Guided Clarity'],
    primaryLabel: 'Book Consultation Slot',
    secondaryLabel: 'Track Existing Order',
  },
  {
    id: 'workshops',
    stepLabel: '02 · Workshops',
    eyebrow: 'LIVE COMMUNITY LEARNING',
    title: 'Reiki Certification & Crystal Workshops',
    description:
      'Join upcoming interactive Reiki Level 1 training, Crystal Cleansing & Zodiac Pairing Masterclasses, and 7-Chakra Sound Bath meditations.',
    defaultInterest: HERO_INQUIRY_INTERESTS[1],
    image: showcaseAriesImg,
    imageAlt: 'Crystal healing workshop and meditation circle setup',
    highlights: ['Live Interactive Training', 'Reiki Level 1 Certificate', 'Weekend Batches Open'],
    primaryLabel: 'View Workshops & Reserve Seat',
    secondaryLabel: 'Ask About Next Batch',
  },
  {
    id: 'crystals',
    stepLabel: '03 · Sacred Store',
    eyebrow: 'CONSECRATED CRYSTAL COLLECTION',
    title: 'Zodiac Bracelets & Ritual Salts',
    description:
      'Natural lab-certified Combination & Zodiac Bracelets (₹799), Single Crystal Bracelets (₹599), and Consecrated Bath Salts (₹200).',
    defaultInterest: HERO_INQUIRY_INTERESTS[2],
    image: showcaseVirgoImg,
    imageAlt: 'Consecrated ShivAmrit zodiac crystal bracelets and healing gift collection',
    highlights: ['Zodiac Combos ₹799', 'Single Crystals ₹599', 'Bath Salts ₹200'],
    primaryLabel: 'Shop Sacred Collection',
    secondaryLabel: 'Build Ritual Bundle',
  },
];

interface HeroSessionShowcaseProps {
  onBookConsultations: () => void;
  onViewWorkshops: () => void;
  onTrackOrder: () => void;
  onShopCatalog: () => void;
  onOpenBundleBuilder: () => void;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

export const HeroSessionShowcase: React.FC<HeroSessionShowcaseProps> = ({
  onBookConsultations,
  onViewWorkshops,
  onTrackOrder,
  onShopCatalog,
  onOpenBundleBuilder,
  userEmail = '',
  userName = '',
  userPhone = '',
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);

  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [email, setEmail] = useState(userEmail);
  const [interest, setInterest] = useState<string>(HERO_SLIDES[0].defaultInterest);
  const [interestLockedByUser, setInterestLockedByUser] = useState(false);
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedResult, setSubmittedResult] = useState<{
    leadId: string;
    whatsappUrl: string;
    sheetSynced: boolean;
    message: string;
  } | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (userName && !name) setName(userName);
    if (userPhone && !phone) setPhone(userPhone);
    if (userEmail && !email) setEmail(userEmail);
  }, [userName, userPhone, userEmail]);

  useEffect(() => {
    if (isPaused || isFormFocused || submittedResult) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % HERO_SLIDES.length;
        if (!interestLockedByUser) {
          setInterest(HERO_SLIDES[next].defaultInterest);
        }
        return next;
      });
    }, 6500);

    return () => window.clearInterval(timer);
  }, [isPaused, isFormFocused, submittedResult, interestLockedByUser]);

  const currentSlide = HERO_SLIDES[activeSlide];

  const selectSlide = (index: number) => {
    const wrapped = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
    setActiveSlide(wrapped);
    if (!interestLockedByUser) {
      setInterest(HERO_SLIDES[wrapped].defaultInterest);
    }
  };

  const focusInquiryForm = (presetInterest?: string) => {
    if (presetInterest) {
      setInterest(presetInterest);
      setInterestLockedByUser(true);
    }
    setSubmittedResult(null);
    nameInputRef.current?.focus();
    document.getElementById('hero-inquiry-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  };

  const handlePrimaryAction = () => {
    if (currentSlide.id === 'consultations') {
      onBookConsultations();
    } else if (currentSlide.id === 'workshops') {
      onViewWorkshops();
    } else {
      onShopCatalog();
    }
  };

  const handleSecondaryAction = () => {
    if (currentSlide.id === 'consultations') {
      onTrackOrder();
    } else if (currentSlide.id === 'workshops') {
      focusInquiryForm(HERO_INQUIRY_INTERESTS[1]);
    } else {
      onOpenBundleBuilder();
    }
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validateLeadInquiry({
      name,
      phone,
      email,
      interest,
      message,
      sourceSlide: currentSlide.id,
    });

    if (!validation.valid || !validation.normalized) {
      setError(validation.error || 'Please check your inquiry details.');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await getAuthIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers.Authorization = `Bearer ${idToken}`;

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers,
        body: JSON.stringify(validation.normalized),
      });
      const data = await res.json();
      if (!res.ok || !data?.lead) {
        setError(data?.error || 'Could not submit inquiry right now. Please try again.');
        return;
      }

      let syncedToSheet = Boolean(data.webhookSynced);

      // If an admin/user has connected Google Sheets in-memory with a Spreadsheet ID, append live immediately
      const sheetsToken = getCachedSheetsAccessToken();
      const savedSheetId = getSavedSpreadsheetId();
      if (!syncedToSheet && sheetsToken && savedSheetId) {
        try {
          const row = formatLeadSheetRow(data.lead);
          await appendLeadRowsToSheet(sheetsToken, savedSheetId, [row]);
          syncedToSheet = true;
          if (idToken) {
            await fetch('/api/admin/leads/mark-synced', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ leadIds: [data.lead.leadId] }),
            }).catch(() => {});
          }
        } catch {
          // Recorded in backend; admin can sync from Console anytime
        }
      }

      setSubmittedResult({
        leadId: data.lead.leadId,
        whatsappUrl: data.whatsappUrl,
        sheetSynced: syncedToSheet,
        message: syncedToSheet
          ? 'Your inquiry was recorded directly to our Google Sheet and is ready to send on WhatsApp.'
          : 'Your inquiry is saved to our studio desk & Google Sheet queue. Tap below to send directly on WhatsApp.',
      });
    } catch {
      setError('Network issue submitting inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="hero-session-shell"
      aria-label="ShivAmrit Healers Sessions, Workshops & Inquiry Hero"
    >
      <img
        src={currentSlide.image}
        alt={currentSlide.imageAlt}
        width={1920}
        height={640}
        className="hero-session-bg"
      />
      <div className="hero-session-scrim" />

      <div className="shell relative z-10 py-8 md:py-11">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* LEFT: INTERACTIVE SESSION SLIDESHOW */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/15 bg-[#101a2a]/80 backdrop-blur-md p-6 md:p-8 text-white shadow-2xl">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f3d37a]">
                  {currentSlide.eyebrow}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectSlide(activeSlide - 1)}
                    aria-label="Previous slide"
                    className="p-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 text-white transition cursor-pointer"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
                    className="p-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 text-white transition cursor-pointer"
                  >
                    {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectSlide(activeSlide + 1)}
                    aria-label="Next slide"
                    className="p-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 text-white transition cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-semibold leading-[1.12] text-white">
                {currentSlide.title}
              </h1>

              <p className="text-sm md:text-[15px] leading-relaxed text-slate-200 mt-3 max-w-xl">
                {currentSlide.description}
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-xs text-[#f3d37a] font-medium">
                {currentSlide.highlights.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Sparkles className="size-3.5 shrink-0" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>

              {/* CALL TO ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="px-5 py-3 bg-[#e07038] hover:bg-[#c95e28] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-lg cursor-pointer inline-flex items-center gap-2"
                >
                  {currentSlide.id === 'consultations' ? (
                    <Calendar className="size-4" />
                  ) : currentSlide.id === 'workshops' ? (
                    <Sparkles className="size-4" />
                  ) : (
                    <Gem className="size-4" />
                  )}
                  <span>{currentSlide.primaryLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSecondaryAction}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer inline-flex items-center gap-2"
                >
                  {currentSlide.id === 'consultations' && <Truck className="size-4 text-[#f3d37a]" />}
                  <span>{currentSlide.secondaryLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={() => focusInquiryForm(currentSlide.defaultInterest)}
                  className="px-3.5 py-2.5 text-xs font-semibold text-[#f3d37a] hover:text-white underline underline-offset-4 transition cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Quick Inquiry Form</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>

            {/* SLIDE SELECTOR STRIP + FEATURED DUAL SESSION QUICK CARDS */}
            <div className="mt-7 pt-5 border-t border-white/15 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="tablist" aria-label="Hero showcase slides">
                {HERO_SLIDES.map((slide, idx) => {
                  const isActive = idx === activeSlide;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => selectSlide(idx)}
                      className={`text-left px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#18283e] border-[#f3d37a] shadow-md'
                          : 'bg-white/5 text-white/85 border-white/15 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className={`block text-[10px] font-bold uppercase tracking-wider ${
                          isActive ? 'text-[#e07038]' : 'text-[#f3d37a]'
                        }`}
                      >
                        {slide.stepLabel}
                      </span>
                      <span className="block text-xs font-semibold truncate mt-0.5">
                        {slide.id === 'consultations'
                          ? 'Reiki, Astrology & Tarot'
                          : slide.id === 'workshops'
                          ? 'Reiki & Crystal Workshops'
                          : 'Bracelets & Bath Salts'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: DIRECT HERO LEAD INQUIRY FORM (GOOGLE SHEET + WHATSAPP) */}
          <div
            id="hero-inquiry-form"
            onFocus={() => setIsFormFocused(true)}
            onBlur={() => setIsFormFocused(false)}
            className="lg:col-span-5 rounded-2xl border border-amber-200/80 bg-[#fbf9f5] text-slate-900 p-5 md:p-6 shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e07038] block">
                    Priority Studio Desk
                  </span>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#18283e] leading-tight">
                    Session &amp; Crystal Inquiry
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md inline-flex items-center gap-1 shrink-0">
                  <FileSpreadsheet className="size-3" />
                  <span>Sheet + WhatsApp</span>
                </span>
              </div>

              {submittedResult ? (
                <div className="py-4 space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                      <CheckCircle2 className="size-5 shrink-0" />
                      <span>Inquiry Recorded ({submittedResult.leadId})</span>
                    </div>
                    <p className="text-xs leading-relaxed text-emerald-900">
                      {submittedResult.message}
                    </p>
                  </div>

                  <a
                    href={submittedResult.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="size-4" />
                    <span>Send Inquiry Details on WhatsApp</span>
                    <ArrowRight className="size-4" />
                  </a>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onBookConsultations}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition cursor-pointer"
                    >
                      Pick Exact Time Slot
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedResult(null);
                        setMessage('');
                      }}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition cursor-pointer"
                    >
                      New Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitInquiry} className="space-y-3 mt-3.5" noValidate>
                  {error && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                    >
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="hero-lead-name" className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="hero-lead-name"
                        ref={nameInputRef}
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#18283e]"
                      />
                    </div>
                    <div>
                      <label htmlFor="hero-lead-phone" className="block text-[11px] font-semibold text-slate-700 mb-1">
                        WhatsApp Number *
                      </label>
                      <input
                        id="hero-lead-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile"
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#18283e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="hero-lead-interest" className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Session or Product Interest *
                    </label>
                    <select
                      id="hero-lead-interest"
                      value={interest}
                      onChange={(e) => {
                        setInterest(e.target.value);
                        setInterestLockedByUser(true);
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#18283e]"
                    >
                      {HERO_INQUIRY_INTERESTS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="hero-lead-email" className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      id="hero-lead-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#18283e]"
                    />
                  </div>

                  <div>
                    <label htmlFor="hero-lead-message" className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Preferred Date, Sign or Question
                    </label>
                    <textarea
                      id="hero-lead-message"
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. Reiki slot this Sunday, or Zodiac recommendation for Aries"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#18283e] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#18283e] hover:bg-[#121e30] disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Saving Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="size-4 text-[#f3d37a]" />
                        <span>Submit Inquiry &amp; Open WhatsApp</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <p className="text-[10.5px] text-slate-500 mt-3 pt-2.5 border-t border-stone-200 leading-snug">
              All inquiries are saved securely to our studio lead sheet and prepared for instant WhatsApp guidance with Grandmaster Parul Suthar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
