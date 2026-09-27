import { Router, Request, Response } from 'express';
import { db } from './db';
import { RealtimeEvent } from '../src/types';

type Broadcast = (event: RealtimeEvent) => void;

export function releaseSlot(slot: (typeof db.parkingSlots)[number]) {
  slot.status = 'Free';
  slot.vehicleNumber = undefined;
  slot.occupantName = undefined;
  slot.apartmentId = undefined;
  slot.visitorId = undefined;
  slot.since = undefined;
  slot.allowedMinutes = undefined;
  slot.expiresAt = undefined;
}

function passCodeFor(aptId: string): string {
  let h = 0;
  for (const ch of aptId) h = (h * 31 + ch.charCodeAt(0) * 7919) % 10000;
  return `NVR-${aptId.replace('-', '')}-${String(h).padStart(4, '0')}`;
}

function buildPasses() {
  return db.apartments
    .filter(a => a.occupantType !== 'vacant')
    .map(a => {
      const people: { name: string; relation: string }[] = [
        {
          name: a.occupantType === 'tenant' && a.tenantName ? a.tenantName : a.ownerName,
          relation: a.occupantType === 'tenant' ? 'Tenant' : 'Owner',
        },
        ...a.familyMembers.map(f => ({ name: f.name, relation: f.relation as string })),
      ];
      db.users
        .filter(u => u.role === 'resident' && u.apartmentId === a.id)
        .forEach(u => {
          if (!people.some(p => p.name.toLowerCase() === u.name.toLowerCase())) {
            people.push({ name: u.name, relation: u.residentType === 'tenant' ? 'Tenant' : 'Owner' });
          }
        });

      const passId = `PRP-${a.id}`;
      const holders = people.map(p => {
        const last = db.residentEntries.find(
          e => e.passId === passId && e.holderName.toLowerCase() === p.name.toLowerCase()
        );
        return {
          name: p.name,
          relation: p.relation,
          status: last?.direction === 'IN' ? ('Inside' as const) : ('Outside' as const),
          lastMovementAt: last?.timestamp,
        };
      });
      return {
        passId,
        code: passCodeFor(a.id),
        tier: 'Premium' as const,
        apartmentId: a.id,
        validUntil: '2027-03-31',
        holders,
        vehicles: a.vehicles.map(v => v.registrationNumber),
      };
    });
}

