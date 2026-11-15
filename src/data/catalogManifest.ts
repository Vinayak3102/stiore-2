import type { AuthoritativeProductRecord } from '../utils/storeLogic.ts';

export interface ConsultationServiceItem {
  id: string;
  name: string;
  nameHi: string;
  durationMinutes: number;
  fee: number;
  practitioner: string;
  description: string;
  availableSlots: string[];
}

export interface WorkshopItem {
  id: string;
  title: string;
  titleHi: string;
  dateLabel: string;
  timeLabel: string;
  fee: number;
  totalSeats: number;
  seatsBooked: number;
  instructor: string;
  description: string;
  active: boolean;
}

// Authoritative server-side catalog preserving ShivAmrit Healers products and approved pricing:
// - Single Crystal Bracelets: ₹599
// - Combination Bracelets (including all 12 Zodiac Bracelets): ₹799
// - Consecrated Bath Salts: ₹200
export const INITIAL_AUTHORITATIVE_PRODUCTS: AuthoritativeProductRecord[] = [
  // Combination Bracelets (₹799)
  { id: 'aries-bracelet', name: 'Aries Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 24, active: true },
  { id: 'taurus-bracelet', name: 'Taurus Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 19, active: true },
  { id: 'gemini-bracelet', name: 'Gemini Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 15, active: true },
  { id: 'cancer-bracelet', name: 'Cancer Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 18, active: true },
  { id: 'leo-bracelet', name: 'Leo Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 22, active: true },
  { id: 'virgo-bracelet', name: 'Virgo Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 14, active: true },
  { id: 'libra-bracelet', name: 'Libra Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 20, active: true },
  { id: 'scorpio-bracelet', name: 'Scorpio Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 16, active: true },
  { id: 'sagittarius-bracelet', name: 'Sagittarius Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 17, active: true },
  { id: 'capricorn-bracelet', name: 'Capricorn Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 14, active: true },
  { id: 'aquarius-bracelet', name: 'Aquarius Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 18, active: true },
  { id: 'pisces-bracelet', name: 'Pisces Crystal Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1199, inventory: 21, active: true },
  { id: 'chakra-bracelet', name: '7 Chakra Healing Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1299, inventory: 35, active: true },
  { id: 'money-magnet-bracelet', name: 'Money Magnet Wealth Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1299, inventory: 28, active: true },
  { id: 'triple-protection-bracelet', name: 'Triple Protection Shield Combination Bracelet', category: 'Combination Bracelets', price: 799, compareAtPrice: 1299, inventory: 32, active: true },

  // Single Crystal Bracelets (₹599)
  { id: 'amethyst-bracelet', name: 'Consecrated Amethyst Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 30, active: true },
  { id: 'rose-quartz-bracelet', name: 'Consecrated Rose Quartz Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 35, active: true },
  { id: 'pyrite-bracelet', name: 'Consecrated Golden Pyrite Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 40, active: true },
  { id: 'citrine-bracelet', name: 'Consecrated Yellow Citrine Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 26, active: true },
  { id: 'tiger-eye-bracelet', name: 'Consecrated Golden Tiger Eye Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 28, active: true },
  { id: 'clear-quartz-bracelet', name: 'Consecrated Clear Quartz (Sphatik) Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 30, active: true },
  { id: 'lapis-lazuli-bracelet', name: 'Consecrated Lapis Lazuli Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 22, active: true },
  { id: 'selenite-bracelet', name: 'Consecrated Selenite Auric Cleansing Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 25, active: true },
  { id: 'garnet-bracelet', name: 'Consecrated Red Garnet Vitality Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 20, active: true },
  { id: 'turquoise-bracelet', name: 'Natural Turquoise Protection Single Crystal Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 18, active: true },
  { id: 'karungali-bracelet', name: 'Consecrated Karungali Ebony Wood Single Bracelet', category: 'Single Crystal Bracelets', price: 599, compareAtPrice: 899, inventory: 19, active: true },

  // Bath Salts (₹200)
  { id: 'energy-booster-bath-salt', name: 'Energy Booster Consecrated Bath Salt', category: 'Botanicals', price: 200, compareAtPrice: 349, inventory: 60, active: true },
  { id: 'aura-booster-bath-salt', name: 'Aura Booster Consecrated Bath Salt', category: 'Botanicals', price: 200, compareAtPrice: 349, inventory: 55, active: true },
  { id: 'negative-energy-remover-bath-salt', name: 'Negative Energy Remover Bath Salt', category: 'Botanicals', price: 200, compareAtPrice: 349, inventory: 45, active: true },
  { id: 'health-booster-bath-salt', name: 'Health Booster Consecrated Bath Salt', category: 'Botanicals', price: 200, compareAtPrice: 349, inventory: 50, active: true },
  { id: 'coffee-bath-salt', name: 'Coffee Energizing Bath & Scrub Salt', category: 'Botanicals', price: 200, compareAtPrice: 349, inventory: 40, active: true },
  { id: 'bath-salt-cleanser', name: 'Aura Cleansing Himalayan Reiki Bath Salt', category: 'Botanicals', price: 200, compareAtPrice: 349, inventory: 40, active: true },
  { id: 'bath-salt-health', name: 'Health Booster Aromatic Bath Salt (Reiki Infused)', category: 'Botanicals', price: 200, compareAtPrice: 349, inventory: 28, active: true },

  // Sacred Artifacts & Accessories
  { id: 'tree-of-life-pendant', name: 'Tree of Life Sacred Wire Pendant', category: 'Pendants', price: 1199, compareAtPrice: 1699, inventory: 20, active: true },
  { id: 'crystal-gift-set', name: 'ShivAmrit Master Healing Gift Set', category: 'Gift Sets', price: 2999, compareAtPrice: 4499, inventory: 12, active: true },
  { id: 'amethyst-geode', name: 'Raw Natural Amethyst Geode Cluster', category: 'Crystals', price: 1899, compareAtPrice: 2899, inventory: 15, active: true },
  { id: 'chakra-pyramid', name: '7 Chakra Consecrated Orgone Pyramid', category: 'Crystals', price: 1499, compareAtPrice: 2299, inventory: 22, active: true },
  { id: 'rudraksha-mala', name: 'Authentic 108+1 Panchamukhi Rudraksha Mala', category: 'Sacred Artifacts', price: 899, compareAtPrice: 1499, inventory: 30, active: true },
  { id: 'singing-bowl', name: 'Handcrafted Tibetan Meditation Singing Bowl', category: 'Sacred Artifacts', price: 2199, compareAtPrice: 3299, inventory: 14, active: true },
  { id: 'kumkumadi-oil', name: 'Sacred 24k Gold Infused Kumkumadi Tailam', category: 'Botanicals', price: 999, compareAtPrice: 1599, inventory: 25, active: true },
];

export const CONSULTATION_SERVICES: ConsultationServiceItem[] = [
  {
    id: 'reiki-healing',
    name: 'Reiki Healing Session',
    nameHi: 'रेकी हीलिंग सत्र',
    durationMinutes: 45,
    fee: 1100,
    practitioner: 'Grandmaster Parul Suthar',
    description: 'Guided distance or in-studio Reiki relaxation session focused on chakra balance, calmness, and energetic alignment.',
    availableSlots: ['10:30 AM IST', '12:00 PM IST', '04:00 PM IST', '06:30 PM IST'],
  },
  {
    id: 'crystal-healing',
    name: 'Crystal Healing & Gemstone Guidance',
    nameHi: 'क्रिस्टल हीलिंग व रत्न मार्गदर्शन',
    durationMinutes: 40,
    fee: 999,
    practitioner: 'Grandmaster Parul Suthar',
    description: 'Personalized crystal selection and chakra alignment consultation tailored to your zodiac sign and life intentions.',
    availableSlots: ['11:00 AM IST', '02:30 PM IST', '05:00 PM IST', '07:00 PM IST'],
  },
  {
    id: 'astrology-solutions',
    name: 'Vedic Astrology Consultation',
    nameHi: 'वैदिक ज्योतिष परामर्श',
    durationMinutes: 45,
    fee: 1499,
    practitioner: 'ShivAmrit Jyotish Desk',
    description: 'Birth chart reflection, planetary period insights, and traditional crystal & mantra recommendations.',
    availableSlots: ['10:00 AM IST', '01:00 PM IST', '04:30 PM IST', '07:30 PM IST'],
  },
  {
    id: 'akashic-record',
    name: 'Akashic Record Reading',
    nameHi: 'आकाशिक रिकॉर्ड रीडिंग',
    durationMinutes: 60,
    fee: 2100,
    practitioner: 'Grandmaster Parul Suthar',
    description: 'Deep reflective spiritual reading exploring recurring patterns, life purpose themes, and clarity.',
    availableSlots: ['11:30 AM IST', '03:30 PM IST', '06:00 PM IST'],
  },
  {
    id: 'tarot-reading',
    name: 'Intuitive Tarot Card Reading',
    nameHi: 'टैरो कार्ड मार्गदर्शन',
    durationMinutes: 30,
    fee: 799,
    practitioner: 'Grandmaster Parul Suthar',
    description: 'Focused tarot spread for relationship, career, and personal decision clarity.',
    availableSlots: ['10:30 AM IST', '01:30 PM IST', '05:30 PM IST', '08:00 PM IST'],
  },
];

export const INITIAL_WORKSHOPS: WorkshopItem[] = [
  {
    id: 'reiki-level-1-workshop',
    title: 'Reiki Level 1 Foundation & Self-Healing Workshop',
    titleHi: 'रेकी लेवल १ आत्म-हीलिंग कार्यशाला',
    dateLabel: 'Sunday, 29 Nov 2026',
    timeLabel: '10:30 AM – 01:30 PM IST',
    fee: 1499,
    totalSeats: 25,
    seatsBooked: 8,
    instructor: 'Grandmaster Parul Suthar',
    description: 'Live interactive online + Surat studio session covering Reiki history, hand positions, chakra awareness, and daily mindfulness rituals.',
    active: true,
  },
  {
    id: 'crystal-cleansing-masterclass',
    title: 'Crystal Cleansing, Charging & Zodiac Pairing Masterclass',
    titleHi: 'क्रिस्टल शुद्धिकरण व राशि संयोजन मास्टरक्लास',
    dateLabel: 'Saturday, 05 Dec 2026',
    timeLabel: '04:00 PM – 06:00 PM IST',
    fee: 599,
    totalSeats: 40,
    seatsBooked: 14,
    instructor: 'Grandmaster Parul Suthar',
    description: 'Learn safe ways to cleanse crystals with Selenite, sound, and intention, plus how to pair single and combination bracelets.',
    active: true,
  },
  {
    id: 'sound-chakra-meditation',
    title: 'Guided 7-Chakra Singing Bowl & Breathwork Circle',
    titleHi: '७ चक्र नाद योग एवं ध्यान सत्र',
    dateLabel: 'Sunday, 13 Dec 2026',
    timeLabel: '06:30 PM – 08:00 PM IST',
    fee: 399,
    totalSeats: 30,
    seatsBooked: 11,
    instructor: 'ShivAmrit Healers Studio',
    description: 'Evening guided meditation using 7-metal Tibetan singing bowls for deep nervous system calm.',
    active: true,
  },
];
