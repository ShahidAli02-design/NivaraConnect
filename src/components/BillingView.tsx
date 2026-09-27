import React, { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, AlertTriangle, Download,
  QrCode, Receipt, ArrowRight, ShieldCheck, Printer, Calendar, Plus, Trash2, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { MaintenanceBill, Apartment } from '../types';

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

  // Secretary: create bill
  const isAdmin = currentUser.role === 'admin';
  const [showCreate, setShowCreate] = useState(false);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [cbApt, setCbApt] = useState('ALL');
  const [cbMonth, setCbMonth] = useState(new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  const [cbBase, setCbBase] = useState('2200');
  const [cbSinking, setCbSinking] = useState('400');
  const [cbWater, setCbWater] = useState('400');
  const [cbElectric, setCbElectric] = useState('0');
  const [cbParking, setCbParking] = useState('200');
  const [cbPenalty, setCbPenalty] = useState('0');
  const [cbDue, setCbDue] = useState(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
  const [cbError, setCbError] = useState('');
  const [cbBusy, setCbBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const cbTotal = [cbBase, cbSinking, cbWater, cbElectric, cbParking, cbPenalty].reduce((a, v) => a + (Number(v) || 0), 0);

  const openCreate = async () => {
    setCbError('');
    setShowCreate(true);
    if (apartments.length === 0) {
      try {
        setApartments(await api.getApartments());
      } catch (e) {
        console.error(e);
      }
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCbBusy(true);
    setCbError('');
    try {
      const res = await api.createBill({
        apartmentId: cbApt,
        month: cbMonth,
        baseAmount: Number(cbBase) || 0,
        sinkingFund: Number(cbSinking) || 0,
        waterCharges: Number(cbWater) || 0,
        commonElectricity: Number(cbElectric) || 0,
        parkingCharges: Number(cbParking) || 0,
        penaltyCharges: Number(cbPenalty) || 0,
        dueDate: cbDue,
      });
      triggerSound('success');
      setShowCreate(false);
      setCreateMsg(
        'Created ' + res.created.length + ' bill' + (res.created.length === 1 ? '' : 's') + ' — residents can see them on their dashboards now.' +
          (res.skipped.length ? ' Skipped (already billed): ' + res.skipped.join(', ') + '.' : '')
      );
      setTimeout(() => setCreateMsg(''), 6000);
      loadBills();
    } catch (err: any) {
      setCbError(err?.message || 'Could not create bill.');
    } finally {
      setCbBusy(false);
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm('Delete this unpaid bill? The resident will no longer see it.')) return;
    try {
      await api.deleteBill(id);
      loadBills();
    } catch (e) {
      console.error('Delete bill failed', e);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border-amber-200/80 shadow-sm text-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <CreditCard className="w-5 h-5" />
            </div>
            Society Maintenance & Billing Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser.role === 'resident'
              ? `Maintenance ledger & invoices for Flat ${currentUser.apartmentId || 'A-402'}`
              : 'Society billing collection audit, outstanding dues & accounts'}
          </p>
        </div>

        {isAdmin && (
          <button onClick={openCreate} className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Create Bill
          </button>
        )}

        {/* Total Summary */}
        <div className="flex items-center gap-4 bg-amber-50/60 px-4 py-2.5 rounded-xl border border-amber-200/70">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-500">Total Dues Outstanding</div>
            <div className="text-lg font-bold text-amber-700">
              ₹{pendingBills.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
            </div>
          </div>
          <div className="w-px h-8 bg-amber-200" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-500">Paid Invoices</div>
            <div className="text-lg font-bold text-emerald-700">
              {paidBills.length} Invoices
            </div>
          </div>
        </div>
      </div>

      {createMsg && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium">{createMsg}</div>
      )}

      {/* Invoices List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Maintenance Invoices</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bills.map((b) => (
            <div
              key={b.id}
              className="glass-card rounded-3xl border-amber-200/80 shadow-sm p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    Flat {b.apartmentId}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    b.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{b.month} Maintenance Bill</h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">Invoice #{b.invoiceNumber}</div>
                </div>

                {/* Line Item Breakdown */}
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base Maintenance & Security</span>
                    <span className="font-mono font-medium">₹{b.baseAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sinking & Capital Reserve Fund</span>
                    <span className="font-mono font-medium">₹{b.sinkingFund}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Water Supply & Common Electric</span>
                    <span className="font-mono font-medium">₹{b.waterCharges + b.commonElectricity}</span>
                  </div>
                  <div className="pt-2 border-t border-amber-100 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Amount Payable</span>
                    <span className="text-amber-700 font-mono">₹{b.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="pt-3 border-t border-amber-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {b.status === 'Paid' ? `Paid on ${b.paidDate}` : `Due by ${b.dueDate}`}
                </span>

                {b.status === 'Pending' && isAdmin ? (
                  <button
                    onClick={() => handleDeleteBill(b.id)}
                    className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                ) : b.status === 'Pending' ? (
                  <button
                    onClick={() => {
                      setSelectedBillForPay(b);
                      setPaidSuccess(false);
                    }}
                    className="px-4 py-2 btn-gold font-semibold rounded-xl transition-all active:scale-95"
                  >
                    Pay ₹{b.totalAmount} Now
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedBillReceipt(b)}
                    className="px-3.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" /> View Receipt
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <form onSubmit={submitCreate} className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 space-y-3 text-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100">
              <h3 className="text-base font-black text-slate-900">Create Maintenance Bill</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill for:</label>
                <select value={cbApt} onChange={e => setCbApt(e.target.value)} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500">
                  <option value="ALL">All flats</option>
                  {apartments.filter(a => a.occupantType !== 'vacant').map(a => (
                    <option key={a.id} value={a.id}>Flat {a.id} — {a.ownerName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing month:</label>
                <input required value={cbMonth} onChange={e => setCbMonth(e.target.value)} placeholder="September 2026" className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                ['Base maintenance & security', cbBase, setCbBase],
                ['Sinking / capital fund', cbSinking, setCbSinking],
                ['Water charges', cbWater, setCbWater],
                ['Common electricity', cbElectric, setCbElectric],
                ['Parking charges', cbParking, setCbParking],
                ['Penalty / late fee', cbPenalty, setCbPenalty],
              ] as [string, string, (v: string) => void][]).map(([label, val, set]) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{label} (₹):</label>
                  <input type="number" min="0" value={val} onChange={e => set(e.target.value)} className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500" />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Due date:</label>
              <input type="date" required value={cbDue} onChange={e => setCbDue(e.target.value)} className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-amber-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-slate-900">
              <span>Total per flat</span>
              <span className="text-amber-700 font-mono">₹{cbTotal.toLocaleString('en-IN')}</span>
            </div>

            {cbError && <div className="text-[11px] text-rose-700 font-semibold">{cbError}</div>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={cbBusy} className="flex-1 py-2.5 btn-gold disabled:opacity-50 text-xs font-bold rounded-xl">
                {cbBusy ? 'Creating…' : cbApt === 'ALL' ? 'Create for All Flats' : 'Create Bill'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Gateway Modal */}
      {selectedBillForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {paidSuccess ? 'Payment Successful!' : 'Society Maintenance Payment'}
                </h3>
                <p className="text-xs text-slate-500">Nivara Heights Residents Association</p>
              </div>
              <button onClick={() => setSelectedBillForPay(null)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
            </div>

            {paidSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">₹{selectedBillForPay.totalAmount} Paid</h4>
                  <p className="text-xs text-slate-500 mt-1">
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
                    className="flex-1 py-2.5 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs rounded-xl text-xs font-semibold"
                  >
                    View Official Receipt
                  </button>
                  <button
                    onClick={() => setSelectedBillForPay(null)}
                    className="flex-1 py-2.5 btn-gold rounded-xl text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-500">Invoice Amount</div>
                    <div className="font-bold text-slate-900 text-base">₹{selectedBillForPay.totalAmount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">Flat Number</div>
                    <div className="font-semibold text-slate-800">{selectedBillForPay.apartmentId}</div>
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
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                          : 'bg-white text-slate-500 border-amber-200 hover:text-slate-900'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Method Content */}
                {payMethod === 'UPI' && (
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 text-center space-y-3">
                    <div className="bg-white p-3 rounded-xl inline-block shadow-sm">
                      <QRCodeSVG
                        value={`upi://pay?pa=society.nivara@hdfcbank&pn=NivaraHeights&am=${selectedBillForPay.totalAmount}&cu=INR&tn=${selectedBillForPay.invoiceNumber}`}
                        size={110}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                    </p>
                    <div className="text-[11px] font-mono text-amber-700 font-semibold">
                      UPI ID: society.nivara@hdfcbank
                    </div>
                  </div>
                )}

                {payMethod === 'Card' && (
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Card Number (4000 1234 5678 9010)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="MM / YY"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-center font-mono focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                      />
                      <input
                        type="password"
                        placeholder="CVV"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-center font-mono focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                      />
                    </div>
                  </div>
                )}

                {payMethod === 'NetBanking' && (
                  <div className="space-y-2 text-xs">
                    <select className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white">
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
                  className="w-full py-3 btn-gold disabled:opacity-50 font-bold text-xs rounded-xl transition-all active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <span className="text-xs font-semibold uppercase text-slate-500">Official Society Receipt</span>
              <button onClick={() => setSelectedBillReceipt(null)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
            </div>

            {/* Printable Receipt Paper */}
            <div className="p-6 bg-amber-50/70 rounded-2xl border border-amber-300 space-y-4 text-xs">
              <div className="text-center border-b border-amber-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">NIVARA HEIGHTS CO-OP HOUSING SOCIETY</h3>
                <p className="text-[11px] text-slate-500">Reg No: MAH/PUN/RHS-8924 • Sector 14, Pune 411045</p>
                <div className="text-amber-800 font-bold mt-1 text-sm tracking-wider">MAINTENANCE RECEIPT</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Receipt No: <strong className="font-mono text-slate-900">{selectedBillReceipt.invoiceNumber}</strong></div>
                <div className="text-right">Flat No: <strong className="text-slate-900">{selectedBillReceipt.apartmentId}</strong></div>
                <div>Billing Period: <strong className="text-slate-900">{selectedBillReceipt.month}</strong></div>
                <div className="text-right">Payment Date: <strong className="text-slate-900">{selectedBillReceipt.paidDate || 'Paid'}</strong></div>
              </div>

              <div className="divide-y divide-amber-100 border-t border-b border-amber-100 py-2 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>General Maintenance</span>
                  <span className="text-slate-800 font-mono">₹{selectedBillReceipt.baseAmount}</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Sinking & Reserve Fund</span>
                  <span className="text-slate-800 font-mono">₹{selectedBillReceipt.sinkingFund}</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Utilities (Water & Common Light)</span>
                  <span className="text-slate-800 font-mono">₹{selectedBillReceipt.waterCharges + selectedBillReceipt.commonElectricity}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-2 text-sm">
                  <span>Total Amount Paid</span>
                  <span className="text-amber-700 font-mono">₹{selectedBillReceipt.totalAmount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Payment Mode: {selectedBillReceipt.paymentMode || 'UPI Digital'}</span>
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Authenticated & Reconciled
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.print?.();
                }}
                className="flex-1 py-2.5 bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedBillReceipt(null)}
                className="flex-1 py-2.5 btn-gold rounded-xl text-xs font-semibold"
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
