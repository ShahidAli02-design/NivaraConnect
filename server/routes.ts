import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { isValidAadhaar, AADHAAR_ERROR } from '../src/utils/aadhaar';
import { generateAvatar } from '../src/utils/avatar';
import { createParkingAndPassRouter, releaseSlot } from './parkingAndPasses';
import { createBillingRouter, normalizeBill } from './billingAdmin';
import { sendAccountApprovedEmail } from './mailer';
import { askSocietyAiAssistant, triageComplaintAi, draftNoticeAi } from './gemini';
import { RealtimeEvent, Visitor, Complaint, SOSAlert, Notice, MaintenanceBill, AmenityBooking, ForumPost, User, SignupRequest, FundTransaction, SocietyStaff } from '../src/types';

// Never leak password hashes to the client
function sanitizeUser(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function sanitizeSignupRequest(req: SignupRequest) {
  const { passwordHash, ...safe } = req;
  return safe;
}

// Loose name comparison: case-insensitive, ignores titles/punctuation/extra spaces
// so "Dr. Alok Mehta" and "alok   mehta" are treated the same, but genuinely
// different names are still caught.
function normalizeName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof|shri|smt)\.?\b/g, '')
    .replace(/[-']/g, ' ') // "Anne-Marie" / "O'Brien" shouldn't fail to match "Anne Marie" / "O Brien"
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na.length > 0 && na === nb;
}

// Creates an empty Apartment record for a newly approved resident so
// "Add Family Member" / "Add Vehicle" have something to write to — without
// this, api.getApartment() 404s and those forms silently do nothing.
function ensureApartmentExists(opts: {
  apartmentId: string;
  name: string;
  phone: string;
  email: string;
  residentType?: 'owner' | 'tenant';
  wing?: string;
  flatNumber?: string;
}) {
  const existing = db.apartments.find(a => a.id.toLowerCase() === opts.apartmentId.toLowerCase());
  if (existing) return existing;

  const wing = (opts.wing || opts.apartmentId.split('-')[0] || 'A').toUpperCase();
  const flatNumber = opts.flatNumber || opts.apartmentId.split('-')[1] || '';
  const floor = flatNumber && !Number.isNaN(Number(flatNumber)) ? Math.max(1, Math.floor(Number(flatNumber) / 100)) : 1;
  const wingIndex = Math.max(1, wing.charCodeAt(0) - 64);
  const isTenant = opts.residentType === 'tenant';

  const apt = {
    id: opts.apartmentId,
    wing,
    flatNumber,
    floor,
    ownerName: opts.name,
    ownerPhone: opts.phone,
    ownerEmail: opts.email,
    occupantType: isTenant ? ('tenant' as const) : ('owner' as const),
    tenantName: isTenant ? opts.name : undefined,
    tenantPhone: isTenant ? opts.phone : undefined,
    familyMembers: [],
    vehicles: [],
    intercomNumber: `${wingIndex}${flatNumber}`,
    duesBalance: 0,
  };
  db.apartments.push(apt);
  db.scheduleSave();
  return apt;
}

// SSE Clients Registry
type SseClient = {
  id: string;
  res: Response;
  apartmentId?: string;
};

const sseClients: SseClient[] = [];

export function broadcastRealtimeEvent(event: RealtimeEvent) {
  const data = JSON.stringify(event);
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {
      console.error('Failed to send SSE to client', client.id, e);
    }
  });
}

export const apiRouter = Router();
apiRouter.use(createParkingAndPassRouter(broadcastRealtimeEvent));
apiRouter.use(createBillingRouter(broadcastRealtimeEvent));

// ----------------------------------------------------
// REAL-TIME SSE STREAM
// ----------------------------------------------------
apiRouter.get('/realtime/stream', (req: Request, res: Response) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const apartmentId = req.query.apartmentId as string | undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client: SseClient = { id: clientId, res, apartmentId };
  sseClients.push(client);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString(), clientId })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});

// ----------------------------------------------------
// AUTH & USERS
// ----------------------------------------------------
apiRouter.get('/auth/users', (req: Request, res: Response) => {
  res.json(db.users.map(sanitizeUser));
});

