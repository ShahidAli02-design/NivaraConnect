import React, { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle2, AlertTriangle, Download, 
  QrCode, Receipt, ArrowRight, ShieldCheck, Printer, Calendar
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { MaintenanceBill } from '../types';

export const BillingView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillForPay, setSelectedBillForPay] = useState<MaintenanceBill | null>(null);
  const [selectedBillReceipt, setSelectedBillReceipt] = useState<MaintenanceBill | null>(null);

  // Payment Modal State
  const [payMethod, setPayMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  useEffect(() => {
    loadBills();
  }, [refreshTrigger, currentUser.apartmentId]);

  const loadBills = async () => {
    try {
      const aptId = currentUser.role === 'resident' ? currentUser.apartmentId : undefined;
      const data = await api.getBills(aptId);
      setBills(data);
    } catch (e) {
      console.error('Failed to load bills', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = async () => {
    if (!selectedBillForPay) return;
    setIsProcessing(true);
    try {
      const res = await api.payBill(selectedBillForPay.id, payMethod);
      if (res.success) {
        triggerSound('success');
        setPaidSuccess(true);
        loadBills();
      }
    } catch (e) {
      console.error('Payment error', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingBills = bills.filter(b => b.status === 'Pending');
  const paidBills = bills.filter(b => b.status === 'Paid');

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm text-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            Society Maintenance & Billing Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser.role === 'resident'
              ? `Maintenance ledger & invoices for Flat ${currentUser.apartmentId || 'A-402'}`
              : 'Society billing collection audit, outstanding dues & accounts'}
          </p>
        </div>

        {/* Total Summary */}
        <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Dues Outstanding</div>
            <div className="text-lg font-bold text-amber-400">
              ₹{pendingBills.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Paid Invoices</div>
            <div className="text-lg font-bold text-emerald-400">
              {paidBills.length} Invoices
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Maintenance Invoices</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bills.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                    Flat {b.apartmentId}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    b.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{b.month} Maintenance Bill</h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">Invoice #{b.invoiceNumber}</div>
                </div>

                {/* Line Item Breakdown */}
                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base Maintenance & Security</span>
                    <span className="font-mono font-medium">₹{b.baseAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sinking & Capital Reserve Fund</span>
                    <span className="font-mono font-medium">₹{b.sinkingFund}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Water Supply & Common Electric</span>
                    <span className="font-mono font-medium">₹{b.waterCharges + b.commonElectricity}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white text-sm">
                    <span>Total Amount Payable</span>
                    <span className="text-indigo-400 font-mono">₹{b.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {b.status === 'Paid' ? `Paid on ${b.paidDate}` : `Due by ${b.dueDate}`}
                </span>

                {b.status === 'Pending' ? (
                  <button
                    onClick={() => {
                      setSelectedBillForPay(b);
                      setPaidSuccess(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    Pay ₹{b.totalAmount} Now
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedBillReceipt(b)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" /> View Receipt
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {selectedBillForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  {paidSuccess ? 'Payment Successful!' : 'Society Maintenance Payment'}
                </h3>
                <p className="text-xs text-slate-400">Nivara Heights Residents Association</p>
              </div>
              <button onClick={() => setSelectedBillForPay(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {paidSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">₹{selectedBillForPay.totalAmount} Paid</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Your payment was processed successfully. Receipt #{selectedBillForPay.invoiceNumber} has been generated.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const b = selectedBillForPay;
                      setSelectedBillForPay(null);
                      setSelectedBillReceipt(b);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 rounded-xl text-xs font-semibold"
                  >
                    View Official Receipt
                  </button>
                  <button
                    onClick={() => setSelectedBillForPay(null)}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-400">Invoice Amount</div>
                    <div className="font-bold text-white text-base">₹{selectedBillForPay.totalAmount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400">Flat Number</div>
                    <div className="font-semibold text-slate-200">{selectedBillForPay.apartmentId}</div>
                  </div>
                </div>

                {/* Payment Method Tabs */}
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  {(['UPI', 'Card', 'NetBanking'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl border text-center transition-all ${
                        payMethod === m
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Method Content */}
                {payMethod === 'UPI' && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                    <div className="bg-white p-3 rounded-xl inline-block shadow-sm">
                      <QRCodeSVG
                        value={`upi://pay?pa=society.nivara@hdfcbank&pn=NivaraHeights&am=${selectedBillForPay.totalAmount}&cu=INR&tn=${selectedBillForPay.invoiceNumber}`}
                        size={110}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                    </p>
                    <div className="text-[11px] font-mono text-indigo-400 font-semibold">
                      UPI ID: society.nivara@hdfcbank
                    </div>
                  </div>
                )}

                {payMethod === 'Card' && (
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Card Number (4000 1234 5678 9010)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="MM / YY"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 text-center font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="password"
                        placeholder="CVV"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 text-center font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {payMethod === 'NetBanking' && (
                  <div className="space-y-2 text-xs">
                    <select className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500">
                      <option>HDFC Bank</option>
                      <option>State Bank of India</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={handlePayBill}
                  disabled={isProcessing}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  {isProcessing ? 'Processing Transaction...' : `Confirm & Pay ₹${selectedBillForPay.totalAmount}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedBillReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase text-slate-400">Official Society Receipt</span>
              <button onClick={() => setSelectedBillReceipt(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {/* Printable Receipt Paper */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <div className="text-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">NIVARA HEIGHTS CO-OP HOUSING SOCIETY</h3>
                <p className="text-[11px] text-slate-400">Reg No: MAH/PUN/RHS-8924 • Sector 14, Pune 411045</p>
                <div className="text-indigo-400 font-bold mt-1 text-sm tracking-wider">MAINTENANCE RECEIPT</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>Receipt No: <strong className="font-mono text-white">{selectedBillReceipt.invoiceNumber}</strong></div>
                <div className="text-right">Flat No: <strong className="text-white">{selectedBillReceipt.apartmentId}</strong></div>
                <div>Billing Period: <strong className="text-white">{selectedBillReceipt.month}</strong></div>
                <div className="text-right">Payment Date: <strong className="text-white">{selectedBillReceipt.paidDate || 'Paid'}</strong></div>
              </div>

              <div className="divide-y divide-slate-800 border-t border-b border-slate-800 py-2 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>General Maintenance</span>
                  <span className="text-slate-200 font-mono">₹{selectedBillReceipt.baseAmount}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1">
                  <span>Sinking & Reserve Fund</span>
                  <span className="text-slate-200 font-mono">₹{selectedBillReceipt.sinkingFund}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1">
                  <span>Utilities (Water & Common Light)</span>
                  <span className="text-slate-200 font-mono">₹{selectedBillReceipt.waterCharges + selectedBillReceipt.commonElectricity}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-2 text-sm">
                  <span>Total Amount Paid</span>
                  <span className="text-indigo-400 font-mono">₹{selectedBillReceipt.totalAmount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Payment Mode: {selectedBillReceipt.paymentMode || 'UPI Digital'}</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Authenticated & Reconciled
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.print?.();
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedBillReceipt(null)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
