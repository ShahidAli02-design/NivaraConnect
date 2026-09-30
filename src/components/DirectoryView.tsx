import React, { useState, useEffect } from 'react';
import {
  Phone, Users, Shield, Wrench, Search,
  Building, UserCheck, HeartPulse, Flame, Radio, Plus, Trash2, X, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Apartment, StaffMember } from '../types';

export const DirectoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'admin';
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'residents' | 'staff' | 'emergency'>('residents');

  // Add Worker
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [wName, setWName] = useState('');
  const [wRole, setWRole] = useState('Electrician');
  const [wPhone, setWPhone] = useState('');
  const [wShift, setWShift] = useState('General (9 AM - 6 PM)');
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);

  useEffect(() => {
    loadDirectory();
  }, []);

  const loadDirectory = async () => {
    try {
      const [apts, stf] = await Promise.all([
        api.getApartments(),
        api.getStaff(),
      ]);
      setApartments(apts);
      setStaff(stf);
    } catch (e) {
      console.error('Failed to load directory', e);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkerError(null);
    if (!wName.trim() || !wRole.trim()) {
      setWorkerError('Name and role are required.');
      return;
    }
    setIsSavingWorker(true);
    try {
      await api.createStaff({ name: wName.trim(), role: wRole.trim(), phone: wPhone.trim(), shift: wShift, status: 'On Duty' });
      setShowAddWorker(false);
      setWName('');
      setWPhone('');
      loadDirectory();
    } catch (err: any) {
      setWorkerError(err?.message || 'Could not add this worker.');
    } finally {
      setIsSavingWorker(false);
    }
  };

  const handleRemoveWorker = async (member: StaffMember) => {
    if (!window.confirm(`Remove ${member.name} from the staff list?`)) return;
    setDeletingStaffId(member.id);
    try {
      await api.deleteStaff(member.id);
      setStaff(prev => prev.filter(s => s.id !== member.id));
    } catch (e: any) {
      window.alert(e?.message || 'Could not remove this worker.');
    } finally {
      setDeletingStaffId(null);
    }
  };

  const emergencyContacts = [
    { title: 'Main Gate 1 Security Desk', phone: '+91 98231 00010', intercom: '1001', icon: Shield, color: 'text-amber-800 bg-amber-100 border-amber-300' },
    { title: 'Gate 2 Security Desk', phone: '+91 98231 00011', intercom: '1002', icon: Shield, color: 'text-amber-800 bg-amber-100 border-amber-300' },
    { title: 'Society Estate Manager', phone: '+91 98231 00020', intercom: '1010', icon: Building, color: 'text-blue-800 bg-blue-100 border-blue-300' },
    { title: 'Emergency Ambulance (Apollo Clinic)', phone: '108 / +91 98231 99999', intercom: 'Direct', icon: HeartPulse, color: 'text-rose-800 bg-rose-100 border-rose-300' },
    { title: 'Nearest Fire Station (Hadapsar)', phone: '101 / +91 20 2687 0101', intercom: 'Direct', icon: Flame, color: 'text-amber-800 bg-amber-100 border-amber-300' },
    { title: 'Local Police Station (Mundhwa)', phone: '100 / +91 20 2687 1100', intercom: 'Direct', icon: Radio, color: 'text-purple-800 bg-purple-100 border-purple-300' },
    { title: 'Elevator Emergency Breakdown (Schindler)', phone: '+91 1800 209 5438', intercom: 'Direct', icon: Wrench, color: 'text-teal-800 bg-teal-100 border-teal-300' },
    { title: 'Electric Substation Breakdown (MSEDCL)', phone: '+91 1912 / 1800 233 3435', intercom: 'Direct', icon: Wrench, color: 'text-emerald-800 bg-emerald-100 border-emerald-300' },
  ];

  const filteredApts = apartments.filter(a => {
    const q = searchQuery.toLowerCase();
    return a.id.toLowerCase().includes(q) ||
           a.ownerName.toLowerCase().includes(q) ||
           a.wing.toLowerCase().includes(q) ||
           a.intercomNumber.includes(q);
  });

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border-amber-200/80 shadow-sm text-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <Phone className="w-5 h-5" />
            </div>
            Society Intercom & Emergency Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resident intercom numbers, society maintenance staff, and critical emergency hotlines
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-amber-200/80 pb-3 text-xs font-semibold">
        <button
          onClick={() => setTab('residents')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'residents'
              ? 'bg-gold-gradient text-white shadow-md shadow-amber-500/20'
              : 'bg-white/80 text-slate-600 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          Resident Directory ({apartments.length} Flats)
        </button>
        <button
          onClick={() => setTab('staff')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'staff'
              ? 'bg-gold-gradient text-white shadow-md shadow-amber-500/20'
              : 'bg-white/80 text-slate-600 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          Society Staff & Technicians ({staff.length})
        </button>
        <button
          onClick={() => setTab('emergency')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'emergency'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'bg-white/80 text-rose-700 hover:bg-rose-50 border border-rose-300'
          }`}
        >
          Emergency Contacts
        </button>
      </div>

      {/* Resident Directory Tab */}
      {tab === 'residents' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by flat (e.g. A-402), resident name, or intercom number..."
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredApts.map((a) => (
              <div
                key={a.id}
                className="p-4 glass-card rounded-2xl border-amber-200/80 shadow-sm hover:border-amber-300 transition-all text-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Flat {a.id}</span>
                    <span className="text-[10px] font-semibold bg-amber-50/60 text-slate-600 px-2 py-0.5 rounded border border-amber-200/70">
                      Wing {a.wing}
                    </span>
                  </div>
                  <div className="text-slate-600 font-medium mt-1">{a.ownerName}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {a.occupancyStatus === 'Owner Occupied' ? 'Owner' : 'Tenant'} • Floor {a.floor}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Intercom</div>
                  <span className="font-mono font-bold text-amber-800 text-sm bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    #{a.intercomNumber}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => { setWorkerError(null); setShowAddWorker(true); }}
                className="btn-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add Worker
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((s) => (
              <div key={s.id} className="p-5 glass-card rounded-2xl border-amber-200/80 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-50/60 text-slate-600 px-2.5 py-0.5 rounded-full border border-amber-200/70">
                    {s.role}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    s.status === 'On Duty' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
                  <div className="text-slate-500 text-[11px] mt-0.5">Assigned Shift: {s.shift}</div>
                </div>

                <div className="pt-2 border-t border-amber-100 flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-slate-600 truncate">{s.phone}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${s.phone}`}
                      className="px-3 py-1.5 btn-gold text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-sm shadow-amber-500/20"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveWorker(s)}
                        disabled={deletingStaffId === s.id}
                        title="Remove worker"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Tab */}
      {tab === 'emergency' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {emergencyContacts.map((ec, idx) => {
            const Icon = ec.icon;
            return (
              <div
                key={idx}
                className="p-5 glass-card rounded-2xl border-amber-200/80 shadow-sm flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${ec.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{ec.title}</h3>
                    <div className="font-mono text-xs text-slate-600 mt-0.5 font-bold">{ec.phone}</div>
                    {ec.intercom !== 'Direct' && (
                      <div className="text-[11px] text-amber-700 font-semibold">Intercom: #{ec.intercom}</div>
                    )}
                  </div>
                </div>

                <a
                  href={`tel:${ec.phone.split('/')[0].trim()}`}
                  className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-amber-300 space-y-4 text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Worker</h3>
                  <p className="text-xs text-slate-500">Adds them to the on-duty staff list</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddWorker(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWorker} className="space-y-3.5">
              {workerError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{workerError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={wRole}
                    onChange={(e) => setWRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="Security Guard">Security Guard</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Gardener">Gardener</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                  <select
                    value={wShift}
                    onChange={(e) => setWShift(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="Morning (6 AM - 2 PM)">Morning (6 AM - 2 PM)</option>
                    <option value="Evening (2 PM - 10 PM)">Evening (2 PM - 10 PM)</option>
                    <option value="Night (10 PM - 6 AM)">Night (10 PM - 6 AM)</option>
                    <option value="General (9 AM - 6 PM)">General (9 AM - 6 PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={wPhone}
                  onChange={(e) => setWPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingWorker}
                className="w-full mt-1 py-3 bg-gold-gradient text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSavingWorker ? 'Adding...' : 'Add Worker'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