// Secretary-only (enforced client-side, like the rest of this app's
// role gating — there's no session, auth is a plain email+password check).
// Blocks deleting the last remaining Secretary account so the society can
// never be left with zero admin access.
apiRouter.delete('/admin/users/:id', (req: Request, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  if (user.role === 'admin' && db.users.filter(u => u.role === 'admin').length <= 1) {
    return res.status(409).json({ error: 'Cannot delete the only remaining Secretary account.' });
  }

  db.users = db.users.filter(u => u.id !== req.params.id);
  db.scheduleSave();

  broadcastRealtimeEvent({
    type: 'USER_DELETED',
    payload: { id: user.id, name: user.name, role: user.role },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());

  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  res.json({ success: true, user: sanitizeUser(user) });
});

// Registration NEVER creates a live account directly — it files a request that
// only becomes a real, login-able user once the Secretary approves it.
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, password, phone, role, apartmentId, residentType } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
  }

  const emailLower = String(email).toLowerCase();
  const alreadyUser = db.users.some(u => u.email.toLowerCase() === emailLower);
  const alreadyPending = db.signupRequests.some(r => r.email.toLowerCase() === emailLower && r.status === 'pending');
  if (alreadyUser || alreadyPending) {
    return res.status(409).json({ success: false, error: 'An account with this email already exists or is awaiting approval.' });
  }

  const wing = (apartmentId || '').split('-')[0] || undefined;
  const flatNumber = (apartmentId || '').split('-')[1] || undefined;

  const newRequest: SignupRequest = {
    id: `sig-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    passwordHash: bcrypt.hashSync(password, 10),
    role: role || 'resident',
    apartmentId: apartmentId || undefined,
    wing,
    flatNumber,
    residentType: residentType || undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.signupRequests.unshift(newRequest);

  broadcastRealtimeEvent({
    type: 'NEW_SIGNUP_REQUEST',
    payload: sanitizeSignupRequest(newRequest),
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    pending: true,
    message: 'Your account request has been sent to the Society Secretary for approval.',
  });
});

// No email/SMS service is configured for this app, so "forgot password" can't
// send a reset link/OTP. Instead it verifies identity with the phone number
// the account was registered with (last 10 digits, ignoring +91/spaces/etc.)
// before allowing a new password to be set directly.
function last10Digits(phone: string): string {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { email, phone, newPassword } = req.body;

  if (!email || !phone || !newPassword) {
    return res.status(400).json({ success: false, error: 'Email, phone number and new password are required.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) {
    return res.status(404).json({ success: false, error: 'No account found with this email address.' });
  }

  const storedDigits = last10Digits(user.phone);
  const enteredDigits = last10Digits(phone);
  if (!storedDigits || enteredDigits.length !== 10 || storedDigits !== enteredDigits) {
    return res.status(401).json({ success: false, error: 'The phone number does not match our records for this account.' });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  db.scheduleSave();

  res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
});

// ----------------------------------------------------
// ACCOUNT APPROVAL (SECRETARY / ADMIN)
// ----------------------------------------------------
apiRouter.get('/admin/signup-requests', (req: Request, res: Response) => {
  const { status } = req.query;
  let list = db.signupRequests;
  if (status) {
    list = list.filter(r => r.status === status);
  }
  res.json(list.map(sanitizeSignupRequest));
});

apiRouter.post('/admin/signup-requests/:id/approve', (req: Request, res: Response) => {
  const { reviewedBy } = req.body;
  const signupRequest = db.signupRequests.find(r => r.id === req.params.id);
  if (!signupRequest) return res.status(404).json({ error: 'Signup request not found' });
  if (signupRequest.status !== 'pending') {
    return res.status(409).json({ error: `Request already ${signupRequest.status}` });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name: signupRequest.name,
    email: signupRequest.email,
    phone: signupRequest.phone,
    role: signupRequest.role,
    apartmentId: signupRequest.apartmentId,
    wing: signupRequest.wing,
    flatNumber: signupRequest.flatNumber,
    residentType: signupRequest.residentType,
    passwordHash: signupRequest.passwordHash,
    avatarUrl: generateAvatar(signupRequest.name),
    familyMembersCount: 0,
    vehiclesCount: 0,
  };
  db.users.push(newUser);

  if (signupRequest.role === 'resident' && signupRequest.apartmentId) {
    ensureApartmentExists({
      apartmentId: signupRequest.apartmentId,
      name: signupRequest.name,
      phone: signupRequest.phone,
      email: signupRequest.email,
      residentType: signupRequest.residentType,
      wing: signupRequest.wing,
      flatNumber: signupRequest.flatNumber,
    });
  }

  signupRequest.status = 'approved';
  signupRequest.reviewedAt = new Date().toISOString();
  signupRequest.reviewedBy = reviewedBy || 'Society Secretary';

  broadcastRealtimeEvent({
    type: 'SIGNUP_REQUEST_UPDATED',
    payload: sanitizeSignupRequest(signupRequest),
    timestamp: new Date().toISOString(),
  });

  // Fire-and-forget — never make the Secretary wait on an email provider,
  // and a failed send should never undo the approval that already happened.
  sendAccountApprovedEmail(newUser.email, newUser.name, newUser.role).catch(() => {});

  res.json({ success: true, user: sanitizeUser(newUser), request: sanitizeSignupRequest(signupRequest) });
});

apiRouter.post('/admin/signup-requests/:id/reject', (req: Request, res: Response) => {
  const { reviewedBy, reason } = req.body;
  const signupRequest = db.signupRequests.find(r => r.id === req.params.id);
  if (!signupRequest) return res.status(404).json({ error: 'Signup request not found' });
  if (signupRequest.status !== 'pending') {
    return res.status(409).json({ error: `Request already ${signupRequest.status}` });
  }

  signupRequest.status = 'rejected';
  signupRequest.reviewedAt = new Date().toISOString();
  signupRequest.reviewedBy = reviewedBy || 'Society Secretary';
  signupRequest.rejectionReason = reason || 'Not approved by Society Secretary.';

  broadcastRealtimeEvent({
    type: 'SIGNUP_REQUEST_UPDATED',
    payload: sanitizeSignupRequest(signupRequest),
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, request: sanitizeSignupRequest(signupRequest) });
});

// ----------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------
apiRouter.get('/stats', (req: Request, res: Response) => {
  res.json(db.getStats());
});

// ----------------------------------------------------
// APARTMENTS & RESIDENTS
// ----------------------------------------------------
apiRouter.get('/apartments', (req: Request, res: Response) => {
  res.json(db.apartments);
});

apiRouter.get('/apartments/:id', (req: Request, res: Response) => {
  let apt = db.apartments.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (!apt) {
    // Self-heal: an already-approved resident whose flat record never got
    // created (e.g. approved before this fix shipped) gets one on first load.
    const resident = db.users.find(u => u.role === 'resident' && u.apartmentId?.toLowerCase() === req.params.id.toLowerCase());
    if (resident) {
      apt = ensureApartmentExists({
        apartmentId: resident.apartmentId!,
        name: resident.name,
        phone: resident.phone,
        email: resident.email,
        residentType: resident.residentType,
        wing: resident.wing,
        flatNumber: resident.flatNumber,
      });
    }
  }
  if (!apt) {
    return res.status(404).json({ error: 'Apartment not found' });
  }
  res.json(apt);
});

apiRouter.post('/apartments/:id/family', (req: Request, res: Response) => {
  const apt = db.apartments.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (!apt) return res.status(404).json({ error: 'Apartment not found' });

  const newMember = {
    id: `fm-${Date.now()}`,
    name: req.body.name,
    relation: req.body.relation,
    phone: req.body.phone,
    age: req.body.age ? Number(req.body.age) : undefined,
  };
  apt.familyMembers.push(newMember);
  res.json({ success: true, familyMembers: apt.familyMembers });
});

apiRouter.post('/apartments/:id/vehicles', (req: Request, res: Response) => {
  const apt = db.apartments.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (!apt) return res.status(404).json({ error: 'Apartment not found' });

  const newVehicle = {
    id: `vh-${Date.now()}`,
    type: req.body.type,
    registrationNumber: req.body.registrationNumber,
    model: req.body.model,
    parkingSlot: req.body.parkingSlot || `P-${apt.id}`,
  };
  apt.vehicles.push(newVehicle);
  res.json({ success: true, vehicles: apt.vehicles });
});

// ----------------------------------------------------
// VISITOR MANAGEMENT
// ----------------------------------------------------
apiRouter.get('/visitors', (req: Request, res: Response) => {
  const { apartmentId, status } = req.query;
  let list = db.visitors;
  if (apartmentId) {
    list = list.filter(v => v.apartmentId.toLowerCase() === (apartmentId as string).toLowerCase());
  }
  if (status) {
    list = list.filter(v => v.status === status);
  }
  res.json(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// Pre-approve guest by resident
apiRouter.post('/visitors/pre-approve', (req: Request, res: Response) => {
  const { name, phone, visitorType, purpose, apartmentId, residentName, expectedDate, accompanyingGuests } = req.body;
  const passCode = Math.floor(100000 + Math.random() * 900000).toString();
  const newVisitor: Visitor = {
    id: `vis-${Date.now()}`,
    name,
    phone: phone || '',
    visitorType: visitorType || 'Guest',
    purpose: purpose || 'Visit',
    apartmentId,
    residentName,
    passCode,
    status: 'Pre-Approved',
    expectedDate: expectedDate || new Date().toISOString().split('T')[0],
    accompanyingGuests: accompanyingGuests ? Number(accompanyingGuests) : 0,
    createdAt: new Date().toISOString(),
  };

  db.visitors.unshift(newVisitor);

  broadcastRealtimeEvent({
    type: 'VISITOR_STATUS_CHANGE',
    payload: newVisitor,
    timestamp: new Date().toISOString(),
    targetApartmentId: apartmentId,
  });

  res.json({ success: true, visitor: newVisitor });
});

// Log visitor entry by Security Guard at the gate.
// NOTE: This never auto-grants entry, even for an already pre-approved guest —
// every arrival lands in 'Waiting Approval' and can only become 'Inside' via
// POST /visitors/:id/verify-entry, which requires the guard to capture a valid
// Aadhaar number first. This closes the old "pre-approved = instant entry" gap.
apiRouter.post('/visitors/entry', (req: Request, res: Response) => {
  const { name, phone, visitorType, purpose, apartmentId, residentName, vehicleNumber, deliveryCompany, passCode } = req.body;

  // Check if there is an existing pre-approved visitor with this passcode or phone
  let existing = db.visitors.find(v => (v.passCode === passCode || (v.phone === phone && v.status === 'Pre-Approved')) && v.apartmentId === apartmentId);

  if (existing) {
    existing.status = 'Waiting Approval';
    existing.vehicleNumber = vehicleNumber || existing.vehicleNumber;
    existing.loggedByGuardName = 'Ramesh Bahadur (Gate 1)';

    broadcastRealtimeEvent({
      type: 'VISITOR_ARRIVAL',
      payload: existing,
      timestamp: new Date().toISOString(),
      targetApartmentId: apartmentId,
    });

    return res.json({ success: true, visitor: existing, message: 'Pre-approved guest arrived. Awaiting Aadhaar verification by the gate guard.' });
  }

  // Create new entry
  const code = passCode || Math.floor(100000 + Math.random() * 900000).toString();
  const newVisitor: Visitor = {
    id: `vis-${Date.now()}`,
    name,
    phone: phone || '',
    visitorType: visitorType || 'Guest',
    purpose: purpose || 'Visit',
    apartmentId,
    residentName: residentName || `Flat ${apartmentId}`,
    vehicleNumber,
    deliveryCompany,
    passCode: code,
    status: 'Waiting Approval', // Only becomes 'Inside' after guard's Aadhaar verification
    loggedByGuardName: 'Ramesh Bahadur (Gate 1)',
    createdAt: new Date().toISOString(),
  };

  db.visitors.unshift(newVisitor);

  // Broadcast so the resident is notified their guest has arrived (informational only)
  broadcastRealtimeEvent({
    type: 'VISITOR_ARRIVAL',
    payload: newVisitor,
    timestamp: new Date().toISOString(),
    targetApartmentId: apartmentId,
  });

  res.json({ success: true, visitor: newVisitor, message: 'Entry logged. Awaiting Aadhaar verification by the gate guard.' });
});

// Guard-only: verify the visitor's Aadhaar number and grant physical entry.
// This is the ONLY path that can move a visitor to 'Inside' — enforced here,
// not just in the UI, so no other route can silently auto-approve entry.
apiRouter.post('/visitors/:id/verify-entry', (req: Request, res: Response) => {
  const { aadhaarNumber, aadhaarName, verifiedByGuard } = req.body;
  const visitor = db.visitors.find(v => v.id === req.params.id);
  if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

  if (visitor.status === 'Denied') {
    return res.status(409).json({ error: 'This visitor was denied entry and cannot be verified.' });
  }
  if (visitor.status === 'Inside') {
    return res.status(409).json({ error: 'This visitor has already been granted entry.' });
  }

  if (!isValidAadhaar(aadhaarNumber)) {
    return res.status(400).json({ error: AADHAAR_ERROR });
  }

  if (!String(aadhaarName || '').trim()) {
    return res.status(400).json({ error: 'Enter the name exactly as printed on the Aadhaar card.' });
  }

  if (!namesMatch(aadhaarName, visitor.name)) {
    return res.status(400).json({
      error: `Name mismatch: the visitor was logged as "${visitor.name}" but the Aadhaar card reads "${aadhaarName}". Entry cannot be granted — confirm this is the correct person or correct the visitor name.`,
    });
  }

  // One Aadhaar can't be "inside" as two different visitors at once — catches
  // someone reusing a card/number to wave a second person through the gate.
  const cleanAadhaar = String(aadhaarNumber).trim();
  const reused = db.visitors.find(v => v.id !== visitor.id && v.status === 'Inside' && v.aadhaarNumber === cleanAadhaar);
  if (reused) {
    return res.status(409).json({
      error: `This Aadhaar number is already checked in as "${reused.name}" (Flat ${reused.apartmentId}). It can't be used for a second visitor until they check out.`,
    });
  }

  visitor.aadhaarNumber = cleanAadhaar;
  visitor.aadhaarName = String(aadhaarName).trim();
  visitor.aadhaarVerifiedAt = new Date().toISOString();
  visitor.status = 'Inside';
  visitor.entryTime = new Date().toISOString();
  visitor.loggedByGuardName = verifiedByGuard || visitor.loggedByGuardName || 'Ramesh Bahadur (Gate 1)';

  broadcastRealtimeEvent({
    type: 'VISITOR_STATUS_CHANGE',
    payload: visitor,
    timestamp: new Date().toISOString(),
    targetApartmentId: visitor.apartmentId,
  });

  res.json({ success: true, visitor });
});

