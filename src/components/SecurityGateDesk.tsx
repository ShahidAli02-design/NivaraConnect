import React, { useState, useEffect } from 'react';
import {
  Shield, UserCheck, QrCode, Search, Phone, LogOut,
  CheckCircle2, AlertTriangle, Radio, Car, Package,
  UserX, Camera, Plus, Clock, KeyRound, Check, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { Visitor, Apartment, SOSAlert } from '../types';
import { isValidAadhaar, AADHAAR_ERROR } from '../utils/aadhaar';
import { fmtDateTime } from '../utils/format';

interface SecurityGateDeskProps {
  onOpenSos: () => void;
}

export const SecurityGateDesk: React.FC<SecurityGateDeskProps> = ({ onOpenSos }) => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Fast Visitor Entry Form State
  const [vName, setVName] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vType, setVType] = useState<string>('Guest');
  const [vAptId, setVAptId] = useState('A-402');
  const [vVehicle, setVVehicle] = useState('');
  const [vPurpose, setVPurpose] = useState('Visit');
  const [vCompany, setVCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entrySuccessMsg, setEntrySuccessMsg] = useState('');

  // Pass Scanner / PIN Validator State
  const [passPinInput, setPassPinInput] = useState('');
  const [scannedResult, setScannedResult] = useState<Visitor | null>(null);
  const [scanError, setScanError] = useState('');
  const [scanAadhaar, setScanAadhaar] = useState('');
  const [scanAadhaarName, setScanAadhaarName] = useState('');
  const [scanVerifyError, setScanVerifyError] = useState('');
  const [isVerifyingScan, setIsVerifyingScan] = useState(false);

  // Aadhaar Verification Queue State (Pending Gate Verification list)
  const [aadhaarInputs, setAadhaarInputs] = useState<Record<string, string>>({});
  const [aadhaarNameInputs, setAadhaarNameInputs] = useState<Record<string, string>>({});
  const [verifyError, setVerifyError] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGateData();
  }, [refreshTrigger]);

  const loadGateData = async () => {
    try {
      const [vis, apts, sos] = await Promise.all([
        api.getVisitors(),
        api.getApartments(),
        api.getSosAlerts(),
      ]);
      setVisitors(vis);
      setApartments(apts);
      setSosAlerts(sos);
    } catch (e) {
      console.error('Failed to load gate data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFastEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName) return;
    setIsSubmitting(true);
    try {
      const targetApt = apartments.find(a => a.id === vAptId);
      const res = await api.logVisitorEntry({
        name: vName,
        phone: vPhone,
        visitorType: vType,
        purpose: vPurpose,
        apartmentId: vAptId,
        residentName: targetApt?.ownerName || `Flat ${vAptId}`,
        vehicleNumber: vVehicle,
        deliveryCompany: vCompany,
      });

      if (res.success) {
        triggerSound('beep');
        setEntrySuccessMsg(res.message || `Entry logged for ${vName}. Awaiting Aadhaar verification at the gate.`);
        setVName('');
        setVPhone('');
        setVVehicle('');
        setVCompany('');
        setVPurpose('Visit');
        setTimeout(() => setEntrySuccessMsg(''), 5000);
        loadGateData();
      }
    } catch (e) {
      console.error('Entry logging failed', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidatePass = (pinToValidate?: string) => {
    const pin = (pinToValidate || passPinInput).trim();
    if (!pin) return;
    setScanError('');

    const matched = visitors.find(v => v.passCode === pin || v.phone.includes(pin));
    if (matched) {
      setScannedResult(matched);
      triggerSound('success');
    } else {
      setScanError('No active or pre-approved pass found matching PIN / Phone.');
      setScannedResult(null);
    }
  };

  const handleVerifyScannedEntry = async () => {
    if (!scannedResult) return;
    setScanVerifyError('');
    if (!isValidAadhaar(scanAadhaar)) {
      setScanVerifyError(AADHAAR_ERROR);
      return;
    }
    if (!scanAadhaarName.trim()) {
      setScanVerifyError('Enter the name exactly as printed on the Aadhaar card.');
      return;
    }
    setIsVerifyingScan(true);
    try {
      await api.verifyEntryWithAadhaar(scannedResult.id, scanAadhaar.trim(), scanAadhaarName.trim(), currentUser.name);
      triggerSound('success');
      setScannedResult(null);
      setScanAadhaar('');
      setScanAadhaarName('');
      setPassPinInput('');
      loadGateData();
    } catch (e: any) {
      setScanVerifyError(e?.message || 'Failed to verify entry.');
    } finally {
      setIsVerifyingScan(false);
    }
  };

  const handleAadhaarInputChange = (visitorId: string, value: string) => {
    setAadhaarInputs(prev => ({ ...prev, [visitorId]: value }));
  };

  const handleAadhaarNameInputChange = (visitorId: string, value: string) => {
    setAadhaarNameInputs(prev => ({ ...prev, [visitorId]: value }));
  };

  const handleVerifyQueueEntry = async (visitor: Visitor) => {
    const aadhaar = (aadhaarInputs[visitor.id] || '').trim();
    const aadhaarName = (aadhaarNameInputs[visitor.id] || '').trim();
    setVerifyError(prev => ({ ...prev, [visitor.id]: '' }));
    if (!isValidAadhaar(aadhaar)) {
      setVerifyError(prev => ({ ...prev, [visitor.id]: AADHAAR_ERROR }));
      return;
    }
    if (!aadhaarName) {
      setVerifyError(prev => ({ ...prev, [visitor.id]: 'Enter the name exactly as printed on the Aadhaar card.' }));
      return;
    }
    setVerifyingId(visitor.id);
    try {
      await api.verifyEntryWithAadhaar(visitor.id, aadhaar, aadhaarName, currentUser.name);
      triggerSound('success');
      setAadhaarInputs(prev => {
        const next = { ...prev };
        delete next[visitor.id];
        return next;
      });
      setAadhaarNameInputs(prev => {
        const next = { ...prev };
        delete next[visitor.id];
        return next;
      });
      loadGateData();
    } catch (e: any) {
      setVerifyError(prev => ({ ...prev, [visitor.id]: e?.message || 'Failed to verify entry.' }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDenyQueueEntry = async (visitorId: string) => {
    try {
      await api.updateVisitorStatus(visitorId, 'Denied');
      triggerSound('beep');
      loadGateData();
    } catch (e) {
      console.error('Failed to deny entry', e);
    }
  };

  const handleCheckoutVisitor = async (id: string) => {
    try {
      await api.updateVisitorStatus(id, 'Checked Out');
      triggerSound('beep');
      loadGateData();
    } catch (e) {
      console.error('Checkout failed', e);
    }
  };

  const handleRespondToSos = async (sosId: string) => {
    try {
      await api.respondSos(sosId, {
        status: 'RESPONDING',
        respondedByGuard: 'Ramesh Bahadur (Head Guard - Gate 1)',
      });
      loadGateData();
    } catch (e) {
      console.error('Failed to respond to SOS', e);
    }
  };

  const insideVisitors = visitors.filter(v => v.status === 'Inside');
  const pendingVerification = visitors.filter(v => v.status === 'Waiting Approval' || v.status === 'Approved');
  const activeSos = sosAlerts.filter(s => s.status === 'ACTIVE' || s.status === 'RESPONDING');

  const deliveryCompanies = ['Amazon', 'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Flipkart', 'Uber', 'Ola'];

  return (
    <div className="space-y-6 pb-6">
      {/* Gatekeeper Banner */}
      <div className="glass-card rounded-3xl p-6 text-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-200/80">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 border border-amber-200 rounded-xl text-amber-800">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-widest">
              <span>Main Gate 1 Terminal</span>
              <span>•</span>
              <span>On Duty: Ramesh Bahadur</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Security Gate Management Desk
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify digital visitor passes, log entries, track in-premises guests, and monitor emergency panic alerts.
            </p>
          </div>
        </div>

        {/* SOS Trigger Button for Guard */}
        <button
          onClick={onOpenSos}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/25 flex items-center gap-2 animate-pulse shrink-0 active:scale-95 transition-all"
        >
          <Radio className="w-4 h-4" /> Trigger Society Alarm
        </button>
      </div>

      {/* ACTIVE SOS NOTIFICATION FOR GUARDS */}
      {activeSos.length > 0 && (
        <div className="p-4 bg-rose-50 text-slate-900 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-rose-500 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 shrink-0 text-rose-600" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full inline-block">
                EMERGENCY ALERT • {activeSos[0].category}
              </div>
              <h3 className="text-base font-bold mt-1 text-rose-900">
                Flat {activeSos[0].apartmentId} - {activeSos[0].triggeredByName} ({activeSos[0].triggeredByPhone})
              </h3>
              <p className="text-xs text-rose-700">{activeSos[0].notes || 'Immediate guard dispatch required.'}</p>
            </div>
          </div>
          {activeSos[0].status === 'ACTIVE' && (
            <button
              onClick={() => handleRespondToSos(activeSos[0].id)}
              className="px-4 py-2 bg-white text-rose-900 hover:bg-rose-100 text-xs font-bold rounded-xl shadow-md shrink-0 transition-colors"
            >
              Acknowledge & Dispatch Guard
            </button>
          )}
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Fast Entry Form & QR Code PIN Scanner */}
        <div className="lg:col-span-5 space-y-6">
          {/* QR Code / PIN Pass Scanner */}
          <div className="glass-card rounded-3xl p-5 space-y-4 border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">QR Code / PIN Pass Validator</h3>
                  <p className="text-[11px] text-slate-500">Look up a pass, then verify Aadhaar to grant entry</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={passPinInput}
                    onChange={(e) => setPassPinInput(e.target.value)}
                    placeholder="Enter 6-Digit Pass PIN or Phone..."
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 font-bold focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleValidatePass()}
                  className="btn-gold px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" /> Verify
                </button>
              </div>

              {scanError && (
                <div className="p-3 bg-rose-100 rounded-xl border border-rose-300 text-xs text-rose-800 font-medium">
                  {scanError}
                </div>
              )}

              {/* Verified Pass Result Card */}
              {scannedResult && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 space-y-3 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      ✓ Pass Found — {scannedResult.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">#{scannedResult.passCode}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{scannedResult.name}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Destination: <strong className="text-emerald-700">Flat {scannedResult.apartmentId}</strong> ({scannedResult.residentName})
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Type: {scannedResult.visitorType} • Purpose: {scannedResult.purpose || 'Visit'}
                    </p>
                  </div>

                  {scannedResult.status === 'Inside' ? (
                    <div className="text-xs text-emerald-700 font-semibold text-center py-1">
                      Already inside since {scannedResult.entryTime ? fmtDateTime(scannedResult.entryTime) : 'earlier'}.
                    </div>
                  ) : scannedResult.status === 'Denied' ? (
                    <div className="text-xs text-rose-700 font-semibold text-center py-1">
                      This visitor was denied entry.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 mb-1">Aadhaar Number (12 digits):</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={12}
                          value={scanAadhaar}
                          onChange={(e) => setScanAadhaar(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 234567890123"
                          className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 mb-1">Name exactly as printed on the card:</label>
                        <input
                          type="text"
                          value={scanAadhaarName}
                          onChange={(e) => setScanAadhaarName(e.target.value)}
                          placeholder="Read the name off the physical card"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Must match the visitor name <strong className="text-slate-700">"{scannedResult.name}"</strong> logged for this pass.</p>
                      </div>
                      {scanVerifyError && (
                        <div className="text-[11px] text-rose-700 font-semibold">{scanVerifyError}</div>
                      )}
                      <button
                        onClick={handleVerifyScannedEntry}
                        disabled={isVerifyingScan}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" /> {isVerifyingScan ? 'Verifying...' : 'Verify Aadhaar & Grant Entry'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* New Fast Visitor Entry Form */}
          <div className="glass-card rounded-3xl p-5 space-y-4 border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log New Visitor Entry</h3>
                  <p className="text-[11px] text-slate-500">Logs the visitor as pending — Aadhaar verification below grants entry</p>
                </div>
              </div>
            </div>

            {entrySuccessMsg && (
              <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-300 text-xs text-emerald-800 font-medium animate-in fade-in">
                {entrySuccessMsg}
              </div>
            )}

            <form onSubmit={handleFastEntry} className="space-y-3">
              {/* Quick Delivery Shortcuts */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quick Delivery Shortcut:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {deliveryCompanies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setVType('Delivery');
                        setVCompany(c);
                        setVPurpose(`${c} Parcel Delivery`);
                        setVName(`${c} Executive`);
                      }}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                        vCompany === c
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-600 hover:bg-amber-50 border-amber-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Visitor Full Name:</label>
                <input
                  type="text"
                  required
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Flat:</label>
                  <select
                    value={vAptId}
                    onChange={(e) => setVAptId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>
                        Flat {a.id} - {a.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category:</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="Guest">Guest / Personal</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Cab / Taxi">Cab / Taxi</option>
                    <option value="Service / Repair">Service / Repair</option>
                    <option value="Daily Help">Daily Help / Maid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number:</label>
                  <input
                    type="text"
                    value={vPhone}
                    onChange={(e) => setVPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle No (Optional):</label>
                  <input
                    type="text"
                    value={vVehicle}
                    onChange={(e) => setVVehicle(e.target.value)}
                    placeholder="MH-27-..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose / Notes:</label>
                <input
                  type="text"
                  value={vPurpose}
                  onChange={(e) => setVPurpose(e.target.value)}
                  placeholder="e.g. Package delivery, Family visit"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 btn-gold disabled:opacity-50 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all mt-2 active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                {isSubmitting ? 'Logging Gate Entry...' : 'Log Entry & Alert Resident'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col (7 cols): Currently Inside & Gate Stream */}
        <div className="lg:col-span-7 space-y-6">
          {/* Pending Gate Verification Queue */}
          <div className="glass-card rounded-3xl p-5 space-y-4 border-amber-300 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200 relative">
                  <ShieldCheck className="w-4 h-4" />
                  {pendingVerification.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {pendingVerification.length}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pending Gate Verification ({pendingVerification.length})</h3>
                  <p className="text-[11px] text-slate-500">No visitor enters without a guard verifying their Aadhaar here — even pre-approved guests</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {pendingVerification.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No visitors waiting on Aadhaar verification.
                </div>
              ) : (
                pendingVerification.map((v) => (
                  <div key={v.id} className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {v.visitorType}
                          </span>
                          {v.status === 'Approved' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                              Resident Cleared
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          Visiting: <strong className="text-slate-900 font-semibold">Flat {v.apartmentId}</strong> ({v.residentName}) • {v.purpose || 'Visit'}
                        </div>
                        {v.phone && <div className="text-slate-400 text-[11px] mt-0.5">Phone: {v.phone}</div>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={aadhaarInputs[v.id] || ''}
                        onChange={(e) => handleAadhaarInputChange(v.id, e.target.value.replace(/\D/g, ''))}
                        placeholder="12-digit Aadhaar number"
                        className="text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                      />
                      <input
                        type="text"
                        value={aadhaarNameInputs[v.id] || ''}
                        onChange={(e) => handleAadhaarNameInputChange(v.id, e.target.value)}
                        placeholder="Name as printed on card"
                        className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Card name must match the logged visitor name <strong className="text-slate-600">"{v.name}"</strong>.</p>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => handleDenyQueueEntry(v.id)}
                        className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <UserX className="w-3.5 h-3.5" /> Deny
                      </button>
                      <button
                        onClick={() => handleVerifyQueueEntry(v)}
                        disabled={verifyingId === v.id}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> {verifyingId === v.id ? 'Verifying...' : 'Verify & Grant'}
                      </button>
                    </div>
                    {verifyError[v.id] && (
                      <div className="text-[11px] text-rose-700 font-semibold">{verifyError[v.id]}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Currently In-Premises Visitors */}
          <div className="glass-card rounded-3xl p-5 space-y-4 border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Visitors Inside Premises ({insideVisitors.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Real-time gate checkout manager</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Gate 1 Active
              </span>
            </div>

            <div className="space-y-3">
              {insideVisitors.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No visitors currently inside society grounds.
                </div>
              ) : (
                insideVisitors.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-amber-200/70 bg-amber-50/60 hover:bg-amber-100/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{v.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {v.visitorType}
                        </span>
                        {v.deliveryCompany && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            {v.deliveryCompany}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600">
                        Visiting: <strong className="text-slate-900 font-semibold">Flat {v.apartmentId}</strong> ({v.residentName})
                      </div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-3">
                        <span>Entry: {v.entryTime ? fmtDateTime(v.entryTime) : 'Recently'}</span>
                        {v.vehicleNumber && <span>Vehicle: <strong className="font-mono text-slate-500">{v.vehicleNumber}</strong></span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCheckoutVisitor(v.id)}
                      className="px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Check Out
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Intercom Speed Dial Directory */}
          <div className="glass-card rounded-3xl p-5 space-y-4 border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                Intercom Quick Directory
              </h3>
              <span className="text-[11px] text-slate-400">Dial from Guard Console</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {apartments.map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl border border-amber-200/70 bg-amber-50/60 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Flat {a.id}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[90px]">{a.ownerName}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 text-xs">#{a.intercomNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
