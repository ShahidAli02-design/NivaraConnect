import React, { useState, useEffect } from 'react';
import { UserMinus, Trash2 } from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { User } from '../types';

export const ManageAccountsView: React.FC = () => {
  const { refreshTrigger } = useRealtime();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const load = async () => {
    try {
      const usrs = await api.getUsers();
      setUsers(usrs);
    } catch (e) {
      console.error('Failed to load accounts', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Delete ${user.name}'s account permanently? This cannot be undone.`)) return;
    setDeletingId(user.id);
    try {
      await api.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: any) {
      window.alert(e?.message || 'Could not delete this account.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="glass-card rounded-3xl p-6 border-amber-200/80 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Manage Accounts</h1>
            <p className="text-xs text-slate-500">All active login accounts — delete an account to permanently revoke access</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-5 border-amber-200/80 shadow-sm">
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400 font-medium">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 font-medium">No accounts yet.</div>
          ) : (
            users.map((u) => (
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
                  onClick={() => handleDelete(u)}
                  disabled={deletingId === u.id}
                  className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {deletingId === u.id ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