// Resident or Guard updates visitor status (Approve/acknowledge, Deny, Checkout).
// 'Inside' is intentionally NOT allowed here — it must go through
// POST /visitors/:id/verify-entry so Aadhaar verification can't be bypassed.
apiRouter.patch('/visitors/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const visitor = db.visitors.find(v => v.id === req.params.id);
  if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

  if (status === 'Inside') {
    return res.status(400).json({ error: 'Entry can only be granted via Aadhaar verification at the gate (verify-entry).' });
  }

  visitor.status = status;
  if (status === 'Checked Out') {
    visitor.exitTime = new Date().toISOString();
    db.parkingSlots
      .filter(s => s.visitorId === visitor.id && s.status === 'Occupied')
      .forEach(s => releaseSlot(s));
  }

  broadcastRealtimeEvent({
    type: 'VISITOR_STATUS_CHANGE',
    payload: visitor,
    timestamp: new Date().toISOString(),
    targetApartmentId: visitor.apartmentId,
  });

  res.json({ success: true, visitor });
});

// ----------------------------------------------------
// COMPLAINTS / SERVICE REQUESTS
// ----------------------------------------------------
apiRouter.get('/complaints', (req: Request, res: Response) => {
  const { apartmentId, status, category } = req.query;
  let list = db.complaints;
  if (apartmentId) {
    list = list.filter(c => c.apartmentId.toLowerCase() === (apartmentId as string).toLowerCase());
  }
  if (status) {
    list = list.filter(c => c.status === status);
  }
  if (category) {
    list = list.filter(c => c.category === category);
  }
  res.json(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

apiRouter.post('/complaints', async (req: Request, res: Response) => {
  try {
    const { title, description, category, priority, apartmentId, residentName, residentPhone, imageUrl } = req.body;

    // Run AI Triage safely
    let aiSummary = {
      estimatedTime: '2 - 4 hours',
      suggestedAction: `Assigned to ${category || 'General'} maintenance technician.`,
      urgencyLevel: priority || 'Medium',
    };

    try {
      aiSummary = await triageComplaintAi(title || 'Complaint', description || '', category || 'Other');
    } catch (aiErr) {
      console.warn('AI Triage failed, continuing with fallback:', aiErr);
    }

    const newComplaint: Complaint = {
      id: `cmp-${Date.now()}`,
      title: title || 'Maintenance Ticket',
      description: description || '',
      category: category || 'Other',
      priority: priority || (aiSummary.urgencyLevel as any) || 'Medium',
      status: 'Open',
      apartmentId: apartmentId || 'A-402',
      residentName: residentName || 'Resident',
      residentPhone: residentPhone || '+91 98765 43210',
      imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiTriageSummary: aiSummary,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          authorName: residentName || 'Resident',
          authorRole: 'resident',
          action: 'Complaint Registered',
          comment: description || 'Complaint registered into society log.',
        },
      ],
    };

    db.complaints.unshift(newComplaint);

    broadcastRealtimeEvent({
      type: 'COMPLAINT_CREATED',
      payload: newComplaint,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, complaint: newComplaint });
  } catch (error: any) {
    console.error('Failed to create complaint:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to create complaint' });
  }
});

