import React, { useState, useEffect } from 'react';
import { 
  Home, Users, Car, UserCheck, Wrench, CreditCard, Sparkles, 
  QrCode, Plus, CheckCircle2, Clock, Calendar, ShieldAlert, 
  ChevronRight, Phone, Send, ArrowRight, ShieldCheck, Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { Apartment, Visitor, Complaint, Notice, MaintenanceBill, AmenityBooking } from '../types';

interface ResidentPortalProps {
  onNavigate: (tab: any) => void;
  onOpenSos: () => void;
  onOpenAi: () => void;
}

export const ResidentPortal: React.FC<ResidentPortalProps> = ({ onNavigate, onOpenSos, onOpenAi }) => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [myVisitors, setMyVisitors] = useState<Visitor[]>([]);
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-approve Modal
  const [showPreApproveModal, setShowPreApproveModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestType, setGuestType] = useState('Guest');
  const [guestPurpose, setGuestPurpose] = useState('Social Visit');
  const [generatedPass, setGeneratedPass] = useState<Visitor | null>(null);

  // New Complaint Modal
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [compTitle, setCompTitle] = useState('');
  const [compCategory, setCompCategory] = useState('Plumbing');
  const [compDesc, setCompDesc] = useState('');
  const [compPriority, setCompPriority] = useState('Medium');
  const [isSubmittingComp, setIsSubmittingComp] = useState(false);

  // Add Family / Vehicle Modals
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [famName, setFamName] = useState('');
  const [famRelation, setFamRelation] = useState<'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Other'>('Spouse');
  const [famPhone, setFamPhone] = useState('');
  const [famAge, setFamAge] = useState('');

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehType, setVehType] = useState<'2-Wheeler' | '4-Wheeler' | 'Electric Vehicle'>('4-Wheeler');
  const [vehReg, setVehReg] = useState('');
  const [vehModel, setVehModel] = useState('');

  useEffect(() => {
    loadResidentData();
  }, [currentUser.apartmentId, refreshTrigger]);

  const loadResidentData = async () => {
    try {
      const aptId = currentUser.apartmentId || 'A-402';
      const [apt, vis, cmps, nots, bls] = await Promise.all([
        api.getApartment(aptId),
        api.getVisitors({ apartmentId: aptId }),
        api.getComplaints({ apartmentId: aptId }),
        api.getNotices(),
        api.getBills(aptId),
      ]);
      setApartment(apt);
      setMyVisitors(vis);
      setMyComplaints(cmps);
      setNotices(nots);
      setBills(bls);
    } catch (e) {
      console.error('Failed to load resident data', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePreApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName) return;
    try {
      const res = await api.preApproveVisitor({
        name: guestName,
        phone: guestPhone,
        visitorType: guestType,
        purpose: guestPurpose,
        apartmentId: currentUser.apartmentId || 'A-402',
        residentName: currentUser.name,
      });
      if (res.success) {
        triggerSound('success');
        setGeneratedPass(res.visitor);
        loadResidentData();
      }
    } catch (e) {
      console.error('Pre-approve failed', e);
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTitle || !compDesc) return;
    setIsSubmittingComp(true);
    try {
      await api.createComplaint({
        title: compTitle,
        description: compDesc,
        category: compCategory,
        priority: compPriority,
        apartmentId: currentUser.apartmentId || 'A-402',
        residentName: currentUser.name,
        residentPhone: currentUser.phone,
      });
      triggerSound('success');
      setShowComplaintModal(false);
      setCompTitle('');
      setCompDesc('');
      loadResidentData();
    } catch (e) {
      console.error('Create complaint failed', e);
    } finally {
      setIsSubmittingComp(false);
    }
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!famName || !apartment) return;
    try {
      await api.addFamilyMember(apartment.id, {
        name: famName,
        relation: famRelation,
        phone: famPhone,
        age: famAge ? Number(famAge) : undefined,
      });
      setShowFamilyModal(false);
      setFamName('');
      setFamPhone('');
      setFamAge('');
      loadResidentData();
    } catch (e) {
      console.error('Add family member failed', e);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehReg || !apartment) return;
    try {
      await api.addVehicle(apartment.id, {
        type: vehType,
        registrationNumber: vehReg,
        model: vehModel,
      });
      setShowVehicleModal(false);
      setVehReg('');
      setVehModel('');
      loadResidentData();
    } catch (e) {
      console.error('Add vehicle failed', e);
    }
  };

  const handlePollVote = async (noticeId: string, optionId: string) => {
    try {
      await api.votePoll(noticeId, optionId, currentUser.id);
      loadResidentData();
    } catch (e) {
      console.error('Poll vote failed', e);
    }
  };

  const activeInsideVisitors = myVisitors.filter(v => v.status === 'Inside');
  const preApprovedVisitors = myVisitors.filter(v => v.status === 'Pre-Approved');
  const pendingBill = bills.find(b => b.status === 'Pending');

  return (
    <div className="space-y-6 pb-6">
      {/* Top Apartment Hero Card (Sleek Theme) */}
      <div className="glass-card border-amber-200/80 rounded-3xl p-6 text-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Wing {currentUser.wing || 'A'} • Flat {currentUser.apartmentId || 'A-402'}</span>
            <span>•</span>
            <span className="capitalize">{currentUser.residentType || 'Owner'} Account</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Welcome Home, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Nivara Heights Smart Hub • Intercom #{apartment?.intercomNumber || '—'} • Floor {apartment?.floor ?? '—'}
          </p>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap gap-2.5 mt-4 text-xs">
            <span className="bg-amber-50/60 px-3 py-1 rounded-xl border border-amber-200/80 flex items-center gap-1.5 text-slate-600">
              <Users className="w-3.5 h-3.5 text-amber-700" />
              {apartment?.familyMembers.length ?? 0} Family Members
            </span>
            <span className="bg-amber-50/60 px-3 py-1 rounded-xl border border-amber-200/80 flex items-center gap-1.5 text-slate-600">
              <Car className="w-3.5 h-3.5 text-amber-700" />
              {apartment?.vehicles.length ?? 0} Vehicles
            </span>
            {pendingBill ? (
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl border border-amber-300 flex items-center gap-1.5 font-medium">
                <CreditCard className="w-3.5 h-3.5" /> Dues: ₹{pendingBill.totalAmount} Due {pendingBill.dueDate}
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-300 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Maintenance Paid
              </span>
            )}
          </div>
        </div>

        {/* Quick Resident Action Cards */}
        <div className="grid grid-cols-2 gap-2.5 shrink-0">
          <button
            onClick={() => {
              setGeneratedPass(null);
              setShowPreApproveModal(true);
            }}
            className="p-3 btn-gold font-semibold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center active:scale-95"
          >
            <QrCode className="w-5 h-5 text-white" />
            <span>Invite Guest</span>
          </button>
          <button
            onClick={() => setShowComplaintModal(true)}
            className="p-3 bg-slate-100 hover:bg-amber-100 text-slate-800 font-medium text-xs rounded-xl border border-amber-200 flex flex-col items-center justify-center gap-1.5 transition-all text-center"
          >
            <Wrench className="w-5 h-5 text-amber-800" />
            <span>Lodge Ticket</span>
          </button>
          <button
            onClick={() => onNavigate('billing')}
            className="p-3 bg-slate-100 hover:bg-amber-100 text-slate-800 font-medium text-xs rounded-xl border border-amber-200 flex flex-col items-center justify-center gap-1.5 transition-all text-center"
          >
            <CreditCard className="w-5 h-5 text-emerald-800" />
            <span>Society Dues</span>
          </button>
          <button
            onClick={onOpenAi}
            className="p-3 bg-slate-100 hover:bg-amber-100 text-amber-800 font-medium text-xs rounded-xl border border-amber-200 flex flex-col items-center justify-center gap-1.5 transition-all text-center"
          >
            <Sparkles className="w-5 h-5 text-amber-700" />
            <span>Ask AI</span>
          </button>
        </div>
      </div>

      {/* Dues & Bills raised by the Secretary */}
      <div className="glass-card border-amber-200/80 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">My Dues & Bills</h3>
              <p className="text-[11px] text-slate-500">Maintenance bills created by the society secretary for Flat {currentUser.apartmentId}</p>
            </div>
          </div>
          <button onClick={() => onNavigate('billing')} className="text-xs font-medium text-amber-800 hover:text-amber-900">
            All bills
          </button>
        </div>
        {bills.filter(b => b.status === 'Pending').length === 0 ? (
          <div className="text-xs text-emerald-800 font-semibold py-2">No pending dues — you're all clear.</div>
        ) : (
          bills.filter(b => b.status === 'Pending').map(b => (
            <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs">
              <div>
                <div className="font-semibold text-slate-900 text-sm">{b.month || b.billingMonth} maintenance</div>
                <div className="text-slate-500 text-[11px]">Invoice #{b.invoiceNumber} • Due by {b.dueDate}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-amber-700 text-base">₹{b.totalAmount}</span>
                <button onClick={() => onNavigate('billing')} className="btn-gold px-3.5 py-1.5 rounded-xl font-semibold">
                  Pay Now
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main 3-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Visitors & Complaints */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visitor Management Section */}
          <div className="glass-card border-amber-200/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Visitors & Gate Passes</h3>
                  <p className="text-[11px] text-slate-500">Real-time gate arrivals and digital pre-approvals</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setGeneratedPass(null);
                  setShowPreApproveModal(true);
                }}
                className="px-3 py-1.5 btn-gold rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Pre-Approve
              </button>
            </div>

            {/* In-Premises & Pre-Approved Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Currently Inside */}
              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>Currently Inside ({activeInsideVisitors.length})</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                {activeInsideVisitors.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No visitors currently inside flat.</p>
                ) : (
                  activeInsideVisitors.map(v => (
                    <div key={v.id} className="p-2.5 bg-white rounded-lg border border-amber-200/80 text-xs">
                      <div className="font-semibold text-slate-800">{v.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        {v.visitorType} • Entry: {v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pre-Approved Passes */}
              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>Pre-Approved Passes ({preApprovedVisitors.length})</span>
                  <QrCode className="w-4 h-4 text-amber-700" />
                </div>
                {preApprovedVisitors.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No upcoming guest passes generated.</p>
                ) : (
                  preApprovedVisitors.map(v => (
                    <div key={v.id} className="p-2.5 bg-white rounded-lg border border-amber-200/80 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{v.name}</div>
                        <div className="text-slate-500 text-[11px]">PIN: <strong className="font-mono text-amber-700">{v.passCode}</strong></div>
                      </div>
                      <button
                        onClick={() => {
                          setGeneratedPass(v);
                          setShowPreApproveModal(true);
                        }}
                        className="text-[11px] text-amber-700 font-medium hover:underline"
                      >
                        View Pass
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Visitor History */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Recent Gate Entry Log
              </span>
              <div className="divide-y divide-amber-100 text-xs">
                {myVisitors.slice(0, 3).map((v) => (
                  <div key={v.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{v.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        {v.visitorType} {v.deliveryCompany ? `(${v.deliveryCompany})` : ''} • {v.purpose || 'Visit'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        v.status === 'Inside' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        v.status === 'Checked Out' ? 'bg-slate-100 text-slate-500 border-amber-200' :
                        v.status === 'Denied' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300/70'
                      }`}>
                        {v.status}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {v.entryTime ? new Date(v.entryTime).toLocaleDateString() : 'Active'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance Complaints Section */}
          <div className="glass-card border-amber-200/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">My Service Tickets</h3>
                  <p className="text-[11px] text-slate-500">Track resolution timeline and technician updates</p>
                </div>
              </div>
              <button
                onClick={() => setShowComplaintModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-800 border border-amber-200 rounded-xl text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Ticket
              </button>
            </div>

            <div className="space-y-4">
              {myComplaints.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No complaints logged for Flat {currentUser.apartmentId}.
                </div>
              ) : (
                myComplaints.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/60 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase border border-amber-200">
                            {c.category}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            c.priority === 'Emergency' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            c.priority === 'High' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 border-amber-200'
                          }`}>
                            {c.priority}
                          </span>
                          <span className="text-xs text-slate-400">Ticket #{c.id.slice(-4)}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 mt-1">{c.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl whitespace-nowrap border ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        c.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-300/70' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200/80 space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Resolution Progress:
                      </span>
                      <div className="space-y-1.5 text-xs">
                        {c.timeline.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <span className="font-semibold text-slate-800">{item.action}</span>
                              {item.comment && <span className="text-slate-500"> - {item.comment}</span>}
                              <span className="text-[10px] text-slate-400 font-mono ml-2">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Family, Vehicles & Society Notices */}
        <div className="space-y-6">
          {/* Family & Vehicles Card */}
          <div className="glass-card border-amber-200/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
              <h3 className="text-sm font-semibold text-slate-900">Apartment Registry</h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowFamilyModal(true)}
                  disabled={!apartment}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 border border-amber-300/70 px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Member
                </button>
                <button
                  onClick={() => setShowVehicleModal(true)}
                  disabled={!apartment}
                  className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Vehicle
                </button>
              </div>
            </div>
            {!apartment && !loading && (
              <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                Your flat record couldn't be loaded, so adding members/vehicles is disabled. Try reloading — it's created automatically once your account is approved.
              </div>
            )}

            {/* Family Members List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Family Members ({apartment?.familyMembers.length || 0})
              </span>
              <div className="space-y-1.5">
                {apartment?.familyMembers.map((fm) => (
                  <div key={fm.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-200/70 text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{fm.name}</div>
                      <div className="text-[11px] text-slate-500">{fm.relation} {fm.age ? `• ${fm.age} yrs` : ''}</div>
                    </div>
                    {fm.phone && <div className="text-[10px] text-slate-400 font-mono">{fm.phone}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicles List */}
            <div className="space-y-2 pt-2 border-t border-amber-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Registered Vehicles ({apartment?.vehicles.length || 0})
              </span>
              <div className="space-y-1.5">
                {apartment?.vehicles.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-200/70 text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-800">{v.registrationNumber}</div>
                      <div className="text-[11px] text-slate-500">{v.model} ({v.type})</div>
                    </div>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-amber-200">
                      {v.parkingSlot}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Society Notice Board with Polls */}
          <div className="glass-card border-amber-200/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
              <h3 className="text-sm font-semibold text-slate-900">Society Notices & Polls</h3>
              <button
                onClick={() => onNavigate('notices')}
                className="text-xs font-medium text-amber-700 hover:text-amber-900"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n.id} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      n.priority === 'Urgent / Alert' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      n.priority === 'Important' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-600 border-amber-200'
                    }`}>
                      {n.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900">{n.title}</h4>
                  <p className="text-slate-500 text-[11px] line-clamp-3 leading-relaxed">{n.content}</p>

                  {/* Interactive Poll if present */}
                  {n.poll && (
                    <div className="p-3 bg-white rounded-xl border border-amber-300/70 mt-2 space-y-2">
                      <div className="font-semibold text-amber-800 text-xs">{n.poll.question}</div>
                      <div className="space-y-1.5">
                        {n.poll.options.map((opt) => {
                          const isVoted = opt.votedUserIds.includes(currentUser.id);
                          const totalVotes = n.poll?.options.reduce((sum, o) => sum + o.votes, 0) || 1;
                          const pct = Math.round((opt.votes / totalVotes) * 100);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handlePollVote(n.id, opt.id)}
                              className={`w-full text-left p-2.5 rounded-lg border text-xs relative overflow-hidden transition-all ${
                                isVoted
                                  ? 'border-amber-400 bg-amber-100/70 text-amber-900 font-medium'
                                  : 'border-amber-200/80 bg-slate-50 hover:bg-amber-50/60 text-slate-600'
                              }`}
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-amber-200/40 pointer-events-none"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative flex justify-between items-center">
                                <span>{opt.text} {isVoted && '✓'}</span>
                                <span className="font-mono text-[10px] font-bold text-slate-500">{opt.votes} ({pct}%)</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Approve Visitor & QR Pass Modal */}
      {showPreApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-50/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl border border-amber-300/70">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {generatedPass ? 'Guest Pass Generated!' : 'Pre-Approve Visitor / Guest'}
                  </h3>
                  <p className="text-xs text-slate-500">Generates instant Gate QR Pass for swift entry</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreApproveModal(false)}
                className="text-slate-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {generatedPass ? (
              <div className="space-y-4 text-center">
                {/* Generated Digital Pass Card with QR Code */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-amber-200/80 shadow-xl space-y-3 text-left relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                      Nivara Heights Gate Pass
                    </span>
                    <span className="text-xs bg-amber-200/40 text-amber-800 px-2 py-0.5 rounded-md font-mono font-bold border border-amber-300">
                      Flat {generatedPass.apartmentId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Visitor Name</div>
                      <div className="text-lg font-bold text-slate-900">{generatedPass.name}</div>
                      <div className="text-xs text-amber-700 font-medium mt-0.5">{generatedPass.visitorType}</div>
                    </div>
                    {/* Authentic QR Code */}
                    <div className="bg-white p-2 rounded-xl shadow-md">
                      <QRCodeSVG
                        value={`NIVARA-PASS:${generatedPass.id}:${generatedPass.passCode}:${generatedPass.apartmentId}`}
                        size={84}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px]">Pass PIN: </span>
                      <span className="font-mono font-bold text-amber-700 text-sm">{generatedPass.passCode}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Valid: Today</div>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Share this QR code or 6-digit PIN with your guest. Security at Gate 1 will scan for instant access.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`Nivara Heights Visitor Pass for ${generatedPass.name}: PIN is ${generatedPass.passCode} for Flat ${generatedPass.apartmentId}`);
                      alert('Pass details copied to clipboard!');
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-amber-100 text-slate-800 border border-amber-200 text-xs font-medium rounded-xl transition-colors"
                  >
                    Copy Pass Details
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedPass(null);
                      setShowPreApproveModal(false);
                    }}
                    className="flex-1 py-2.5 btn-gold text-xs font-semibold rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePreApprove} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Visitor / Guest Name:</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Visitor Type:</label>
                    <select
                      value={guestType}
                      onChange={(e) => setGuestType(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Guest">Guest / Friend</option>
                      <option value="Delivery">Delivery</option>
                      <option value="Service / Repair">Service / Repair</option>
                      <option value="Cab / Taxi">Cab / Taxi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone (Optional):</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose of Visit:</label>
                  <input
                    type="text"
                    value={guestPurpose}
                    onChange={(e) => setGuestPurpose(e.target.value)}
                    placeholder="e.g. Dinner, Package drop, AC Repair"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPreApproveModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-amber-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 btn-gold text-xs font-semibold rounded-xl transition-all"
                  >
                    Generate Pass
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Lodge Complaint Modal */}
      {showComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-50/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register Service Ticket</h3>
                  <p className="text-xs text-slate-500">Directly dispatches to on-duty society technicians</p>
                </div>
              </div>
              <button
                onClick={() => setShowComplaintModal(false)}
                className="text-slate-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Title:</label>
                <input
                  type="text"
                  required
                  value={compTitle}
                  onChange={(e) => setCompTitle(e.target.value)}
                  placeholder="e.g. Kitchen sink drain clogged"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category:</label>
                  <select
                    value={compCategory}
                    onChange={(e) => setCompCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Lift / Elevator">Lift / Elevator</option>
                    <option value="Carpentry / Civil">Carpentry / Civil</option>
                    <option value="Cleanliness & Waste">Cleanliness & Waste</option>
                    <option value="Noise / Disturbance">Noise / Disturbance</option>
                    <option value="Parking">Parking</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Priority:</label>
                  <select
                    value={compPriority}
                    onChange={(e) => setCompPriority(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Detailed Description:</label>
                <textarea
                  required
                  rows={4}
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  placeholder="Provide details about the issue, location inside flat, and when it started..."
                  className="w-full text-xs p-3 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-amber-300/70 text-xs text-amber-800 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Nivara AI will automatically triage and assign this ticket to the on-duty technician.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-amber-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComp}
                  className="flex-1 py-2.5 btn-gold disabled:opacity-50 text-xs font-semibold rounded-xl transition-all"
                >
                  {isSubmittingComp ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-50/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <h3 className="text-base font-bold text-slate-900">Add Family Member</h3>
            <form onSubmit={handleAddFamilyMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={famName}
                  onChange={(e) => setFamName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Relationship:</label>
                  <select
                    value={famRelation}
                    onChange={(e) => setFamRelation(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Age:</label>
                  <input
                    type="number"
                    value={famAge}
                    onChange={(e) => setFamAge(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number (Optional):</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={famPhone}
                  onChange={(e) => setFamPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFamilyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-amber-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 btn-gold text-xs font-semibold rounded-xl"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-50/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <h3 className="text-base font-bold text-slate-900">Register Resident Vehicle</h3>
            <form onSubmit={handleAddVehicle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registration Number:</label>
                <input
                  type="text"
                  required
                  value={vehReg}
                  onChange={(e) => setVehReg(e.target.value)}
                  placeholder="e.g. MH-27-AZ-4509"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Type:</label>
                  <select
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="4-Wheeler">4-Wheeler Car</option>
                    <option value="2-Wheeler">2-Wheeler / Bike</option>
                    <option value="Electric Vehicle">Electric Vehicle (EV)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Make & Model:</label>
                  <input
                    type="text"
                    required
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    placeholder="e.g. Hyundai Creta"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-amber-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
