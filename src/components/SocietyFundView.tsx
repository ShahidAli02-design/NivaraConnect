import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { FundTransaction } from '../types';

export const SocietyFundView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger } = useRealtime();
  const canManage = currentUser.role === 'admin';

  const [balance, setBalance] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [ftType, setFtType] = useState<'credit' | 'debit'>('debit');
  const [ftCategory, setFtCategory] = useState('Renovation');
  const [ftAmount, setFtAmount] = useState('');
  const [ftDescription, setFtDescription] = useState('');
  const [ftDate, setFtDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const load = async () => {
    try {
      const fund = await api.getFund();
      setBalance(fund.balance);
      setTotalIn(fund.totalIn);
      setTotalOut(fund.totalOut);
      setTransactions(fund.transactions);
    } catch (e) {
      console.error('Failed to load society fund', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(ftAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }
    setIsSaving(true);
    try {
      await api.createFundTransaction({
        type: ftType,
        category: ftCategory,
        amount: amt,
        description: ftDescription,
        date: ftDate,
        recordedBy: currentUser.name,
      });
      setShowModal(false);
      setFtAmount('');
      setFtDescription('');
      load();
    } catch (err: any) {
      setError(err?.message || 'Could not save this transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this fund transaction? This will change the society balance.')) return;
    setDeletingId(id);
    try {
      await api.deleteFundTransaction(id);
      load();
    } catch (e: any) {
      window.alert(e?.message || 'Could not delete this transaction.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="glass-card rounded-3xl p-6 border-amber-200/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Society Fund</h1>
              <p className="text-xs text-slate-500">Track the society's balance — collections in, expenses out, with dates</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => { setError(null); setShowModal(true); }}
              className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Transaction
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-amber-200/70">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Current Balance</p>
          <h3 className={`text-3xl font-black ${balance >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
            ₹{balance.toLocaleString('en-IN')}
          </h3>
        </div>
        <div className="glass-card p-5 rounded-2xl border-emerald-200">
          <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Total In
          </p>
          <h3 className="text-3xl font-black text-emerald-700">₹{totalIn.toLocaleString('en-IN')}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl border-rose-200">
          <p className="text-rose-700 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Total Out
          </p>
          <h3 className="text-3xl font-black text-rose-700">₹{totalOut.toLocaleString('en-IN')}</h3>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-5 border-amber-200/80 shadow-sm">
        <h4 className="font-bold text-slate-900 text-sm pb-3 border-b border-amber-100 mb-3">Transaction History</h4>
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400 font-medium">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 font-medium">No fund transactions recorded yet.</div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-amber-200/80 text-xs shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${t.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {t.type === 'credit' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{t.category}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(t.date).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                    </div>
                    {t.description && <div className="text-slate-500 text-[11px] mt-0.5">{t.description}</div>}
                    <div className="text-[10px] text-slate-400 mt-0.5">Recorded by {t.recordedBy}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-black text-sm ${t.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      title="Delete transaction"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Fund Transaction Modal */}
      {showModal && (
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
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3.5">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
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
                disabled={isSaving}
                className="w-full mt-1 py-3 bg-gold-gradient text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