apiRouter.patch('/complaints/:id', (req: Request, res: Response) => {
  const complaint = db.complaints.find(c => c.id === req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const { status, assignedStaff, assignedStaffPhone, comment, updatedBy, authorRole } = req.body;

  if (status) {
    complaint.status = status;
    if (status === 'Resolved' || status === 'Closed') {
      complaint.resolvedAt = new Date().toISOString();
    }
  }
  if (assignedStaff) complaint.assignedStaff = assignedStaff;
  if (assignedStaffPhone) complaint.assignedStaffPhone = assignedStaffPhone;

  complaint.updatedAt = new Date().toISOString();

  if (comment || status) {
    complaint.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorName: updatedBy || 'Society Administrator',
      authorRole: authorRole || 'admin',
      action: status ? `Status updated to ${status}` : 'Update added',
      comment: comment || undefined,
    });
  }

  broadcastRealtimeEvent({
    type: 'COMPLAINT_UPDATED',
    payload: complaint,
    timestamp: new Date().toISOString(),
    targetApartmentId: complaint.apartmentId,
  });

  res.json({ success: true, complaint });
});

// ----------------------------------------------------
// SOS & EMERGENCY SYSTEM
// ----------------------------------------------------
apiRouter.get('/sos', (req: Request, res: Response) => {
  res.json(db.sosAlerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()));
});

