import React, { useState, useEffect } from 'react';
import { Car, ParkingSquare, Clock, Plus, LogOut, AlertTriangle, X, Bike } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { ParkingSlot, Visitor } from '../types';
import { fmtDateTime, minutesLeft, fmtDuration } from '../utils/format';

export const ParkingView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();
  const canManage = currentUser.role === 'security' || currentUser.role === 'admin';

  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [insideVisitors, setInsideVisitors] = useState<Visitor[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const [assignSlot, setAssignSlot] = useState<ParkingSlot | null>(null);
  const [visitorId, setVisitorId] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const load = async () => {
    try {
      const [s, v] = await Promise.all([api.getParking(), canManage ? api.getVisitors({ status: 'Inside' }) : Promise.resolve([] as Visitor[])]);
      setSlots(s);
      setInsideVisitors(v);
    } catch (e) {
      console.error('Failed to load parking', e);
    } finally {
      setLoading(false);
    }
  };

  const guestSlots = slots.filter(s => s.zone === 'Guest');
  const residentSlots = slots.filter(s => s.zone === 'Resident');
  const free = (list: ParkingSlot[]) => list.filter(s => s.status === 'Free').length;
  const parkedVisitorIds = new Set(slots.filter(s => s.status === 'Occupied' && s.visitorId).map(s => s.visitorId));
  const eligibleVisitors = insideVisitors.filter(v => !parkedVisitorIds.has(v.id));

  const openAssign = (slot: ParkingSlot) => {
    setAssignSlot(slot);
    setVisitorId(eligibleVisitors[0]?.id || '');
    setVehicle('');
    setMinutes(60);
    setError('');
  };

  const submitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSlot) return;
    setBusy(true);
    setError('');
    try {
      await api.assignParking(assignSlot.id, { visitorId, vehicleNumber: vehicle, minutes });
      triggerSound('success');
      setAssignSlot(null);
      load();
    } catch (err: any) {
      setError(err?.message || 'Could not assign slot.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const renderSlot = (slot: ParkingSlot) => {
    const occupied = slot.status === 'Occupied';
    const isGuest = slot.zone === 'Guest';
    const left = isGuest && occupied ? minutesLeft(slot.expiresAt, now) : 0;
    const overstay = isGuest && occupied && left < 0;
    const isBike = slot.label.includes('2W');
    const tone = !occupied
      ? 'border-emerald-300 bg-emerald-50/70'
      : overstay
      ? 'border-rose-300 bg-rose-50/70'
      : 'border-amber-300 bg-amber-50/70';

    return (
      <div className={`p-4 rounded-2xl border ${tone} space-y-2 text-xs`}>
        <div className="flex items-center justify-between">
          <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
            {isBike ? <Bike className="w-4 h-4 text-slate-500" /> : <Car className="w-4 h-4 text-slate-500" />}
            {slot.label}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
              !occupied
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : overstay
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {!occupied ? 'Free' : overstay ? 'Overstay' : 'Occupied'}
          </span>
        </div>

        {occupied ? (
          <>
            <div className="font-mono font-bold text-slate-800">{slot.vehicleNumber}</div>
            <div className="text-slate-600">
              {slot.occupantName}
              {slot.apartmentId ? ` • Flat ${slot.apartmentId}` : ''}
            </div>
            <div className="text-slate-400 text-[11px]">Since {fmtDateTime(slot.since)}</div>
            {isGuest && (
              <div className={`flex items-center gap-1 font-bold ${overstay ? 'text-rose-700' : 'text-amber-800'}`}>
                {overstay ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {overstay ? `Over by ${fmtDuration(left)}` : `${fmtDuration(left)} left`}
                <span className="font-normal text-slate-400">of {fmtDuration(slot.allowedMinutes || 0)}</span>
              </div>
            )}
            {canManage && isGuest && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => act(() => api.extendParking(slot.id, 30))}
                  className="flex-1 py-1.5 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg font-bold text-slate-700"
                >
                  +30 min
                </button>
                <button
                  onClick={() => act(() => api.releaseParking(slot.id))}
                  className="flex-1 py-1.5 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg font-bold text-rose-700 flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Release
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-emerald-700 font-semibold py-1">{isGuest ? 'Available for guests' : 'Vacant resident slot'}</div>
            {canManage && isGuest && (
              <button
                onClick={() => openAssign(slot)}
                className="w-full py-1.5 btn-gold rounded-lg font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Assign Guest
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="glass-card rounded-3xl p-6 border-amber-200/80 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
            <ParkingSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Live Parking</h1>
            <p className="text-xs text-slate-500">Real-time slot status. Guests get a time-limited slot — overstays are flagged.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Guest Slots Free</div>
            <div className="text-2xl font-black text-slate-900">
              {free(guestSlots)} <span className="text-sm font-normal text-slate-400">/ {guestSlots.length}</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="text-[10px] font-bold uppercase text-amber-700">Resident Slots Free</div>
            <div className="text-2xl font-black text-slate-900">
              {free(residentSlots)} <span className="text-sm font-normal text-slate-400">/ {residentSlots.length}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-xs text-slate-400 py-8">Loading parking…</div>
      ) : (
        <>
          <div className="glass-card rounded-3xl p-5 border-amber-200/80 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Guest Parking (time-limited)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {guestSlots.map(s => (
                <React.Fragment key={s.id}>{renderSlot(s)}</React.Fragment>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 border-amber-200/80 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Resident Parking</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {residentSlots.map(s => (
                <React.Fragment key={s.id}>{renderSlot(s)}</React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

      {assignSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <form onSubmit={submitAssign} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Assign Guest Slot {assignSlot.label}</h3>
              <button type="button" onClick={() => setAssignSlot(null)} className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {eligibleVisitors.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No verified visitors inside without a slot. A visitor must first pass Aadhaar verification at the gate.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visitor (verified & inside):</label>
                  <select
                    value={visitorId}
                    onChange={e => setVisitorId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500"
                  >
                    {eligibleVisitors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} → Flat {v.apartmentId}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle number:</label>
                  <input
                    required
                    value={vehicle}
                    onChange={e => setVehicle(e.target.value)}
                    placeholder="MH-27-AB-1234"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Allowed parking time:</label>
                  <select
                    value={minutes}
                    onChange={e => setMinutes(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500"
                  >
                    {[30, 60, 120, 180, 240].map(m => (
                      <option key={m} value={m}>
                        {fmtDuration(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && <div className="text-[11px] text-rose-700 font-semibold">{error}</div>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setAssignSlot(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={busy || eligibleVisitors.length === 0} className="flex-1 py-2.5 btn-gold disabled:opacity-50 text-xs font-bold rounded-xl">
                {busy ? 'Assigning…' : 'Assign Slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
