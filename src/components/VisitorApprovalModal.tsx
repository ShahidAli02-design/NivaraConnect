import React, { useState } from 'react';
import { ShieldCheck, UserX, CheckCircle, Car, Package, UserCheck, BellRing, Phone, X } from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';

export const VisitorApprovalModal: React.FC = () => {
  const { incomingVisitor, setIncomingVisitor, triggerSound } = useRealtime();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!incomingVisitor) return null;

  const handleAction = async (status: 'Approved' | 'Denied') => {
    setIsProcessing(true);
    try {
      if (status === 'Approved') {
        triggerSound('success');
      }
      await api.updateVisitorStatus(incomingVisitor.id, status === 'Approved' ? 'Inside' : 'Denied');
      setIncomingVisitor(null);
    } catch (e) {
      console.error('Failed to update visitor status', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const getVisitorIcon = () => {
    switch (incomingVisitor.visitorType) {
      case 'Delivery': return Package;
      case 'Cab / Taxi': return Car;
      default: return UserCheck;
    }
  };

  const Icon = getVisitorIcon();

  return (
    <div id="visitor-approval-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div id="visitor-approval-box" className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-200 animate-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl animate-bounce">
              <BellRing className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Live Gate Ring</div>
              <h3 className="text-lg font-bold">Visitor at Main Gate</h3>
            </div>
          </div>
          <button
            onClick={() => setIncomingVisitor(null)}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {incomingVisitor.visitorType}
                </span>
                <span className="text-xs text-slate-500 font-mono">Pass #{incomingVisitor.passCode}</span>
              </div>
              <h4 className="text-base font-bold text-slate-900 mt-1">{incomingVisitor.name}</h4>
              {incomingVisitor.deliveryCompany && (
                <p className="text-xs text-slate-600 font-medium">Delivery: {incomingVisitor.deliveryCompany}</p>
              )}
              {incomingVisitor.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" /> {incomingVisitor.phone}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-500">Destination:</span>
              <p className="font-semibold text-slate-800">Flat {incomingVisitor.apartmentId}</p>
            </div>
            <div>
              <span className="text-slate-500">Purpose:</span>
              <p className="font-semibold text-slate-800 truncate">{incomingVisitor.purpose || 'Visit'}</p>
            </div>
            {incomingVisitor.vehicleNumber && (
              <div className="col-span-2 pt-1 border-t border-slate-200/60 mt-1">
                <span className="text-slate-500">Vehicle No: </span>
                <span className="font-mono font-bold text-slate-800">{incomingVisitor.vehicleNumber}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center">
            Security Guard Ramesh at Gate 1 is awaiting your approval to open the boom barrier.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleAction('Denied')}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserX className="w-4 h-4" /> Deny Entry
            </button>
            <button
              onClick={() => handleAction('Approved')}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Allow Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