apiRouter.post('/sos', (req: Request, res: Response) => {
  const { category, apartmentId, triggeredByName, triggeredByPhone, notes } = req.body;
  const newAlert: SOSAlert = {
    id: `sos-${Date.now()}`,
    category: category || 'Medical Emergency',
    apartmentId: apartmentId || 'A-402',
    triggeredByName: triggeredByName || 'Resident',
    triggeredByPhone: triggeredByPhone || '+91 98765 43210',
    triggeredAt: new Date().toISOString(),
    status: 'ACTIVE',
    notes: notes || 'Emergency assistance requested immediately.',
  };

  db.sosAlerts.unshift(newAlert);

  // Broadcast HIGH PRIORITY SIREN EVENT to all guards, admins, and residents!
  broadcastRealtimeEvent({
    type: 'SOS_TRIGGERED',
    payload: newAlert,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, alert: newAlert });
});

apiRouter.patch('/sos/:id/respond', (req: Request, res: Response) => {
  const alert = db.sosAlerts.find(s => s.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'SOS Alert not found' });

  const { status, respondedByGuard, resolutionRemarks } = req.body;
  if (status) alert.status = status;
  if (respondedByGuard) {
    alert.respondedByGuard = respondedByGuard;
    alert.responseTimestamp = new Date().toISOString();
  }
  if (status === 'RESOLVED') {
    alert.resolvedTimestamp = new Date().toISOString();
    alert.resolutionRemarks = resolutionRemarks || 'Security guard dispatched and attended the site. Situation brought under control.';
  }

  broadcastRealtimeEvent({
    type: 'SOS_UPDATED',
    payload: alert,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, alert });
});

