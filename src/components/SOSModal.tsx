import React, { useState } from 'react';
import { AlertTriangle, Flame, HeartPulse, ShieldAlert, PhoneCall, Radio, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { SOSCategory } from '../types';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { triggerSound } = useRealtime();
  const [selectedCategory, setSelectedCategory] = useState<SOSCategory>('Medical Emergency');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const categories: { label: SOSCategory; icon: any; color: string; desc: string }[] = [
    { label: 'Medical Emergency', icon: HeartPulse, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', desc: 'Heart attack, injury, urgent ambulance required' },
    { label: 'Fire Hazard', icon: Flame, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', desc: 'Smoke, electrical spark, kitchen fire' },
    { label: 'Security Threat / Intruder', icon: ShieldAlert, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', desc: 'Suspicious intruder, theft, violent dispute' },
    { label: 'Lift Breakdown / Trapped', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', desc: 'Trapped inside elevator, power failure' },
  ];

  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    triggerSound('alert');
    try {
      await api.triggerSos({
        category: selectedCategory,
        apartmentId: currentUser.apartmentId || 'A-402',
        triggeredByName: currentUser.name,
        triggeredByPhone: currentUser.phone,
        notes: notes || `Immediate emergency assistance requested for Flat ${currentUser.apartmentId || 'A-402'}.`,
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        onClose();
      }, 3500);
    } catch (e) {
      console.error('Failed to trigger SOS', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="sos-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div id="sos-modal-container" className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 text-slate-200">
        {/* Header */}
        <div className="bg-rose-950/80 border-b border-rose-900/40 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl animate-pulse text-rose-400">
              <Radio className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Nivara Emergency SOS
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  Critical
                </span>
              </h2>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Broadcasts immediate siren alarm to all Security Guards & Society Administrators.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {submittedSuccess ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white">SOS Alert Dispatched!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Main Gate Security Guard and Society Secretary have been alerted with your location: <strong className="text-white font-semibold">Flat {currentUser.apartmentId || 'A-402'}</strong>. Guards are en route.
              </p>
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-xs text-rose-300 font-medium">
                Keep your phone line open at {currentUser.phone}.
              </div>
            </div>
          ) : (
            <>
              {/* Location Badge */}
              <div className="flex items-center justify-between bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Triggering Flat</span>
                  <div className="font-semibold text-slate-200">
                    Flat {currentUser.apartmentId || 'A-402'} • {currentUser.name}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Contact</span>
                  <div className="font-mono text-xs text-slate-300">{currentUser.phone}</div>
                </div>
              </div>

              {/* Emergency Category Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Emergency Type:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setSelectedCategory(cat.label)}
                        className={`p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500/10 shadow-sm'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                        }`}
                      >
                        <div className={`p-2 rounded-lg border ${cat.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-bold ${isSelected ? 'text-rose-300' : 'text-slate-200'}`}>
                            {cat.label}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{cat.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Specific Details (Optional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 2nd floor corridor smoke, patient needs wheelchair"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500 bg-slate-950/70 text-slate-200 placeholder-slate-500"
                />
              </div>

              {/* Direct Dial Emergency Helpline */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-slate-400">
                  <PhoneCall className="w-3.5 h-3.5 text-rose-400" /> Emergency Speed Dials:
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
                  <div className="bg-slate-900 py-1.5 rounded-lg border border-slate-800 text-slate-300">Gate: 001</div>
                  <div className="bg-slate-900 py-1.5 rounded-lg border border-slate-800 text-rose-400 font-bold">Ambulance: 108</div>
                  <div className="bg-slate-900 py-1.5 rounded-lg border border-slate-800 text-amber-400 font-bold">Police: 100</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700/60 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerSOS}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    'Broadcasting Alarm...'
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" /> Trigger Emergency Alarm
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