export function createParkingAndPassRouter(broadcast: Broadcast) {
  const router = Router();
  const now = () => new Date().toISOString();

  // ---------------- LIVE PARKING ----------------
  router.get('/parking', (_req: Request, res: Response) => {
    res.json(db.parkingSlots);
  });

  router.post('/parking/:id/assign', (req: Request, res: Response) => {
    const slot = db.parkingSlots.find(s => s.id === req.params.id);
    if (!slot) return res.status(404).json({ error: 'Parking slot not found' });
    if (slot.zone !== 'Guest') return res.status(400).json({ error: 'Only guest slots can be assigned to visitors.' });
    if (slot.status === 'Occupied') return res.status(409).json({ error: 'This slot is already occupied.' });

    const { vehicleNumber, occupantName, visitorId, minutes } = req.body;
    const mins = Math.min(Math.max(Number(minutes) || 60, 15), 480);

    let name = String(occupantName || '').trim();
    let apartmentId: string | undefined;
    if (visitorId) {
      const visitor = db.visitors.find(v => v.id === visitorId);
      if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
      if (visitor.status !== 'Inside') {
        return res.status(400).json({ error: 'Only visitors verified at the gate (Inside) can be given a parking slot.' });
      }
      if (db.parkingSlots.some(s => s.visitorId === visitor.id && s.status === 'Occupied')) {
        return res.status(409).json({ error: 'This visitor already has a parking slot.' });
      }
      name = visitor.name;
      apartmentId = visitor.apartmentId;
    }
    if (!name) return res.status(400).json({ error: 'Visitor name is required.' });
    if (!String(vehicleNumber || '').trim()) return res.status(400).json({ error: 'Vehicle number is required.' });

    const t = Date.now();
    slot.status = 'Occupied';
    slot.vehicleNumber = String(vehicleNumber).trim().toUpperCase();
    slot.occupantName = name;
    slot.apartmentId = apartmentId;
    slot.visitorId = visitorId;
    slot.since = new Date(t).toISOString();
    slot.allowedMinutes = mins;
    slot.expiresAt = new Date(t + mins * 60000).toISOString();

    broadcast({ type: 'PARKING_UPDATED', payload: slot, timestamp: now() });
    res.json({ success: true, slot });
  });

  router.post('/parking/:id/extend', (req: Request, res: Response) => {
    const slot = db.parkingSlots.find(s => s.id === req.params.id);
    if (!slot || slot.zone !== 'Guest' || slot.status !== 'Occupied') {
      return res.status(404).json({ error: 'No active guest parking on this slot.' });
    }
    const mins = Math.min(Math.max(Number(req.body.minutes) || 30, 15), 240);
    const base = Math.max(new Date(slot.expiresAt || Date.now()).getTime(), Date.now());
    slot.expiresAt = new Date(base + mins * 60000).toISOString();
    slot.allowedMinutes = (slot.allowedMinutes || 0) + mins;
    broadcast({ type: 'PARKING_UPDATED', payload: slot, timestamp: now() });
    res.json({ success: true, slot });
  });

  router.post('/parking/:id/release', (req: Request, res: Response) => {
    const slot = db.parkingSlots.find(s => s.id === req.params.id);
    if (!slot) return res.status(404).json({ error: 'Parking slot not found' });
    releaseSlot(slot);
    broadcast({ type: 'PARKING_UPDATED', payload: slot, timestamp: now() });
    res.json({ success: true, slot });
  });

  // ---------------- PREMIUM RESIDENCY PASS ----------------
  router.get('/resident-passes', (_req: Request, res: Response) => {
    res.json(buildPasses());
  });

  router.get('/resident-entries', (req: Request, res: Response) => {
    const { apartmentId } = req.query;
    const list = apartmentId
      ? db.residentEntries.filter(e => e.apartmentId.toLowerCase() === String(apartmentId).toLowerCase())
      : db.residentEntries;
    res.json(list);
  });

  router.post('/resident-passes/scan', (req: Request, res: Response) => {
    const { code, holderName, direction, vehicleNumber, loggedBy } = req.body;
    const pass = buildPasses().find(p => p.code.toLowerCase() === String(code || '').trim().toLowerCase());
    if (!pass) return res.status(404).json({ error: 'Invalid Premium Residency Pass code.' });

    const holder = pass.holders.find(h => h.name.toLowerCase() === String(holderName || '').trim().toLowerCase());
    if (!holder) return res.status(400).json({ error: 'Select who is entering/leaving with this pass.' });

    const dir: 'IN' | 'OUT' =
      direction === 'IN' || direction === 'OUT' ? direction : holder.status === 'Inside' ? 'OUT' : 'IN';
    if (dir === 'IN' && holder.status === 'Inside') return res.status(409).json({ error: `${holder.name} is already marked Inside.` });
    if (dir === 'OUT' && holder.status === 'Outside') return res.status(409).json({ error: `${holder.name} is already marked Outside.` });

    const entry = {
      id: `re-${Date.now()}`,
      passId: pass.passId,
      apartmentId: pass.apartmentId,
      holderName: holder.name,
      direction: dir,
      vehicleNumber: vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : undefined,
      timestamp: now(),
      loggedBy: loggedBy || 'Ramesh Bahadur (Gate 1)',
    };
    db.residentEntries.unshift(entry);

    broadcast({ type: 'RESIDENT_ENTRY', payload: entry, timestamp: entry.timestamp, targetApartmentId: pass.apartmentId });
    res.json({ success: true, entry });
  });

  return router;
}
