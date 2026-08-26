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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm text-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            Visitor Records & Gate Passes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser.role === 'resident'
              ? `Manage pre-approvals and view guests arriving for Flat ${currentUser.apartmentId}`
              : 'Society-wide digital gate register and entry authorization audit'}
          </p>
        </div>

        <button
          onClick={() => setShowPreApproveModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <QrCode className="w-4 h-4" /> Generate Guest QR Pass
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, PIN..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 w-56 bg-slate-950/70 text-slate-200 placeholder-slate-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-800 font-medium focus:outline-none bg-slate-950 text-slate-300"
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
            className="px-3 py-1.5 rounded-xl border border-slate-800 font-medium focus:outline-none bg-slate-950 text-slate-300"
          >
            <option value="All">All Visitor Types</option>
            <option value="Guest">Guest</option>
            <option value="Delivery">Delivery</option>
            <option value="Cab / Taxi">Cab / Taxi</option>
            <option value="Service / Repair">Service / Repair</option>
          </select>
        </div>

        <div className="text-slate-400 text-xs font-medium">
          Showing <strong className="text-white">{filteredVisitors.length}</strong> visitor logs
        </div>
      </div>

      {/* Visitor Table & Cards */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Visitor & Pass Details</th>
                <th className="py-3.5 px-4">Destination Flat</th>
                <th className="py-3.5 px-4">Type & Purpose</th>
                <th className="py-3.5 px-4">Entry / Exit Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No visitor records found.
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">{v.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{v.phone || 'No phone'}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          PIN: {v.passCode}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">Flat {v.apartmentId}</div>
                      <div className="text-[11px] text-slate-400">{v.residentName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-300">{v.visitorType}</span>
                      {v.deliveryCompany && (
                        <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded ml-1.5">
                          {v.deliveryCompany}
                        </span>
                      )}
                      <div className="text-[11px] text-slate-400">{v.purpose}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>Entry: {v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</div>
                      {v.exitTime && (
                        <div className="text-[11px] text-slate-500">Exit: {new Date(v.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                        v.status === 'Inside' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        v.status === 'Checked Out' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        v.status === 'Denied' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        v.status === 'Pre-Approved' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedPass(v)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 font-medium rounded-lg text-xs transition-colors"
                      >
                        Pass QR
                      </button>
                      {v.status === 'Inside' && (currentUser.role === 'security' || currentUser.role === 'admin') && (
                        <button
                          onClick={() => handleCheckout(v.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 font-medium rounded-lg text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-center text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Digital Gate Pass</span>
              <button onClick={() => setSelectedPass(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Nivara Heights Gate Pass
                </span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold border border-indigo-500/30">
                  Flat {selectedPass.apartmentId}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Visitor Name</div>
                  <div className="text-base font-bold text-white">{selectedPass.name}</div>
                  <div className="text-xs text-indigo-400 font-medium mt-0.5">{selectedPass.visitorType}</div>
                </div>
                <div className="bg-white p-2 rounded-xl">
                  <QRCodeSVG
                    value={`NIVARA-PASS:${selectedPass.id}:${selectedPass.passCode}:${selectedPass.apartmentId}`}
                    size={80}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Pass PIN: </span>
                  <span className="font-mono font-bold text-indigo-400 text-sm">{selectedPass.passCode}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">{selectedPass.status}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`Nivara Pass for ${selectedPass.name}: PIN ${selectedPass.passCode} at Flat ${selectedPass.apartmentId}`);
                  alert('Pass details copied to clipboard!');
                }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 font-medium rounded-xl text-xs"
              >
                Share Details
              </button>
              <button
                onClick={() => setSelectedPass(null)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Approve Modal */}
      {showPreApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Pre-Approve Visitor / Guest</h3>
              <button onClick={() => setShowPreApproveModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handlePreApprove} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Visitor Name:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Deshmukh"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type:</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Guest">Guest</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Service / Repair">Service / Repair</option>
                    <option value="Cab / Taxi">Cab / Taxi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose of Visit:</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Festival Dinner, Family visit"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreApproveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700/60 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
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
