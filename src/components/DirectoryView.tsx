import React, { useState, useEffect } from 'react';
import { 
  Phone, Users, Shield, Wrench, Search, 
  Building, UserCheck, HeartPulse, Flame, Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Apartment, StaffMember } from '../types';

export const DirectoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'residents' | 'staff' | 'emergency'>('residents');

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

  const emergencyContacts = [
    { title: 'Main Gate 1 Security Desk', phone: '+91 98231 00010', intercom: '1001', icon: Shield, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { title: 'Gate 2 Security Desk', phone: '+91 98231 00011', intercom: '1002', icon: Shield, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { title: 'Society Estate Manager', phone: '+91 98231 00020', intercom: '1010', icon: Building, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { title: 'Emergency Ambulance (Apollo Clinic)', phone: '108 / +91 98231 99999', intercom: 'Direct', icon: HeartPulse, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { title: 'Nearest Fire Station (Hadapsar)', phone: '101 / +91 20 2687 0101', intercom: 'Direct', icon: Flame, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { title: 'Local Police Station (Mundhwa)', phone: '100 / +91 20 2687 1100', intercom: 'Direct', icon: Radio, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { title: 'Elevator Emergency Breakdown (Schindler)', phone: '+91 1800 209 5438', intercom: 'Direct', icon: Wrench, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { title: 'Electric Substation Breakdown (MSEDCL)', phone: '+91 1912 / 1800 233 3435', intercom: 'Direct', icon: Wrench, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm text-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Phone className="w-5 h-5" />
            </div>
            Society Intercom & Emergency Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Resident intercom numbers, society maintenance staff, and critical emergency hotlines
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
        <button
          onClick={() => setTab('residents')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'residents'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Resident Directory ({apartments.length} Flats)
        </button>
        <button
          onClick={() => setTab('staff')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'staff'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Society Staff & Technicians ({staff.length})
        </button>
        <button
          onClick={() => setTab('emergency')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'emergency'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'bg-slate-900 text-rose-400 hover:bg-rose-500/10 border border-rose-500/20'
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
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-900 text-slate-200 placeholder-slate-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredApts.map((a) => (
              <div
                key={a.id}
                className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm hover:border-slate-700 transition-all text-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Flat {a.id}</span>
                    <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      Wing {a.wing}
                    </span>
                  </div>
                  <div className="text-slate-300 font-medium mt-1">{a.ownerName}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {a.occupancyStatus === 'Owner Occupied' ? 'Owner' : 'Tenant'} • Floor {a.floor}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Intercom</div>
                  <span className="font-mono font-bold text-indigo-400 text-sm bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <div key={s.id} className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {s.role}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  s.status === 'On Duty' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {s.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{s.name}</h3>
                <div className="text-slate-400 text-[11px] mt-0.5">Assigned Shift: {s.shift}</div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="font-mono font-semibold text-slate-300">{s.phone}</span>
                <a
                  href={`tel:${s.phone}`}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-sm shadow-indigo-600/20"
                >
                  <Phone className="w-3 h-3" /> Call
                </a>
              </div>
            </div>
          ))}
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
                className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${ec.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{ec.title}</h3>
                    <div className="font-mono text-xs text-slate-300 mt-0.5 font-bold">{ec.phone}</div>
                    {ec.intercom !== 'Direct' && (
                      <div className="text-[11px] text-indigo-400 font-semibold">Intercom: #{ec.intercom}</div>
                    )}
                  </div>
                </div>

                <a
                  href={`tel:${ec.phone.split('/')[0].trim()}`}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
