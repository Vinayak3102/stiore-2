import React, { useEffect, useState } from 'react';
import {
  X,
  Truck,
  RotateCcw,
  ShieldCheck,
  BookOpen,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export type InfoModalTab = 'shipping' | 'returns' | 'privacy' | 'journal';

interface InfoPagesModalProps {
  isOpen: boolean;
  initialTab?: InfoModalTab;
  onClose: () => void;
  onExploreCatalog?: () => void;
}

export const InfoPagesModal: React.FC<InfoPagesModalProps> = ({
  isOpen,
  initialTab = 'shipping',
  onClose,
  onExploreCatalog,
}) => {
  const [tab, setTab] = useState<InfoModalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-pages-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#18283e] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="size-5 text-[#f3d37a]" />
            <div>
              <h2 id="info-pages-title" className="font-serif text-lg font-bold">
                ShivAmrit Healers Policies &amp; Healing Journal
              </h2>
              <p className="text-[11px] text-white/75">
                Transparent store care, shipping commitments &amp; crystal wellness guides
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close policies and journal dialog"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-2.5 flex gap-2 overflow-x-auto bg-slate-50 text-xs">
          {[
            { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
            { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw },
            { id: 'privacy', label: 'Privacy & Terms', icon: ShieldCheck },
            { id: 'journal', label: 'Crystal & Reiki Journal', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as InfoModalTab)}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
                  tab === item.id
                    ? 'bg-[#18283e] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs leading-relaxed text-slate-700">
          {tab === 'shipping' && (
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#18283e]">
                Pan-India Shipping &amp; Vedic Consecration Timeline
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#fbf9f5] border border-slate-200">
                  <strong className="block text-[#18283e] mb-1">Dispatch &amp; Cleansing</strong>
                  Every bracelet, crystal, and bath salt jar undergoes Vedic Prana Pratishtha cleansing within 24–48 hours of order confirmation before insured courier handover.
                </div>
                <div className="p-4 rounded-xl bg-[#fbf9f5] border border-slate-200">
                  <strong className="block text-[#18283e] mb-1">Shipping Rates</strong>
                  Orders of <strong>₹999 or above</strong> qualify automatically for complimentary express shipping across India (or apply code <code className="font-mono font-bold">FREESHIP</code>). Orders below ₹999 carry a flat ₹99 insured courier fee.
                </div>
              </div>
              <ul className="space-y-2 list-disc pl-5">
                <li>Metro cities (Mumbai, Delhi NCR, Bengaluru, Surat, Ahmedabad, Pune): typically 3–5 business days after dispatch.</li>
                <li>Rest of India: 5–7 business days via tracked express courier partners.</li>
                <li>Use <strong>Track Order</strong> anytime with your Order ID and registered mobile number or email to inspect live status and download your itemized GST/store invoice.</li>
              </ul>
            </div>
          )}

          {tab === 'returns' && (
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#18283e]">
                Cancellations, Returns &amp; Refund Policy
              </h3>
              <p>
                We inspect every stone bead and jar before dispatch. If anything arrives damaged or incorrect, or if your plans change before dispatch, you can take direct action inside <strong>Track Order</strong>:
              </p>
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Instant Self-Service Cancellation:</strong> Orders in <em>Processing</em> or <em>Packed</em> state (prior to courier handover) can be cancelled directly in Track Order with immediate stock release and full refund initiation for prepaid orders.
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">7-Day Transit Damage / Wrong Item Return:</strong> Once marked <em>Delivered</em>, submit a return request inside Track Order within 7 days. Opened consecrated bath salts cannot be returned unless damaged in transit.
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Refund Timelines:</strong> Approved prepaid Razorpay refunds are credited back to the original UPI/card/bank source within 5–7 business days.
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#18283e]">
                Customer Privacy &amp; Terms of Service
              </h3>
              <p>
                ShivAmrit Healers respects your personal privacy and spiritual journey. Your saved courier address, order history, and consultation booking notes are stored strictly for order fulfillment and requested session coordination.
              </p>
              <ul className="space-y-2 list-disc pl-5">
                <li><strong>Payment Security:</strong> Online UPI/Card payments are processed exclusively through Razorpay with server-side amount verification and HMAC signature checks. Card or UPI PIN details are never stored on our servers.</li>
                <li><strong>Newsletter Consent:</strong> Email updates are sent only with explicit opt-in consent and can be stopped anytime by replying or writing to our support desk.</li>
                <li><strong>Wellness Disclaimer:</strong> Natural gemstones, Rudraksha beads, bath salts, Reiki healing, and Tarot/Astrology sessions are offered as traditional mindful and spiritual wellness practices, not substitutes for licensed medical diagnosis or clinical care.</li>
              </ul>
            </div>
          )}

          {tab === 'journal' && (
            <JournalReaderSection
              onExploreCatalog={() => {
                onClose();
                if (onExploreCatalog) onExploreCatalog();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface JournalArticle {
  id: string;
  category: 'Crystal Care' | 'Reiki & Chakras' | 'Zodiac Guide' | 'Bath Rituals';
  readTime: string;
  title: string;
  summary: string;
  body: string[];
  recommendedNote: string;
}

const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    id: 'recharge-zodiac-bracelets',
    category: 'Crystal Care',
    readTime: '4 min read',
    title: 'How to Cleanse & Recharge Zodiac Crystal Bracelets Safely',
    summary:
      'Step-by-step care routine using Selenite plates, Himalayan salt proximity, and full-moon stillness to keep natural quartz and Pyrite vibrant.',
    body: [
      'Natural earth-mined stones absorb dust, skin oils, and ambient stress during daily wear. Gentle physical and symbolic cleansing once every two weeks preserves both lustre and mindful intention.',
      'For porous or metallic minerals such as Pyrite, Selenite, and Lapis Lazuli, avoid soaking in water or harsh detergents. Instead, wipe gently with a dry soft cloth and rest the bracelet overnight on a Consecrated Selenite slab or beside singing bowl vibrations.',
      'Before wearing your bracelet again in the morning, hold it between both palms for three slow breaths and silently affirm a clear daily intention aligned with your Rashi combination stones.',
    ],
    recommendedNote: 'Available in Single Stone (₹599) and Zodiac Combination (₹799) collections.',
  },
  {
    id: 'himalayan-reiki-bath-salt',
    category: 'Bath Rituals',
    readTime: '3 min read',
    title: '5-Minute Evening Foot Soak with Consecrated Reiki Salt (₹200)',
    summary:
      'Turn the final five minutes before sleep into an unloading ritual using mineral Himalayan crystal salts and aromatic botanicals.',
    body: [
      'Modern schedules leave the nervous system alert late into the evening. A warm mineral foot soak stimulates peripheral relaxation while creating a conscious boundary between work and rest.',
      'Dissolve 2 tablespoons of ShivAmrit Negative Energy Remover or Aura Booster Consecrated Bath Salt (₹200 per jar) in a basin of comfortably warm water. Sit upright without screens for 5 to 10 minutes while focusing on slow nasal exhalations.',
      'Rinse feet with clean water, pat dry, and step straight into quiet evening rest.',
    ],
    recommendedNote: 'All 5 Consecrated Bath Salt varieties are ₹200 each.',
  },
  {
    id: 'single-vs-combination',
    category: 'Zodiac Guide',
    readTime: '5 min read',
    title: 'Choosing ₹599 Single Crystal vs ₹799 Zodiac Combination Bracelets',
    summary:
      'Compare focused single-mineral intentions like Golden Pyrite or Amethyst against dual-stone Vedic Rashi pairings.',
    body: [
      'Pick a ₹599 Single Crystal Bracelet when you want concentrated symbolic support for one goal—such as Golden Pyrite for workplace confidence, Amethyst for calm focus, or Rose Quartz for self-compassion.',
      'Pick a ₹799 Combination Bracelet when you prefer complementary mineral energies calibrated for your Vedic moon or sun sign (Mesha through Meena), 7-Chakra alignment, or Triple Protection shielding.',
      'Many seekers wear a Single Crystal bracelet on the receiving (non-dominant) wrist and pair their Zodiac Combination bracelet during consultations or meditative practice.',
    ],
    recommendedNote: 'Every ShivAmrit Combination & Zodiac Bracelet is fixed at ₹799.',
  },
  {
    id: 'reiki-chakra-grounding',
    category: 'Reiki & Chakras',
    readTime: '4 min read',
    title: 'Understanding Natural Stone Inclusions & Reiki Prana Pratishtha',
    summary:
      'Why subtle internal veils confirm genuine mineral origin and how Grandmaster Parul Suthar consecrates every studio batch.',
    body: [
      'Unlike dyed glass or synthetic resin beads, natural quartz, Garnet, and Labradorite display delicate internal clouding, mineral bands, and cool initial touch.',
      'At the ShivAmrit Healers studio, finished strands and Himalayan salts undergo sound vibration cleansing and Vedic Prana Pratishtha recitation before insured dispatch across India.',
      'Note that crystals, bath salts, and Reiki sessions complement personal mindfulness and spiritual reflection and are never a substitute for licensed clinical medical care.',
    ],
    recommendedNote: 'Book a 1-on-1 Reiki or Tarot consultation directly from the Hero desk.',
  },
];

const JournalReaderSection: React.FC<{ onExploreCatalog: () => void }> = ({
  onExploreCatalog,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string>(JOURNAL_ARTICLES[0].id);

  const categories = ['All', 'Crystal Care', 'Bath Rituals', 'Zodiac Guide', 'Reiki & Chakras'];
  const visibleArticles =
    selectedCategory === 'All'
      ? JOURNAL_ARTICLES
      : JOURNAL_ARTICLES.filter((a) => a.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#18283e]">
            ShivAmrit Crystal &amp; Reiki Journal
          </h3>
          <p className="text-slate-500">
            Original educational ritual guides curated by Reiki Grandmaster Parul Suthar
          </p>
        </div>
        <button
          type="button"
          onClick={onExploreCatalog}
          className="px-3.5 py-2 bg-[#18283e] text-white rounded-lg font-bold hover:bg-[#121e30] cursor-pointer"
        >
          Browse Bracelets &amp; Salts →
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#e07038] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleArticles.map((article) => {
          const isOpen = expandedId === article.id;
          return (
            <article
              key={article.id}
              className="rounded-xl border border-slate-200 bg-[#fbf9f5] p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#e07038]">
                  {article.category} · {article.readTime}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? '' : article.id)}
                  className="text-[11px] font-bold text-[#18283e] underline underline-offset-2 cursor-pointer"
                >
                  {isOpen ? 'Collapse Article' : 'Read Full Guide'}
                </button>
              </div>
              <h4 className="font-serif text-base font-bold text-[#18283e]">
                {article.title}
              </h4>
              <p className="text-slate-600">{article.summary}</p>
              {isOpen && (
                <div className="pt-2 border-t border-stone-200 space-y-2.5 text-slate-700">
                  {article.body.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-emerald-800">
                      {article.recommendedNote}
                    </span>
                    <button
                      type="button"
                      onClick={onExploreCatalog}
                      className="px-3 py-1.5 rounded-lg bg-[#18283e] text-white font-bold hover:bg-[#121e30] cursor-pointer"
                    >
                      Explore Store Collection →
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