// ----------------------------------------------------
// NOTICES & ANNOUNCEMENTS
// ----------------------------------------------------
apiRouter.get('/notices', (req: Request, res: Response) => {
  res.json(db.notices.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
});

apiRouter.post('/notices', (req: Request, res: Response) => {
  const { title, content, category, priority, publishedBy, publisherRole, pollQuestion, pollOptions } = req.body;

  const newNotice: Notice = {
    id: `not-${Date.now()}`,
    title,
    content,
    category: category || 'General',
    priority: priority || 'Normal',
    publishedBy: publishedBy || 'Society Management',
    publisherRole: publisherRole || 'admin',
    publishedAt: new Date().toISOString(),
    acknowledgementsCount: 1,
    acknowledgedUserIds: [],
  };

  if (pollQuestion && Array.isArray(pollOptions) && pollOptions.length > 0) {
    newNotice.poll = {
      question: pollQuestion,
      options: pollOptions.map((opt: string, idx: number) => ({
        id: `opt-${idx + 1}`,
        text: opt,
        votes: 0,
        votedUserIds: [],
      })),
      closed: false,
    };
  }

  db.notices.unshift(newNotice);

  broadcastRealtimeEvent({
    type: 'NEW_NOTICE',
    payload: newNotice,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, notice: newNotice });
});

apiRouter.post('/notices/:id/poll-vote', (req: Request, res: Response) => {
  const { optionId, userId } = req.body;
  const notice = db.notices.find(n => n.id === req.params.id);
  if (!notice || !notice.poll) return res.status(404).json({ error: 'Notice or poll not found' });

  // Remove existing vote by this user if any
  notice.poll.options.forEach(opt => {
    const idx = opt.votedUserIds.indexOf(userId);
    if (idx !== -1) {
      opt.votedUserIds.splice(idx, 1);
      opt.votes = Math.max(0, opt.votes - 1);
    }
  });

  const selectedOpt = notice.poll.options.find(o => o.id === optionId);
  if (selectedOpt) {
    selectedOpt.votedUserIds.push(userId);
    selectedOpt.votes += 1;
  }

  broadcastRealtimeEvent({
    type: 'NEW_POLL_VOTE',
    payload: notice,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, notice });
});

apiRouter.post('/notices/:id/acknowledge', (req: Request, res: Response) => {
  const { userId } = req.body;
  const notice = db.notices.find(n => n.id === req.params.id);
  if (!notice) return res.status(404).json({ error: 'Notice not found' });

  if (!notice.acknowledgedUserIds.includes(userId)) {
    notice.acknowledgedUserIds.push(userId);
    notice.acknowledgementsCount += 1;
  }

  res.json({ success: true, notice });
});

// ----------------------------------------------------
// MAINTENANCE & BILLING
// ----------------------------------------------------
apiRouter.get('/billing', (req: Request, res: Response) => {
  const { apartmentId } = req.query;
  let list = db.bills;
  if (apartmentId) {
    list = list.filter(b => b.apartmentId.toLowerCase() === (apartmentId as string).toLowerCase());
  }
  res.json(list.map(normalizeBill));
});

apiRouter.post('/billing/:id/pay', (req: Request, res: Response) => {
  const { paymentMethod } = req.body;
  const bill = db.bills.find(b => b.id === req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  bill.status = 'Paid';
  bill.paidAt = new Date().toISOString();
  bill.paymentMethod = paymentMethod || 'UPI';
  bill.transactionId = `TXN/NIV/${Date.now().toString().slice(-8)}`;
  bill.receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Update apartment dues balance
  const apt = db.apartments.find(a => a.id === bill.apartmentId);
  if (apt) {
    apt.duesBalance = Math.max(0, apt.duesBalance - bill.totalAmount);
  }

  broadcastRealtimeEvent({
    type: 'BILL_PAID',
    payload: bill,
    timestamp: new Date().toISOString(),
    targetApartmentId: bill.apartmentId,
  });

  res.json({ success: true, bill });
});

// ----------------------------------------------------
// AMENITY BOOKINGS
// ----------------------------------------------------
apiRouter.get('/amenities', (req: Request, res: Response) => {
  res.json(db.amenities);
});

apiRouter.get('/amenity-bookings', (req: Request, res: Response) => {
  res.json(db.amenityBookings);
});

apiRouter.post('/amenity-bookings', (req: Request, res: Response) => {
  const { amenityId, amenityName, apartmentId, residentName, date, slot, timeSlot, guestsCount, purpose, paymentAmount, amount } = req.body;
  const amenity = db.amenities.find(a => a.id === amenityId);
  const newBooking: AmenityBooking = {
    id: `bk-${Date.now()}`,
    amenityId,
    amenityName: amenityName || amenity?.name || 'Amenity',
    apartmentId,
    residentName,
    date,
    slot: slot || timeSlot,
    timeSlot: timeSlot || slot,
    guestsCount: guestsCount !== undefined ? Number(guestsCount) : undefined,
    purpose,
    // Every request waits for the Secretary — nothing is confirmed on submit.
    status: 'Pending Approval',
    paymentAmount: Number(paymentAmount ?? amount) || 0,
    createdAt: new Date().toISOString(),
  };

  db.amenityBookings.unshift(newBooking);

  broadcastRealtimeEvent({
    type: 'AMENITY_BOOKING_CREATED',
    payload: newBooking,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, booking: newBooking });
});

apiRouter.post('/amenity-bookings/:id/approve', (req: Request, res: Response) => {
  const booking = db.amenityBookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'Pending Approval') {
    return res.status(409).json({ error: `Booking already ${booking.status}` });
  }

  const clash = db.amenityBookings.find(b =>
    b.id !== booking.id &&
    b.status === 'Confirmed' &&
    b.amenityName === booking.amenityName &&
    b.date === booking.date &&
    (b.timeSlot || b.slot) === (booking.timeSlot || booking.slot)
  );
  if (clash) {
    return res.status(409).json({ error: `Slot already confirmed for Flat ${clash.apartmentId}. Reject this request or ask for another slot.` });
  }

  booking.status = 'Confirmed';
  booking.reviewedAt = new Date().toISOString();
  booking.reviewedBy = req.body?.reviewedBy || 'Society Secretary';

  broadcastRealtimeEvent({
    type: 'AMENITY_BOOKING_UPDATED',
    payload: booking,
    timestamp: new Date().toISOString(),
    targetApartmentId: booking.apartmentId,
  });

  res.json({ success: true, booking });
});

apiRouter.post('/amenity-bookings/:id/reject', (req: Request, res: Response) => {
  const booking = db.amenityBookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'Pending Approval') {
    return res.status(409).json({ error: `Booking already ${booking.status}` });
  }

  booking.status = 'Rejected';
  booking.reviewedAt = new Date().toISOString();
  booking.reviewedBy = req.body?.reviewedBy || 'Society Secretary';
  if (req.body?.reason) booking.rejectionReason = String(req.body.reason);

  broadcastRealtimeEvent({
    type: 'AMENITY_BOOKING_UPDATED',
    payload: booking,
    timestamp: new Date().toISOString(),
    targetApartmentId: booking.apartmentId,
  });

  res.json({ success: true, booking });
});

