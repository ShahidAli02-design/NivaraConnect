import React, { useState, useEffect } from 'react';
import { 
  Shield, UserCheck, QrCode, Search, Phone, LogOut, 
  CheckCircle2, AlertTriangle, Radio, Car, Package, 
  UserX, Camera, Plus, Clock, KeyRound, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { Visitor, Apartment, SOSAlert } from '../types';

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
        setEntrySuccessMsg(`Entry logged for ${vName}. Approval alert dispatched to resident of Flat ${vAptId}!`);
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

  const handleGrantScannedEntry = async (visitorId: string) => {
    try {
      await api.updateVisitorStatus(visitorId, 'Inside');
      triggerSound('success');
      setScannedResult(null);
      setPassPinInput('');
      loadGateData();
    } catch (e) {
      console.error('Failed to grant entry', e);
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
  const waitingApproval = visitors.filter(v => v.status === 'Waiting Approval');
  const activeSos = sosAlerts.filter(s => s.status === 'ACTIVE' || s.status === 'RESPONDING');

  const deliveryCompanies = ['Amazon', 'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Flipkart', 'Uber', 'Ola'];

  return (
    <div className="space-y-6 pb-6">
      {/* Gatekeeper Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
              <span>Main Gate 1 Terminal</span>
              <span>•</span>
              <span>On Duty: Ramesh Bahadur</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-0.5">
              Security Gate Management Desk
            </h1>
            <p className="text-xs text-slate-400 mt-1">
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
        <div className="p-4 bg-rose-950/80 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-rose-500 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 shrink-0 text-rose-400" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full inline-block">
                EMERGENCY ALERT • {activeSos[0].category}
              </div>
              <h3 className="text-base font-bold mt-1 text-white">
                Flat {activeSos[0].apartmentId} - {activeSos[0].triggeredByName} ({activeSos[0].triggeredByPhone})
              </h3>
              <p className="text-xs text-rose-200/90">{activeSos[0].notes || 'Immediate guard dispatch required.'}</p>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">QR Code / PIN Pass Validator</h3>
                  <p className="text-[11px] text-slate-400">Validate pre-approved resident passes</p>
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
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-950/70 text-slate-200 placeholder-slate-500 font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleValidatePass()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" /> Verify
                </button>
              </div>

              {scanError && (
                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-xs text-rose-400 font-medium">
                  {scanError}
                </div>
              )}

              {/* Verified Pass Result Card */}
              {scannedResult && (
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-3 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ✓ Valid Pre-Approved Pass
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300">#{scannedResult.passCode}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{scannedResult.name}</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Destination: <strong className="text-emerald-400">Flat {scannedResult.apartmentId}</strong> ({scannedResult.residentName})
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Type: {scannedResult.visitorType} • Purpose: {scannedResult.purpose || 'Visit'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleGrantScannedEntry(scannedResult.id)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Open Barrier & Grant Entry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* New Fast Visitor Entry Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Log New Visitor Entry</h3>
                  <p className="text-[11px] text-slate-400">Instant resident ringing & gate entry logging</p>
                </div>
              </div>
            </div>

            {entrySuccessMsg && (
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-medium animate-in fade-in">
                {entrySuccessMsg}
              </div>
            )}

            <form onSubmit={handleFastEntry} className="space-y-3">
              {/* Quick Delivery Shortcuts */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
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
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-950/70 text-slate-300 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Visitor Full Name:</label>
                <input
                  type="text"
                  required
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Flat:</label>
                  <select
                    value={vAptId}
                    onChange={(e) => setVAptId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>
                        Flat {a.id} - {a.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category:</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number:</label>
                  <input
                    type="text"
                    value={vPhone}
                    onChange={(e) => setVPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle No (Optional):</label>
                  <input
                    type="text"
                    value={vVehicle}
                    onChange={(e) => setVVehicle(e.target.value)}
                    placeholder="MH-27-..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose / Notes:</label>
                <input
                  type="text"
                  value={vPurpose}
                  onChange={(e) => setVPurpose(e.target.value)}
                  placeholder="e.g. Package delivery, Family visit"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all mt-2 active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                {isSubmitting ? 'Logging Gate Entry...' : 'Log Entry & Alert Resident'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col (7 cols): Currently Inside & Gate Stream */}
        <div className="lg:col-span-7 space-y-6">
          {/* Currently In-Premises Visitors */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Visitors Inside Premises ({insideVisitors.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Real-time gate checkout manager</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Gate 1 Active
              </span>
            </div>

            <div className="space-y-3">
              {insideVisitors.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No visitors currently inside society grounds.
                </div>
              ) : (
                insideVisitors.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{v.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {v.visitorType}
                        </span>
                        {v.deliveryCompany && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {v.deliveryCompany}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-300">
                        Visiting: <strong className="text-white font-semibold">Flat {v.apartmentId}</strong> ({v.residentName})
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-3">
                        <span>Entry: {v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                        {v.vehicleNumber && <span>Vehicle: <strong className="font-mono text-slate-400">{v.vehicleNumber}</strong></span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCheckoutVisitor(v.id)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Check Out
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Intercom Speed Dial Directory */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                Intercom Quick Directory
              </h3>
              <span className="text-[11px] text-slate-500">Dial from Guard Console</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {apartments.map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Flat {a.id}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[90px]">{a.ownerName}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-xs">#{a.intercomNumber}</span>
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
