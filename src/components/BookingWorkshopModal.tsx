import React, { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import type { ConsultationServiceItem, WorkshopItem } from '../data/catalogManifest';
import { CONSULTATION_SERVICES, INITIAL_WORKSHOPS } from '../data/catalogManifest';
import type { UserProfile } from '../types/auth';
import { getAuthIdToken } from '../utils/authStorage';

interface BookingWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'consultations' | 'workshops';
  currentUser: UserProfile | null;
}

export const BookingWorkshopModal: React.FC<BookingWorkshopModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'consultations',
  currentUser,
}) => {
  const [tab, setTab] = useState<'consultations' | 'workshops'>(initialTab);
  const [services, setServices] = useState<ConsultationServiceItem[]>(CONSULTATION_SERVICES);
  const [workshops, setWorkshops] = useState<WorkshopItem[]>(INITIAL_WORKSHOPS);

  // Consultation Form
  const [selectedServiceId, setSelectedServiceId] = useState(CONSULTATION_SERVICES[0].id);
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date(Date.now() + 86400000 * 2);
    return d.toISOString().slice(0, 10);
  });
  const [preferredSlot, setPreferredSlot] = useState(CONSULTATION_SERVICES[0].availableSlots[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingResult, setBookingResult] = useState<{
    bookingId: string;
    serviceName: string;
    preferredDate: string;
    preferredSlot: string;
    fee?: number;
  } | null>(null);

  // Workshop Registration Form
  const [selectedWorkshopId, setSelectedWorkshopId] = useState(INITIAL_WORKSHOPS[0].id);
  const [seats, setSeats] = useState(1);
  const [workshopResult, setWorkshopResult] = useState<{
    registrationId: string;
    workshopTitle: string;
    seats: number;
    amount?: number;
    totalFee?: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setBookingResult(null);
    setWorkshopResult(null);

    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.name || '');
      setCustomerPhone((prev) => prev || currentUser.mobile || '');
      setCustomerEmail((prev) => prev || currentUser.email || '');
    }

    fetch('/api/catalog')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.services?.length) {
          setServices(data.services);
        }
        if (data?.workshops?.length) {
          setWorkshops(data.workshops);
        }
      })
      .catch(() => {
        // Use initial manifest fallback cleanly
      });
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const activeService =
    services.find((s) => s.id === selectedServiceId) || services[0];
  const activeWorkshop =
    workshops.find((w) => w.id === selectedWorkshopId) || workshops[0];

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setBookingResult(null);
    setSubmitting(true);

    try {
      const token = await getAuthIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceId: selectedServiceId,
          customerName,
          customerPhone,
          customerEmail,
          preferredDate,
          preferredSlot,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.booking) {
        setErrorMsg(data?.error || 'Could not confirm slot. Try another time.');
      } else {
        setBookingResult(data.booking);
      }
    } catch {
      setErrorMsg('Connection error while booking consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setWorkshopResult(null);
    setSubmitting(true);

    try {
      const token = await getAuthIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/workshops/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workshopId: selectedWorkshopId,
          participantName: customerName,
          participantPhone: customerPhone,
          participantEmail: customerEmail,
          seats,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.registration) {
        setErrorMsg(data?.error || 'Could not complete workshop registration.');
      } else {
        setWorkshopResult(data.registration);
        if (data.workshop) {
          setWorkshops((prev) =>
            prev.map((w) => (w.id === data.workshop.id ? data.workshop : w))
          );
        }
      }
    } catch {
      setErrorMsg('Connection error while registering for workshop.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-workshop-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#18283e] text-white px-6 py-4 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close consultations and workshops"
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="size-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#f3d37a]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 id="booking-workshop-title" className="font-serif text-xl font-bold text-white">
                Healing Consultations & Workshops
              </h2>
              <p className="text-xs text-white/70">
                1-on-1 Reiki, Astrology, Tarot & live community workshops with Grandmaster Parul Suthar
              </p>
            </div>
          </div>

          <div className="flex bg-white/10 rounded-xl p-1 mt-4 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setTab('consultations');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition ${
                tab === 'consultations'
                  ? 'bg-white text-[#18283e] shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              1-on-1 Consultations
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('workshops');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition ${
                tab === 'workshops'
                  ? 'bg-white text-[#18283e] shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Live Workshops ({workshops.length})
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {tab === 'consultations' && (
            <>
              {bookingResult ? (
                <div className="text-center py-4 space-y-4">
                  <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#18283e]">
                    Consultation Slot Reserved
                  </h3>
                  <div className="bg-[#fbf9f5] border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Booking Reference:</span>
                      <span className="font-mono font-bold text-[#18283e]">
                        {bookingResult.bookingId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Session:</span>
                      <span className="font-semibold text-slate-900">
                        {bookingResult.serviceName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date & Slot:</span>
                      <span className="font-semibold text-slate-900">
                        {bookingResult.preferredDate} · {bookingResult.preferredSlot}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                      <span>Session Fee:</span>
                      <span className="text-[#18283e]">
                        ₹{(bookingResult.fee ?? activeService.fee).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingResult(null)}
                    className="px-5 py-2.5 bg-[#18283e] text-white text-xs font-bold rounded-xl"
                  >
                    Book Another Session
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookConsultation} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Healing Service
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setSelectedServiceId(service.id);
                            setPreferredSlot(service.availableSlots[0]);
                          }}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            selectedServiceId === service.id
                              ? 'border-[#18283e] bg-amber-50/60 ring-1 ring-[#18283e]'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-serif text-sm font-bold text-[#18283e]">
                              {service.name}
                            </span>
                            <span className="text-xs font-bold text-[#e07038] shrink-0">
                              ₹{service.fee.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {service.durationMinutes} mins · {service.practitioner}
                          </p>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {activeService.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label
                        htmlFor="booking-date"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Preferred Date *
                      </label>
                      <div className="relative">
                        <Calendar className="size-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          id="booking-date"
                          type="date"
                          required
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="booking-slot"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Preferred Time Slot *
                      </label>
                      <div className="relative">
                        <Clock className="size-4 text-slate-400 absolute left-3 top-2.5" />
                        <select
                          id="booking-slot"
                          value={preferredSlot}
                          onChange={(e) => setPreferredSlot(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          {activeService.availableSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label
                        htmlFor="booking-name"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Full Name *
                      </label>
                      <input
                        id="booking-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="booking-phone"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Mobile / WhatsApp *
                      </label>
                      <input
                        id="booking-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="booking-email"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Email ID
                      </label>
                      <input
                        id="booking-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label
                      htmlFor="booking-notes"
                      className="block font-bold text-slate-700 mb-1"
                    >
                      Intention / Question (Optional)
                    </label>
                    <textarea
                      id="booking-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Share your area of focus (e.g. career clarity, calm mind, birth details)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#18283e] hover:bg-[#121e30] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Reserving Slot...</span>
                      </>
                    ) : (
                      <span>
                        Confirm {activeService.name} Slot (₹{activeService.fee.toLocaleString('en-IN')})
                      </span>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {tab === 'workshops' && (
            <>
              {workshopResult ? (
                <div className="text-center py-4 space-y-4">
                  <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#18283e]">
                    Workshop Seat Confirmed
                  </h3>
                  <div className="bg-[#fbf9f5] border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registration ID:</span>
                      <span className="font-mono font-bold text-[#18283e]">
                        {workshopResult.registrationId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Workshop:</span>
                      <span className="font-semibold text-slate-900">
                        {workshopResult.workshopTitle}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Seats Reserved:</span>
                      <span className="font-semibold text-slate-900">{workshopResult.seats}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                      <span>Total Contribution:</span>
                      <span className="text-[#18283e]">
                        ₹
                        {(
                          workshopResult.totalFee ??
                          workshopResult.amount ??
                          activeWorkshop.fee * (workshopResult.seats || seats)
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWorkshopResult(null)}
                    className="px-5 py-2.5 bg-[#18283e] text-white text-xs font-bold rounded-xl"
                  >
                    Register for Another Workshop
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterWorkshop} className="space-y-4">
                  <div className="space-y-2.5">
                    {workshops.map((ws) => {
                      const remaining = Math.max(0, ws.totalSeats - ws.seatsBooked);
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => setSelectedWorkshopId(ws.id)}
                          className={`w-full p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            selectedWorkshopId === ws.id
                              ? 'border-[#18283e] bg-amber-50/60 ring-1 ring-[#18283e]'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-serif text-base font-bold text-[#18283e]">
                                {ws.title}
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {ws.dateLabel} · {ws.timeLabel} · {ws.instructor}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#e07038] shrink-0">
                              ₹{ws.fee.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">{ws.description}</p>
                          <div className="flex items-center justify-between mt-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <Users className="size-3.5" />
                              {remaining} of {ws.totalSeats} seats left
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <BookOpen className="size-3.5" />
                              {ws.titleHi}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="ws-name"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Participant Name *
                      </label>
                      <input
                        id="ws-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ws-phone"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Mobile *
                      </label>
                      <input
                        id="ws-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ws-seats"
                        className="block font-bold text-slate-700 mb-1"
                      >
                        Seats
                      </label>
                      <select
                        id="ws-seats"
                        value={seats}
                        onChange={(e) => setSeats(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Seat' : 'Seats'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#e07038] hover:bg-[#c95e28] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Reserving Seat...</span>
                      </>
                    ) : (
                      <span>
                        Reserve {seats} {seats === 1 ? 'Seat' : 'Seats'} for{' '}
                        {activeWorkshop.title.split(' ').slice(0, 3).join(' ')} (₹
                        {(activeWorkshop.fee * seats).toLocaleString('en-IN')})
                      </span>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
