import React, { useState, useEffect } from 'react';
import {
  Building, Users, UserCheck, Wrench, ShieldAlert, CreditCard,
  Sparkles, CheckCircle2, Clock, AlertTriangle, Plus, ArrowUpRight,
  Send, PhoneCall, ChevronRight, FileText, Check, Filter, Zap,
  UserPlus, X, Mail, Phone, Wallet, TrendingUp, TrendingDown, Trash2, UserMinus
} from 'lucide-react';
import { api } from '../services/api';
import { SocietyStats, Complaint, Visitor, SOSAlert, Notice, MaintenanceBill, SocietyStaff, SignupRequest, Apartment, User, FundTransaction } from '../types';
import { useRealtime } from '../context/RealtimeContext';
import { fmtDateTime } from '../utils/format';

interface AdminDashboardProps {
  onNavigate: (tab: any) => void;
  onOpenSos?: () => void;
  onOpenAi?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onOpenSos, onOpenAi }) => {
  const { refreshTrigger } = useRealtime();
  const [stats, setStats] = useState<SocietyStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [staffList, setStaffList] = useState<SocietyStaff[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Manage Accounts
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Society Fund
  const [fundBalance, setFundBalance] = useState(0);
  const [fundTotalIn, setFundTotalIn] = useState(0);
  const [fundTotalOut, setFundTotalOut] = useState(0);
  const [fundTransactions, setFundTransactions] = useState<FundTransaction[]>([]);
  const [showFundModal, setShowFundModal] = useState(false);
  const [ftType, setFtType] = useState<'credit' | 'debit'>('debit');
  const [ftCategory, setFtCategory] = useState('Renovation');
  const [ftAmount, setFtAmount] = useState('');
  const [ftDescription, setFtDescription] = useState('');
  const [ftDate, setFtDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSavingFundTx, setIsSavingFundTx] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [deletingFundTxId, setDeletingFundTxId] = useState<string | null>(null);

  // AI Notice Drafter State
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('Maintenance');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftPriority, setDraftPriority] = useState('Normal');
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, [refreshTrigger]);

  const loadAdminData = async () => {
    try {
      const [st, cmps, vis, sos, nots, stf, sigReqs, apts, usrs, fund] = await Promise.all([
        api.getStats(),
        api.getComplaints(),
        api.getVisitors(),
        api.getSosAlerts(),
        api.getNotices(),
        api.getStaff(),
        api.getSignupRequests('pending'),
        api.getApartments(),
        api.getUsers(),
        api.getFund(),
      ]);
      setStats(st);
      setComplaints(cmps);
      setVisitors(vis);
      setSosAlerts(sos);
      setNotices(nots);
      setStaffList(stf);
      setSignupRequests(sigReqs);
      setApartments(apts);
      setAllUsers(usrs);
      setFundBalance(fund.balance);
      setFundTotalIn(fund.totalIn);
      setFundTotalOut(fund.totalOut);
      setFundTransactions(fund.transactions);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Delete ${user.name}'s account permanently? This cannot be undone.`)) return;
    setDeletingUserId(user.id);
    try {
      await api.deleteUser(user.id);
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: any) {
      window.alert(e?.message || 'Could not delete this account.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleAddFundTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFundError(null);
    const amt = Number(ftAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFundError('Enter a valid amount greater than 0.');
      return;
    }
    setIsSavingFundTx(true);
    try {
      await api.createFundTransaction({
        type: ftType,
        category: ftCategory,
        amount: amt,
        description: ftDescription,
        date: ftDate,
        recordedBy: 'Prof. Rajesh Kulkarni (Secretary)',
      });
      setShowFundModal(false);
      setFtAmount('');
      setFtDescription('');
      loadAdminData();
    } catch (err: any) {
      setFundError(err?.message || 'Could not save this transaction.');
    } finally {
      setIsSavingFundTx(false);
    }
  };

  const handleDeleteFundTransaction = async (id: string) => {
    if (!window.confirm('Delete this fund transaction? This will change the society balance.')) return;
    setDeletingFundTxId(id);
    try {
      await api.deleteFundTransaction(id);
      loadAdminData();
    } catch (e: any) {
      window.alert(e?.message || 'Could not delete this transaction.');
    } finally {
      setDeletingFundTxId(null);
    }
  };

  const handleApproveSignup = async (id: string) => {
    setProcessingRequestId(id);
    try {
      await api.approveSignupRequest(id, 'Prof. Rajesh Kulkarni (Secretary)');
      setSignupRequests(prev => prev.filter(r => r.id !== id));
      loadAdminData();
    } catch (e) {
      console.error('Failed to approve signup request', e);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectSignup = async (id: string) => {
    setProcessingRequestId(id);
    try {
      await api.rejectSignupRequest(id, 'Prof. Rajesh Kulkarni (Secretary)');
      setSignupRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Failed to reject signup request', e);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleAiDraftNotice = async () => {
    if (!aiTopic.trim()) return;
    setIsDraftingAi(true);
    try {
      const result = await api.draftNoticeWithAi(aiTopic, aiCategory, 'Professional and urgent if needed');
      setDraftTitle(result.title);
      setDraftContent(result.content);
      setDraftPriority(result.priority);
    } catch (e) {
      console.error('AI draft failed', e);
    } finally {
      setIsDraftingAi(false);
    }
  };

  const handlePublishNotice = async () => {
    if (!draftTitle || !draftContent) return;
    setIsPublishingNotice(true);
    try {
      await api.createNotice({
        title: draftTitle,
        content: draftContent,
        category: aiCategory,
        priority: draftPriority,
        publishedBy: 'Prof. Rajesh Kulkarni (Secretary)',
        publisherRole: 'admin',
      });
      setShowNoticeModal(false);
      setDraftTitle('');
      setDraftContent('');
      setAiTopic('');
      loadAdminData();
    } catch (e) {
      console.error('Failed to publish notice', e);
    } finally {
      setIsPublishingNotice(false);
    }
  };

  const handleUpdateComplaintStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateComplaint(id, {
        status: newStatus,
        comment: `Status moved to ${newStatus} by Society Secretary`,
        updatedBy: 'Prof. Rajesh Kulkarni (Secretary)',
      });
      loadAdminData();
    } catch (e) {
      console.error('Failed to update complaint', e);
    }
  };

  const handleResolveSos = async (alertId: string) => {
    try {
      await api.respondSos(alertId, {
        status: 'RESOLVED',
        respondedByGuard: 'Security Supervisor & Secretary',
        resolutionRemarks: 'Attended on-site. Issue verified resolved.',
      });
      loadAdminData();
    } catch (e) {
      console.error('Failed to resolve SOS', e);
    }
  };

  const activeSos = sosAlerts.filter(s => s.status === 'ACTIVE' || s.status === 'RESPONDING');
  const openComplaintsList = complaints.filter(c => c.status === 'Open' || c.status === 'In Progress');

  return (
    <div className="space-y-6 pb-6">
      {/* Sleek Top Header Bar */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-200/80 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-widest mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow-dot"></span>
            <span>Admin Command Center</span>
            <span>•</span>
            <span>Sunrise Heights CHS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Control Center & Society Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Real-time management for 120 apartments across Wings A, B, and C. Monitoring gate traffic, service requests, and community broadcast.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowNoticeModal(true)}
            className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Draft Notice</span>
          </button>
          <button
            onClick={() => onNavigate('complaints')}
            className="btn-secondary-pearl px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <Wrench className="w-4 h-4 text-amber-700" />
            <span>Service Board</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SOS EMERGENCY BANNER */}
      {activeSos.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-500 text-slate-900 p-5 rounded-3xl shadow-xl animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-md">
                <ShieldAlert className="w-7 h-7 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white px-2 py-0.5 rounded-full">
                    {activeSos[0].status} EMERGENCY
                  </span>
                  <span className="text-xs font-mono text-slate-500">{activeSos[0].triggeredAt.slice(11, 16)}</span>
                </div>
                <h3 className="text-base font-black text-rose-900 mt-1">
                  {activeSos[0].category} - Flat {activeSos[0].apartmentId} ({activeSos[0].triggeredByName})
                </h3>
                <p className="text-xs text-rose-700 mt-0.5 font-medium">
                  {activeSos[0].notes || 'Immediate assistance requested by resident.'} • Phone: {activeSos[0].triggeredByPhone}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleResolveSos(activeSos[0].id)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark Resolved
            </button>
          </div>
        </div>
      )}

      {/* NEW ACCOUNT APPROVAL REQUESTS */}
      <div className="glass-card rounded-3xl overflow-hidden flex flex-col border-amber-300/80 shadow-md">
        <div className="p-5 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl relative">
              <UserPlus className="w-4 h-4" />
              {signupRequests.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {signupRequests.length}
                </span>
              )}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">New Account Requests</h4>
              <p className="text-[11px] text-slate-500">New sign-ups activate only after you approve them here</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {signupRequests.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-medium">No pending account requests right now.</div>
          ) : (
            signupRequests.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-amber-200/80 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-black text-sm uppercase">
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{r.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border bg-amber-100 text-amber-800 border-amber-300">
                        {r.role === 'admin' ? 'Secretary' : r.role === 'security' ? 'Security' : 'Resident'}
                      </span>
                      {r.apartmentId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border bg-slate-100 text-slate-700 border-slate-200">
                          Flat {r.apartmentId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>
                      {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      Requested {new Date(r.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRejectSignup(r.id)}
                    disabled={processingRequestId === r.id}
                    className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleApproveSignup(r.id)}
                    disabled={processingRequestId === r.id}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SOCIETY FUND / TREASURY */}
      <div className="glass-card rounded-3xl overflow-hidden border-amber-300/80 shadow-md">
        <div className="p-5 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Society Fund</h4>
              <p className="text-[11px] text-slate-500">Track the society's balance — collections in, expenses out, with dates</p>
            </div>
          </div>
          <button
            onClick={() => { setFundError(null); setShowFundModal(true); }}
            className="btn-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Transaction
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="p-4 bg-white rounded-2xl border border-amber-200/80 shadow-xs">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Balance</p>
              <h3 className={`text-2xl font-black mt-1 ${fundBalance >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                ₹{fundBalance.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Total In
              </p>
              <h3 className="text-2xl font-black mt-1 text-emerald-700">₹{fundTotalIn.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs">
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Total Out
              </p>
              <h3 className="text-2xl font-black mt-1 text-rose-700">₹{fundTotalOut.toLocaleString('en-IN')}</h3>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {fundTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">No fund transactions recorded yet.</div>
            ) : (
              fundTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-amber-200/80 text-xs shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${t.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {t.type === 'credit' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{t.category}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(t.date).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                      </div>
                      {t.description && <div className="text-slate-500 text-[11px] mt-0.5 truncate">{t.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-black text-sm ${t.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => handleDeleteFundTransaction(t.id)}
                      disabled={deletingFundTxId === t.id}
                      title="Delete transaction"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MANAGE ACCOUNTS */}
      <div className="glass-card rounded-3xl overflow-hidden border-amber-300/80 shadow-md">
        <div className="p-5 border-b border-amber-100 flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <UserMinus className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Manage Accounts</h4>
            <p className="text-[11px] text-slate-500">All active login accounts — delete an account to permanently revoke access</p>
          </div>
        </div>

        <div className="p-5 space-y-2 max-h-96 overflow-y-auto">
          {allUsers.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-medium">No accounts yet.</div>
          ) : (
            allUsers.map((u) => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-amber-200/80 shadow-xs text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-amber-200 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-black uppercase">
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{u.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border bg-amber-100 text-amber-800 border-amber-300">
                        {u.role === 'admin' ? 'Secretary' : u.role === 'security' ? 'Security' : 'Resident'}
                      </span>
                      {u.apartmentId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border bg-slate-100 text-slate-700 border-slate-200">
                          Flat {u.apartmentId}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 mt-0.5 truncate">{u.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteUser(u)}
                  disabled={deletingUserId === u.id}
                  className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {deletingUserId === u.id ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border-amber-200/70">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Occupancy</p>
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">
            {stats?.occupiedFlats ?? 0} <span className="text-sm font-normal text-slate-400">/ {stats?.totalFlats ?? 0}</span>
          </h3>
          <p className="text-emerald-700 text-xs mt-2 font-bold flex items-center gap-1">
            {stats && stats.totalFlats > 0 ? Math.round((stats.occupiedFlats / stats.totalFlats) * 100) : 0}% Occupied • {stats?.totalResidents ?? 0} Residents
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-amber-200/70">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Active Visitors</p>
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">
            {stats?.activeVisitorsInside || 2} <span className="text-sm font-normal text-slate-400">inside</span>
          </h3>
          <p className="text-amber-800 text-xs mt-2 font-semibold">
            {stats?.pendingApprovals || 1} pre-approved / pending
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-amber-200/70">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Open Issues</p>
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">
            {stats?.openComplaints || 2}
          </h3>
          <p className="text-amber-700 text-xs mt-2 font-semibold">
            1 plumbing, 1 electrical
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-amber-200/70">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Collection Rate</p>
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900">
            {stats?.maintenanceCollectionRate || 85}%
          </h3>
          <p className="text-emerald-700 text-xs mt-2 font-bold">
            ₹{(stats?.totalCollectionMonth || 6400).toLocaleString('en-IN')} collected
          </p>
        </div>
      </section>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Complaint Dispatch Board & Gate Traffic */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Complaints Requiring Action */}
          <div className="glass-card rounded-3xl overflow-hidden flex flex-col border-amber-200/80">
            <div className="p-5 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Service Requests & Complaint Triage</h4>
                  <p className="text-[11px] text-slate-500">Live resident complaints with automated AI suggestions</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('complaints')}
                className="text-xs text-amber-800 hover:text-amber-900 flex items-center gap-1 font-bold"
              >
                View All ({complaints.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-amber-100 p-5 space-y-4">
              {openComplaintsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">All complaints have been resolved!</div>
              ) : (
                openComplaintsList.map((c) => (
                  <div key={c.id} className="pt-3 first:pt-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            c.priority === 'Emergency' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            c.priority === 'High' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {c.priority}
                          </span>
                          <span className="text-xs font-bold text-slate-900">Flat {c.apartmentId}</span>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs text-slate-600">{c.residentName}</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900 mt-1">{c.title}</h5>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{c.description}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl whitespace-nowrap border ${
                        c.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    {/* AI Triage Recommendation pill */}
                    {c.aiTriageSummary && (
                      <div className="bg-amber-50/70 border border-amber-300/60 p-3 rounded-2xl text-xs flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900">AI Triage Suggestion: </span>
                          <span className="text-slate-700">{c.aiTriageSummary.suggestedAction}</span>
                          <span className="text-[11px] text-amber-800 block font-mono mt-0.5">Est. Resolution: {c.aiTriageSummary.estimatedTime}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-slate-500">
                        Assigned: <strong className="text-slate-800 font-bold">{c.assignedStaff || 'Unassigned'}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.status === 'Open' && (
                          <button
                            onClick={() => handleUpdateComplaintStatus(c.id, 'In Progress')}
                            className="text-xs font-bold px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            Mark In-Progress
                          </button>
                        )}
                        {c.status === 'In Progress' && (
                          <button
                            onClick={() => handleUpdateComplaintStatus(c.id, 'Resolved')}
                            className="text-xs font-bold px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Gate Traffic Log Table */}
          <div className="glass-card rounded-3xl overflow-hidden flex flex-col border-amber-200/80">
            <div className="p-5 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Gate Traffic & Visitor Audit</h4>
                  <p className="text-[11px] text-slate-500">Real-time gate check-ins and pass validations</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('visitors')}
                className="text-xs text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1"
              >
                Visitor Logs <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50/60 text-slate-600 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-3">Visitor</th>
                    <th className="px-6 py-3">Destination</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 text-xs">
                  {visitors.slice(0, 4).map((v) => (
                    <tr key={v.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900">{v.name}</div>
                        <div className="text-slate-500 text-[11px]">{v.visitorType} {v.deliveryCompany ? `(${v.deliveryCompany})` : ''}</div>
                      </td>
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-800">
                        Flat {v.apartmentId}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          v.status === 'Inside' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          v.status === 'Checked Out' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          v.status === 'Denied' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-500 font-mono">
                        {v.entryTime ? fmtDateTime(v.entryTime) : 'Pre-pass'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Society Notices & Active Staff */}
        <div className="space-y-6">
          {/* Published Society Notices */}
          <div className="glass-card rounded-3xl p-5 flex flex-col border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700" />
                Active Notices ({notices.length})
              </h4>
              <button
                onClick={() => setShowNoticeModal(true)}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
              >
                + Draft Notice
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {notices.slice(0, 3).map((n) => (
                <div key={n.id} className="p-3.5 bg-white rounded-2xl border border-amber-200/80 text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      n.priority === 'Urgent / Alert' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      n.priority === 'Important' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {n.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900">{n.title}</h5>
                  <p className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">{n.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Flat Occupancy: how many people live where */}
          <div className="glass-card rounded-3xl p-5 flex flex-col border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-700" />
                Flat Occupancy
              </h4>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                {stats?.totalResidents ?? 0} Residents
              </span>
            </div>

            <div className="space-y-2 mt-4 max-h-80 overflow-y-auto pr-1">
              {apartments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium">No flats registered yet.</div>
              ) : (
                [...apartments]
                  .sort((a, b) => a.id.localeCompare(b.id))
                  .map((a) => {
                    const headcount = (a.occupantType !== 'vacant' ? 1 : 0) + a.familyMembers.length;
                    const primaryName = a.occupantType === 'tenant' ? a.tenantName || a.ownerName : a.ownerName;
                    return (
                      <div key={a.id} className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-amber-200/80 text-xs shadow-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900">Flat {a.id}</div>
                          <div className="text-[11px] text-slate-500 truncate capitalize">
                            {a.occupantType === 'vacant' ? 'Vacant' : `${a.occupantType} • ${primaryName}`}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                            headcount === 0
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {headcount} {headcount === 1 ? 'person' : 'people'}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* On-Duty Staff & Guards */}
          <div className="glass-card rounded-3xl p-5 flex flex-col border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-700" />
                On-Duty Staff
              </h4>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full uppercase">
                4 Active
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              {staffList.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-amber-200/80 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <img src={s.avatarUrl} alt={s.name} className="w-8 h-8 rounded-xl object-cover ring-1 ring-amber-200" />
                    <div>
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full uppercase">
                      {s.status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{s.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Notice Drafter Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-amber-300 space-y-4 text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Society Notice Drafter</h3>
                  <p className="text-xs text-slate-500">Generate professional announcements in seconds with Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* AI Generator Input */}
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-300 space-y-2">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                Notice Topic or Brief Bullet Points:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Solar panel installation work & power cutoff on Saturday"
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleAiDraftNotice}
                  disabled={isDraftingAi || !aiTopic.trim()}
                  className="btn-gold px-4 py-2.5 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isDraftingAi ? 'Drafting...' : 'Generate with AI'}
                </button>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Headline:</label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Notice Headline"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category:</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Water / Power Supply">Water / Power Supply</option>
                    <option value="AGM / Meeting">AGM / Meeting</option>
                    <option value="Event">Event</option>
                    <option value="Security">Security</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority:</label>
                  <select
                    value={draftPriority}
                    onChange={(e) => setDraftPriority(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent / Alert">Urgent / Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Content Body:</label>
                <textarea
                  rows={4}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Full notice message..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowNoticeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishNotice}
                disabled={isPublishingNotice || !draftTitle || !draftContent}
                className="btn-gold flex-1 py-2.5 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                {isPublishingNotice ? 'Publishing Broadcast...' : 'Publish to All Residents'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fund Transaction Modal */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-amber-300 space-y-4 text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Fund Transaction</h3>
                  <p className="text-xs text-slate-500">Record money in or out of the society fund</p>
                </div>
              </div>
              <button
                onClick={() => setShowFundModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFundTransaction} className="space-y-3.5">
              {fundError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{fundError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setFtType('credit'); setFtCategory('Maintenance Collection'); }}
                  className={`py-2 rounded-xl transition-all ${ftType === 'credit' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Money In (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => { setFtType('debit'); setFtCategory('Renovation'); }}
                  className={`py-2 rounded-xl transition-all ${ftType === 'debit' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Money Out (Debit)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={ftCategory}
                  onChange={(e) => setFtCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {ftType === 'credit' ? (
                    <>
                      <option value="Maintenance Collection">Maintenance Collection</option>
                      <option value="Donation">Donation</option>
                      <option value="Other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="Renovation">Renovation</option>
                      <option value="Event / Program">Event / Program</option>
                      <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                      <option value="Utility Bills">Utility Bills</option>
                      <option value="Staff Salary">Staff Salary</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ftAmount}
                    onChange={(e) => setFtAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={ftDate}
                    onChange={(e) => setFtDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={ftDescription}
                  onChange={(e) => setFtDescription(e.target.value)}
                  placeholder="e.g. Clubhouse ceiling renovation, Ganesh Festival mandap setup..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingFundTx}
                className="w-full mt-1 py-3 bg-gold-gradient text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSavingFundTx ? 'Saving...' : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
