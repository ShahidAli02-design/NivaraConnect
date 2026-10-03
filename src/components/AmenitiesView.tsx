import React, { useState, useEffect } from 'react';
import {
  Building2, Calendar, Clock, CheckCircle2,
  MapPin, Plus, Sparkles, Users, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { AmenityBooking } from '../types';

export const AmenitiesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [bookings, setBookings] = useState<AmenityBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState('Clubhouse Banquet');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('18:00 - 22:00 (Evening)');
  const [guestsCount, setGuestsCount] = useState(25);
  const [purpose, setPurpose] = useState('Birthday Celebration');
  const [isBooking, setIsBooking] = useState(false);
  const [requestSentMsg, setRequestSentMsg] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  const statusBadge: Record<string, string> = {
    'Confirmed': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Pending Approval': 'bg-amber-100 text-amber-800 border-amber-300',
    'Rejected': 'bg-rose-100 text-rose-800 border-rose-300',
    'Cancelled': 'bg-slate-100 text-slate-600 border-slate-300',
  };

  const amenitiesList = [
    {
      name: 'Clubhouse Banquet Hall',
      capacity: 'Up to 120 Guests',
      price: '₹2,500 / slot',
      slots: ['10:00 - 14:00 (Morning)', '14:00 - 18:00 (Afternoon)', '18:00 - 22:00 (Evening)'],
      description: 'Air-conditioned luxury banquet hall with stage, audio setup, and dining area.',
      image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Olympic Swimming Pool & Deck',
      capacity: 'Up to 40 Swimmers',
      price: 'Free for Residents',
      slots: ['06:00 - 09:00 (Morning)', '16:00 - 19:00 (Evening)', '19:00 - 21:00 (Night Adults)'],
      description: 'Temperature-controlled lap pool with certified lifeguard and lounge sun-deck.',
      image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Indoor Badminton / Squash Court',
      capacity: '4 Players / court',
      price: '₹150 / hour',
      slots: ['06:00 - 08:00 (Slot 1)', '17:00 - 19:00 (Slot 2)', '19:00 - 21:00 (Slot 3)'],
      description: 'Synthetic maple-wood floored international grade indoor court with LED floodlights.',
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Sky Lounge Rooftop Garden',
      capacity: 'Up to 60 Guests',
      price: '₹1,500 / slot',
      slots: ['17:00 - 20:00 (Sunset Slot)', '20:00 - 23:00 (Night Stargaze)'],
      description: 'Panoramic 14th floor landscaped terrace garden with BBQ counters and mood lighting.',
      image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80',
    }
  ];

  useEffect(() => {
    loadBookings();
  }, [refreshTrigger]);

  const loadBookings = async () => {
    try {
      const data = await api.getAmenityBookings();
      setBookings(data);
    } catch (e) {
      console.error('Failed to load bookings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    try {
      const selected = amenitiesList.find(a => a.name.includes(selectedAmenity.slice(0, 5))) || amenitiesList[0];
      const amount = selected.price.includes('Free') ? 0 : 2500;

      await api.createAmenityBooking({
        amenityName: selectedAmenity,
        apartmentId: currentUser.apartmentId || 'A-402',
        residentName: currentUser.name,
        date,
        timeSlot,
        guestsCount,
        purpose,
        amount,
      });

      triggerSound('success');
      setShowBookModal(false);
      setRequestSentMsg('Request sent to the Secretary. Your booking will be confirmed only after approval.');
      setTimeout(() => setRequestSentMsg(''), 6000);
      loadBookings();
    } catch (e) {
      console.error('Booking failed', e);
      window.alert('Could not send the booking request. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleReview = async (b: AmenityBooking, action: 'approve' | 'reject') => {
    if (reviewingId) return;
    let reason: string | undefined;
    if (action === 'reject') {
      const input = window.prompt(`Reject ${b.residentName}'s request for ${b.amenityName}? Optionally add a reason:`, '');
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    setReviewingId(b.id);
    try {
      if (action === 'approve') {
        await api.approveAmenityBooking(b.id, currentUser.name);
      } else {
        await api.rejectAmenityBooking(b.id, currentUser.name, reason);
      }
      triggerSound('success');
      await loadBookings();
    } catch (e: any) {
      window.alert(e?.message || `Could not ${action} this booking.`);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-3xl p-6 border-amber-200/80 shadow-md">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <Building2 className="w-5 h-5" />
            </div>
            Clubhouse & Amenity Booking Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reserve community facilities, banquet halls, rooftop lounge, and sports courts
          </p>
        </div>

        <button
          onClick={() => setShowBookModal(true)}
          className="px-4 py-2.5 btn-gold text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Book Facility
        </button>
      </div>

      {requestSentMsg && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs font-semibold text-amber-900 flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" /> {requestSentMsg}
        </div>
      )}

      {/* Amenities Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {amenitiesList.map((a, idx) => (
          <div key={idx} className="glass-card glass-card-hover rounded-3xl border-amber-200/80 overflow-hidden flex flex-col justify-between">
            <div className="h-44 relative overflow-hidden">
              <img
                src={a.image}
                alt={a.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-sm text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
                {a.price}
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>{a.capacity}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{a.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.description}</p>
              </div>

              <div className="pt-3 border-t border-amber-100 flex items-center justify-between">
                <div className="text-xs text-slate-400 font-medium">
                  {a.slots.length} daily time slots
                </div>
                <button
                  onClick={() => {
                    setSelectedAmenity(a.name);
                    setShowBookModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs text-xs font-semibold rounded-xl transition-colors"
                >
                  Reserve Slot
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Society Bookings Schedule */}
      <div className="glass-card rounded-3xl border-amber-200/80 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          {isAdmin ? 'Amenity Reservations — Approval Queue' : 'Amenity Reservations'}
        </h3>

        <div className="divide-y divide-amber-100 text-xs">
          {bookings.length === 0 && !loading && (
            <div className="py-6 text-center text-slate-400">No reservations yet.</div>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-bold text-slate-900 text-sm">{b.amenityName}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  Requested by <strong className="text-slate-800">{b.residentName}</strong> (Flat {b.apartmentId})
                  {b.purpose ? ` • ${b.purpose}` : ''}
                  {b.guestsCount ? ` • ${b.guestsCount} guests` : ''}
                </div>
                {b.status === 'Rejected' && b.rejectionReason && (
                  <div className="text-rose-600 text-[11px] mt-0.5">Reason: {b.rejectionReason}</div>
                )}
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="font-semibold text-slate-600">{b.date}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{b.timeSlot || b.slot}</div>
                </div>
                {isAdmin && b.status === 'Pending Approval' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReview(b, 'approve')}
                      disabled={reviewingId === b.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-60"
                    >
                      {reviewingId === b.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReview(b, 'reject')}
                      disabled={reviewingId === b.id}
                      className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold rounded-xl disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full ${statusBadge[b.status] || statusBadge['Cancelled']}`}>
                    {b.status === 'Pending Approval' ? 'Awaiting Secretary' : b.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Facility Booking Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h3 className="text-base font-black text-slate-900">Book Society Amenity</h3>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleBook} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Facility:</label>
                <select
                  value={selectedAmenity}
                  onChange={(e) => setSelectedAmenity(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {amenitiesList.map(a => (
                    <option key={a.name} value={a.name}>{a.name} ({a.price})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reservation Date:</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Expected Guests:</label>
                  <input
                    type="number"
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Time Slot:</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="10:00 - 14:00 (Morning)">10:00 - 14:00 (Morning)</option>
                  <option value="14:00 - 18:00 (Afternoon)">14:00 - 18:00 (Afternoon)</option>
                  <option value="18:00 - 22:00 (Evening)">18:00 - 22:00 (Evening)</option>
                  <option value="06:00 - 09:00 (Early Morning)">06:00 - 09:00 (Early Morning)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose / Occasion:</label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Daughter's Birthday / Anniversary"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                <div>
                  Booking for Flat <strong className="font-bold text-slate-900">{currentUser.apartmentId || 'A-402'}</strong> ({currentUser.name})
                </div>
                <div className="text-[11px]">Your request goes to the Secretary and is confirmed only once approved.</div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking}
                  className="flex-1 py-2.5 btn-gold text-xs font-semibold rounded-xl"
                >
                  {isBooking ? 'Sending...' : 'Request Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
