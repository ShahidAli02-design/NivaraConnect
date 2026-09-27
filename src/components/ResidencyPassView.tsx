import React, { useState, useEffect } from 'react';
import { Crown, QrCode, ArrowDownToLine, ArrowUpFromLine, Search, Car, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { ResidentPass, ResidentEntry } from '../types';
import { fmtDate, fmtTime, fmtDateTime } from '../utils/format';

const statusPill = (s: 'Inside' | 'Outside') =>
  s === 'Inside'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : 'bg-slate-100 text-slate-600 border-slate-200';

export const ResidencyPassView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();
  const isGuard = currentUser.role === 'security';
  const isAdmin = currentUser.role === 'admin';

  const [passes, setPasses] = useState<ResidentPass[]>([]);
  const [entries, setEntries] = useState<ResidentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Guard scanner
  const [codeInput, setCodeInput] = useState('');
  const [scanned, setScanned] = useState<ResidentPass | null>(null);
  const [scanError, setScanError] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const load = async () => {
    try {
      const [p, e] = await Promise.all([api.getResidentPasses(), api.getResidentEntries(isGuard || isAdmin ? undefined : currentUser.apartmentId)]);
      setPasses(p);
      setEntries(e);
      setScanned(prev => (prev ? p.find(x => x.passId === prev.passId) || null : null));
    } catch (err) {
      console.error('Failed to load residency passes', err);
    } finally {
      setLoading(false);
    }
  };

  const lookup = () => {
    setScanError('');
    setMessage('');
    const found = passes.find(p => p.code.toLowerCase() === codeInput.trim().toLowerCase());
    if (!found) {
      setScanned(null);
      setScanError('No Premium Residency Pass found for this code.');
      return;
    }
    setScanned(found);
  };

  const mark = async (holderName: string, direction: 'IN' | 'OUT') => {
    if (!scanned) return;
    setScanError('');
    try {
      const res = await api.scanResidentPass({
        code: scanned.code,
        holderName,
        direction,
        vehicleNumber: vehicle || undefined,
        loggedBy: currentUser.name,
      });
      triggerSound('success');
      setMessage(`${res.entry.holderName} marked ${direction === 'IN' ? 'ENTERED' : 'EXITED'} at ${fmtDateTime(res.entry.timestamp)}.`);
      setVehicle('');
      load();
    } catch (err: any) {
      setScanError(err?.message || 'Could not log movement.');
    }
  };

  const myPass = passes.find(p => p.apartmentId === currentUser.apartmentId);

  const LogTable = ({ rows }: { rows: ResidentEntry[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-amber-50/60 text-slate-600 uppercase font-bold text-[11px]">
          <tr>
            <th className="px-4 py-2.5">Resident</th>
            <th className="px-4 py-2.5">Flat</th>
            <th className="px-4 py-2.5">Movement</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                No movements logged yet.
              </td>
            </tr>
          ) : (
            rows.slice(0, 30).map(r => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 font-bold text-slate-800">
                  {r.holderName}
                  {r.vehicleNumber && <div className="font-mono font-normal text-[10px] text-slate-400">{r.vehicleNumber}</div>}
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-700">{r.apartmentId}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${r.direction === 'IN' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                    {r.direction === 'IN' ? 'Inside' : 'Outside'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(r.timestamp)}</td>
                <td className="px-4 py-2.5 font-mono text-slate-600">{fmtTime(r.timestamp)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const PassCard = ({ pass }: { pass: ResidentPass }) => (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 border border-amber-400 shadow-xl space-y-4 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800">
            <Crown className="w-3.5 h-3.5" /> Premium Residency Pass
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">Flat {pass.apartmentId}</div>
          <div className="text-[11px] text-slate-600">Nivara Heights • Valid until {fmtDate(pass.validUntil)}</div>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-md border border-amber-200 shrink-0">
          <QRCodeSVG value={`NIVARA-RESIDENT:${pass.code}`} size={84} />
        </div>
      </div>

      <div className="font-mono text-sm font-black tracking-wider text-amber-900 bg-white/70 border border-amber-300 rounded-xl px-3 py-2 inline-flex items-center gap-2">
        <QrCode className="w-4 h-4" /> {pass.code}
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
          <Users className="w-3 h-3" /> Pass holders
        </div>
        {pass.holders.map(h => (
          <div key={h.name} className="flex items-center justify-between bg-white/70 border border-amber-200 rounded-xl px-3 py-2 text-xs">
            <div>
              <span className="font-bold text-slate-800">{h.name}</span>
              <span className="text-slate-400"> • {h.relation}</span>
              {h.lastMovementAt && <div className="text-[10px] text-slate-400">Last: {fmtDateTime(h.lastMovementAt)}</div>}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusPill(h.status)}`}>{h.status}</span>
          </div>
        ))}
      </div>

      {pass.vehicles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
          <Car className="w-3.5 h-3.5" />
          {pass.vehicles.map(v => (
            <span key={v} className="font-mono bg-white/70 border border-amber-200 rounded-lg px-2 py-0.5">
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-6">
      <div className="glass-card rounded-3xl p-6 border-amber-200/80 shadow-md flex items-center gap-3">
        <div className="p-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
          <Crown className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Premium Residency Pass</h1>
          <p className="text-xs text-slate-500">
            {isGuard
              ? 'Gate entry for people who live here — no Aadhaar check needed, just scan the resident’s pass.'
              : isAdmin
              ? 'All residency passes and live resident gate movements.'
              : 'Your household’s pass for quick gate entry and exit.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-xs text-slate-400 py-8">Loading…</div>
      ) : (
        <>
          {/* Resident: own pass */}
          {!isGuard && !isAdmin &&
            (myPass ? (
              <PassCard pass={myPass} />
            ) : (
              <div className="glass-card rounded-3xl p-6 border-amber-200/80 text-sm text-slate-600">
                No residency pass is issued for {currentUser.apartmentId ? `Flat ${currentUser.apartmentId}` : 'your account'} yet. Ask the Secretary to register your flat.
              </div>
            ))}

          {/* Guard: scanner */}
          {isGuard && (
            <div className="glass-card rounded-3xl p-5 border-amber-200/80 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Scan Resident Pass</h3>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookup()}
                  placeholder="Enter pass code e.g. NVR-A402-XXXX"
                  className="flex-1 text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
                <button onClick={lookup} className="btn-gold px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Find
                </button>
              </div>
              {scanError && <div className="text-[11px] text-rose-700 font-semibold">{scanError}</div>}
              {message && <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium">{message}</div>}

              {scanned && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">Flat {scanned.apartmentId}</span>
                    <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  </div>
                  <input
                    value={vehicle}
                    onChange={e => setVehicle(e.target.value)}
                    placeholder="Vehicle number (optional)"
                    className="w-full text-xs font-mono px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-amber-500"
                  />
                  {scanned.holders.map(h => (
                    <div key={h.name} className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{h.name}</div>
                        <div className="text-slate-400">{h.relation}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusPill(h.status)}`}>{h.status}</span>
                        {h.status === 'Outside' ? (
                          <button onClick={() => mark(h.name, 'IN')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1">
                            <ArrowDownToLine className="w-3 h-3" /> Enter
                          </button>
                        ) : (
                          <button onClick={() => mark(h.name, 'OUT')} className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 rounded-lg font-bold flex items-center gap-1">
                            <ArrowUpFromLine className="w-3 h-3" /> Exit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin: pass directory */}
          {isAdmin && (
            <div className="glass-card rounded-3xl p-5 border-amber-200/80 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Issued Passes ({passes.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {passes.map(p => (
                  <div key={p.passId} className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">Flat {p.apartmentId}</span>
                      <span className="font-mono text-amber-800 font-bold">{p.code}</span>
                    </div>
                    <div className="text-slate-500">
                      {p.holders.filter(h => h.status === 'Inside').length} of {p.holders.length} inside
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movement log */}
          <div className="glass-card rounded-3xl overflow-hidden border-amber-200/80">
            <div className="p-5 border-b border-amber-100">
              <h3 className="text-sm font-bold text-slate-900">{isGuard || isAdmin ? 'Resident Gate Movements' : 'My Household Movements'}</h3>
              <p className="text-[11px] text-slate-500">Inside / Outside with date and time</p>
            </div>
            <LogTable rows={entries} />
          </div>
        </>
      )}
    </div>
  );
};