// ----------------------------------------------------
// COMMUNITY FORUM & CLASSIFIEDS
// ----------------------------------------------------
apiRouter.get('/forum', (req: Request, res: Response) => {
  res.json(db.forumPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

apiRouter.post('/forum', (req: Request, res: Response) => {
  const { title, content, category, apartmentId, authorName, authorRole } = req.body;
  const newPost: ForumPost = {
    id: `post-${Date.now()}`,
    apartmentId: apartmentId || 'A-402',
    authorName: authorName || 'Resident',
    authorRole: authorRole || 'Resident',
    category: category || 'General',
    title,
    content,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: [],
    comments: [],
  };

  db.forumPosts.unshift(newPost);
  res.json({ success: true, post: newPost });
});

apiRouter.post('/forum/:id/like', (req: Request, res: Response) => {
  const { userId } = req.body;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const idx = post.likedBy.indexOf(userId);
  if (idx === -1) {
    post.likedBy.push(userId);
    post.likes += 1;
  } else {
    post.likedBy.splice(idx, 1);
    post.likes = Math.max(0, post.likes - 1);
  }

  res.json({ success: true, post });
});

apiRouter.post('/forum/:id/comment', (req: Request, res: Response) => {
  const { authorName, apartmentId, content } = req.body;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const newComment = {
    id: `cm-${Date.now()}`,
    authorName: authorName || 'Resident',
    apartmentId: apartmentId || 'A-402',
    content,
    createdAt: new Date().toISOString(),
  };

  post.comments.push(newComment);
  res.json({ success: true, comment: newComment, post });
});

// ----------------------------------------------------
// STAFF DIRECTORY
// ----------------------------------------------------
apiRouter.get('/staff', (req: Request, res: Response) => {
  res.json(db.staff);
});

// Secretary-only (enforced client-side, like the rest of this app's role
// gating). Adds a new on-duty worker so they can be assigned to complaints.
apiRouter.post('/staff', (req: Request, res: Response) => {
  const { name, role, phone, shift, status } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Worker name is required.' });
  }
  if (!role || !String(role).trim()) {
    return res.status(400).json({ error: 'A role (e.g. Plumber, Electrician) is required.' });
  }

  const worker: SocietyStaff = {
    id: `staff-${Date.now()}`,
    name: String(name).trim(),
    role: String(role).trim(),
    phone: phone || '',
    shift: shift || 'General (9 AM - 6 PM)',
    status: status || 'On Duty',
    avatarUrl: generateAvatar(String(name).trim()),
  };

  db.staff.push(worker);
  db.scheduleSave();

  res.json({ success: true, worker });
});

apiRouter.delete('/staff/:id', (req: Request, res: Response) => {
  const idx = db.staff.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Worker not found.' });

  db.staff.splice(idx, 1);
  db.scheduleSave();

  res.json({ success: true });
});

// ----------------------------------------------------
// AI ASSISTANT ENDPOINTS (GEMINI)
// ----------------------------------------------------
apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  const { message, role, apartmentId } = req.body;
  const reply = await askSocietyAiAssistant(message || '', role || 'resident', apartmentId);
  res.json({ reply });
});

