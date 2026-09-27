import React, { useState, useEffect } from 'react';
import { 
  UserCheck, QrCode, Plus, Search, Filter, Clock, 
  Car, Package, CheckCircle2, UserX, Calendar, Download, Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { Visitor, VisitorType, VisitorStatus } from '../types';
import { fmtDateTime } from '../utils/format';

export const VisitorManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Pass for Modal View / Print
  const [selectedPass, setSelectedPass] = useState<Visitor | null>(null);

  // Pre-approve Modal
  const [showPreApproveModal, setShowPreApproveModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vType, setVType] = useState<VisitorType>('Guest');
  const [purpose, setPurpose] = useState('Personal Visit');
  const [targetFlat, setTargetFlat] = useState(currentUser.apartmentId || 'A-402');
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadVisitors();
  }, [refreshTrigger]);

  const loadVisitors = async () => {
    try {
      const data = await api.getVisitors();
      setVisitors(data);
    } catch (e) {
      console.error('Failed to load visitors', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePreApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const res = await api.preApproveVisitor({
        name,
        phone,
        visitorType: vType,
        purpose,
        apartmentId: targetFlat,
        residentName: currentUser.name,
        expectedDate,
      });
      if (res.success) {
        triggerSound('success');
        setSelectedPass(res.visitor);
        setShowPreApproveModal(false);
        setName('');
        setPhone('');
        loadVisitors();
      }
    } catch (e) {
      console.error('Pre-approval failed', e);
    }
  };

  const handleCheckout = async (id: string) => {
    try {
      await api.updateVisitorStatus(id, 'Checked Out');
      triggerSound('beep');
      loadVisitors();
    } catch (e) {
      console.error('Checkout failed', e);
    }
  };

  const filteredVisitors = visitors.filter(v => {
    if (currentUser.role === 'resident') {
      if (v.apartmentId !== currentUser.apartmentId) return false;
    }
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (typeFilter !== 'All' && v.visitorType !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return v.name.toLowerCase().includes(q) || 
             v.apartmentId.toLowerCase().includes(q) || 
             v.phone.includes(q) || 
             v.passCode.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border-amber-200/80 shadow-sm text-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <UserCheck className="w-5 h-5" />
            </div>
            Visitor Records & Gate Passes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser.role === 'resident'
              ? `Manage pre-approvals and view guests arriving for Flat ${currentUser.apartmentId}`
              : 'Society-wide digital gate register and entry authorization audit'}
          </p>
        </div>

        <button
          onClick={() => setShowPreApproveModal(true)}
          className="px-4 py-2.5 btn-gold text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <QrCode className="w-4 h-4" /> Generate Guest QR Pass
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-3xl border-amber-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, PIN..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 w-56 bg-slate-50 text-slate-800 placeholder-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500 focus:bg-white bg-slate-50 text-slate-800"
          >
            <option value="All">All Statuses</option>
            <option value="Inside">Inside Premises</option>
            <option value="Pre-Approved">Pre-Approved</option>
            <option value="Waiting Approval">Waiting Approval</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Denied">Denied</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500 focus:bg-white bg-slate-50 text-slate-800"
          >
            <option value="All">All Visitor Types</option>
            <option value="Guest">Guest</option>
            <option value="Delivery">Delivery</option>
            <option value="Cab / Taxi">Cab / Taxi</option>
            <option value="Service / Repair">Service / Repair</option>
          </select>
        </div>

        <div className="text-slate-500 text-xs font-medium">
          Showing <strong className="text-slate-900">{filteredVisitors.length}</strong> visitor logs
        </div>
      </div>

      {/* Visitor Table & Cards */}
      <div className="glass-card rounded-3xl border-amber-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-amber-50/60 border-b border-amber-200 text-slate-600 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Visitor & Pass Details</th>
                <th className="py-3.5 px-4">Destination Flat</th>
                <th className="py-3.5 px-4">Type & Purpose</th>
                <th className="py-3.5 px-4">Entry / Exit Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No visitor records found.
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{v.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{v.phone || 'No phone'}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          PIN: {v.passCode}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">Flat {v.apartmentId}</div>
                      <div className="text-[11px] text-slate-500">{v.residentName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-600">{v.visitorType}</span>
                      {v.deliveryCompany && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded ml-1.5">
                          {v.deliveryCompany}
                        </span>
                      )}
                      <div className="text-[11px] text-slate-500">{v.purpose}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>Entry: {v.entryTime ? fmtDateTime(v.entryTime) : 'Pending'}</div>
                      {v.exitTime && (
                        <div className="text-[11px] text-slate-400">Exit: {fmtDateTime(v.exitTime)}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                        v.status === 'Inside' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        v.status === 'Checked Out' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        v.status === 'Denied' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        v.status === 'Pre-Approved' ? 'bg-sky-100 text-sky-800 border-sky-300' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedPass(v)}
                        className="px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs font-medium rounded-lg text-xs transition-colors"
                      >
                        Pass QR
                      </button>
                      {v.status === 'Inside' && (currentUser.role === 'security' || currentUser.role === 'admin') && (
                        <button
                          onClick={() => handleCheckout(v.id)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs font-medium rounded-lg text-xs"
                        >
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Pass View & Print Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-center text-slate-800">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="text-xs font-semibold uppercase text-slate-500">Digital Gate Pass</span>
              <button onClick={() => setSelectedPass(null)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
            </div>

            <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-300 shadow-xl space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                  Nivara Heights Gate Pass
                </span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold border border-amber-300">
                  Flat {selectedPass.apartmentId}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Visitor Name</div>
                  <div className="text-base font-bold text-slate-900">{selectedPass.name}</div>
                  <div className="text-xs text-amber-700 font-medium mt-0.5">{selectedPass.visitorType}</div>
                </div>
                <div className="bg-white p-2 rounded-xl">
                  <QRCodeSVG
                    value={`NIVARA-PASS:${selectedPass.id}:${selectedPass.passCode}:${selectedPass.apartmentId}`}
                    size={80}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">Pass PIN: </span>
                  <span className="font-mono font-bold text-amber-700 text-sm">{selectedPass.passCode}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">{selectedPass.status}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`Nivara Pass for ${selectedPass.name}: PIN ${selectedPass.passCode} at Flat ${selectedPass.apartmentId}`);
                  alert('Pass details copied to clipboard!');
                }}
                className="flex-1 py-2 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs font-medium rounded-xl text-xs"
              >
                Share Details
              </button>
              <button
                onClick={() => setSelectedPass(null)}
                className="flex-1 py-2 btn-gold font-semibold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Approve Modal */}
      {showPreApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h3 className="text-base font-bold text-slate-900">Pre-Approve Visitor / Guest</h3>
              <button onClick={() => setShowPreApproveModal(false)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
            </div>
            <form onSubmit={handlePreApprove} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Visitor Name:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Deshmukh"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type:</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="Guest">Guest</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Service / Repair">Service / Repair</option>
                    <option value="Cab / Taxi">Cab / Taxi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone:</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose of Visit:</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Festival Dinner, Family visit"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreApproveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 btn-gold text-xs font-semibold rounded-xl"
                >
                  Generate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
