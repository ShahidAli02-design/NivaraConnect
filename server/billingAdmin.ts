import { Router, Request, Response } from 'express';
import { db } from './db';
import { MaintenanceBill, RealtimeEvent } from '../src/types';

type Broadcast = (event: RealtimeEvent) => void;

// Seed bills use billingMonth/baseMaintenance/paidAt while the UI reads month/baseAmount/paidDate.
export function normalizeBill(b: MaintenanceBill): MaintenanceBill {
  return {
    ...b,
    month: b.month ?? b.billingMonth,
    billingMonth: b.billingMonth ?? b.month,
    baseAmount: b.baseAmount ?? b.baseMaintenance ?? 0,
    baseMaintenance: b.baseMaintenance ?? b.baseAmount ?? 0,
    commonElectricity: b.commonElectricity ?? 0,
    invoiceNumber: b.invoiceNumber ?? b.receiptNumber ?? `INV-${b.id.slice(-6).toUpperCase()}`,
    paidDate: b.paidDate ?? (b.paidAt ? b.paidAt.slice(0, 10) : undefined),
  };
}

const num = (v: unknown) => Math.max(0, Number(v) || 0);

export function createBillingRouter(broadcast: Broadcast) {
  const router = Router();

  router.post('/billing', (req: Request, res: Response) => {
    const { apartmentId, month, baseAmount, sinkingFund, waterCharges, commonElectricity, parkingCharges, penaltyCharges, dueDate } = req.body;

    const monthLabel = String(month || '').trim();
    if (!monthLabel) return res.status(400).json({ error: 'Billing month is required (e.g. "September 2026").' });
    if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) return res.status(400).json({ error: 'A valid due date is required.' });

    const amounts = {
      baseAmount: num(baseAmount),
      sinkingFund: num(sinkingFund),
      waterCharges: num(waterCharges),
      commonElectricity: num(commonElectricity),
      parkingCharges: num(parkingCharges),
      penaltyCharges: num(penaltyCharges),
    };
    const total = Object.values(amounts).reduce((a, b) => a + b, 0);
    if (total <= 0) return res.status(400).json({ error: 'Bill total must be greater than zero.' });

    const targets =
      apartmentId === 'ALL'
        ? db.apartments.filter(a => a.occupantType !== 'vacant')
        : db.apartments.filter(a => a.id === apartmentId);
    if (targets.length === 0) return res.status(404).json({ error: 'Apartment not found.' });

    const created: MaintenanceBill[] = [];
    const skipped: string[] = [];

    targets.forEach((apt, i) => {
      const dup = db.bills.some(
        b => b.apartmentId === apt.id && (b.month ?? b.billingMonth)?.toLowerCase() === monthLabel.toLowerCase()
      );
      if (dup) {
        skipped.push(apt.id);
        return;
      }
      const bill: MaintenanceBill = {
        id: `bill-${Date.now()}-${i}`,
        apartmentId: apt.id,
        residentName: apt.occupantType === 'tenant' && apt.tenantName ? apt.tenantName : apt.ownerName,
        billingMonth: monthLabel,
        month: monthLabel,
        baseMaintenance: amounts.baseAmount,
        baseAmount: amounts.baseAmount,
        sinkingFund: amounts.sinkingFund,
        waterCharges: amounts.waterCharges,
        commonElectricity: amounts.commonElectricity,
        parkingCharges: amounts.parkingCharges,
        penaltyCharges: amounts.penaltyCharges,
        totalAmount: total,
        dueDate: new Date(dueDate).toISOString().slice(0, 10),
        status: 'Pending',
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      db.bills.unshift(bill);
      apt.duesBalance += total;
      created.push(bill);
      broadcast({ type: 'BILL_CREATED', payload: bill, timestamp: new Date().toISOString(), targetApartmentId: apt.id });
    });

    if (created.length === 0) {
      return res.status(409).json({ error: `A ${monthLabel} bill already exists for ${apartmentId === 'ALL' ? 'all selected flats' : 'this flat'}.` });
    }
    res.json({ success: true, created: created.map(normalizeBill), skipped });
  });

  router.delete('/billing/:id', (req: Request, res: Response) => {
    const idx = db.bills.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Bill not found.' });
    const bill = db.bills[idx];
    if (bill.status === 'Paid') return res.status(409).json({ error: 'A paid bill cannot be deleted.' });
    const apt = db.apartments.find(a => a.id === bill.apartmentId);
    if (apt) apt.duesBalance = Math.max(0, apt.duesBalance - bill.totalAmount);
    db.bills.splice(idx, 1);
    broadcast({ type: 'BILL_UPDATED', payload: bill, timestamp: new Date().toISOString(), targetApartmentId: bill.apartmentId });
    res.json({ success: true });
  });

  return router;
}