apiRouter.post('/ai/draft-notice', async (req: Request, res: Response) => {
  const { topic, category, tone } = req.body;
  const drafted = await draftNoticeAi(topic || 'Society Maintenance', category || 'General', tone || 'Formal & Courteous');
  res.json(drafted);
});

apiRouter.post('/ai/triage-complaint', async (req: Request, res: Response) => {
  const { title, description, category } = req.body;
  const triaged = await triageComplaintAi(title || '', description || '', category || 'Other');
  res.json(triaged);
});

// ----------------------------------------------------
// PUBLIC SUGGESTIONS & INQUIRY DESK
// ----------------------------------------------------
apiRouter.get('/suggestions', (req: Request, res: Response) => {
  res.json(db.suggestions || []);
});

apiRouter.post('/suggestions', (req: Request, res: Response) => {
  const { name, contact, category, apartmentOrType, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required' });
  }

  const newSuggestion = {
    id: `sug-${Date.now()}`,
    name,
    contact: contact || '',
    category: category || 'General',
    apartmentOrType: apartmentOrType || 'Visitor / Resident',
    message,
    createdAt: new Date().toISOString(),
  };

  if (!db.suggestions) db.suggestions = [];
  db.suggestions.unshift(newSuggestion);

  broadcastRealtimeEvent({
    type: 'NEW_SUGGESTION',
    payload: newSuggestion,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, suggestion: newSuggestion });
});

// ----------------------------------------------------
// SOCIETY FUND / TREASURY LEDGER (Secretary-managed, resident-visible)
// ----------------------------------------------------
apiRouter.get('/fund', (req: Request, res: Response) => {
  const transactions = [...(db.fundTransactions || [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const totalIn = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  res.json({ balance: totalIn - totalOut, totalIn, totalOut, transactions });
});

apiRouter.post('/fund/transactions', (req: Request, res: Response) => {
  const { type, category, amount, description, date, recordedBy } = req.body;

  if (type !== 'credit' && type !== 'debit') {
    return res.status(400).json({ error: 'Transaction type must be "credit" or "debit".' });
  }
  if (!category || !String(category).trim()) {
    return res.status(400).json({ error: 'A category is required.' });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return res.status(400).json({ error: 'A valid date is required.' });
  }

  const transaction: FundTransaction = {
    id: `fund-${Date.now()}`,
    type,
    category: String(category).trim(),
    amount: amt,
    description: String(description || '').trim(),
    date: new Date(date).toISOString().slice(0, 10),
    recordedBy: recordedBy || 'Society Secretary',
    createdAt: new Date().toISOString(),
  };

  if (!db.fundTransactions) db.fundTransactions = [];
  db.fundTransactions.unshift(transaction);
  db.scheduleSave();

  broadcastRealtimeEvent({
    type: 'FUND_TRANSACTION_CREATED',
    payload: transaction,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, transaction });
});

apiRouter.delete('/fund/transactions/:id', (req: Request, res: Response) => {
  const idx = (db.fundTransactions || []).findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Transaction not found.' });

  const [removed] = db.fundTransactions.splice(idx, 1);
  db.scheduleSave();

  broadcastRealtimeEvent({
    type: 'FUND_TRANSACTION_DELETED',
    payload: removed,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true });
});
