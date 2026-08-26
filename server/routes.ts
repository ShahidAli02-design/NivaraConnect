import { Router, Request, Response } from 'express';
import { db } from './db';
import { askSocietyAiAssistant, triageComplaintAi, draftNoticeAi } from './gemini';
import { RealtimeEvent, Visitor, Complaint, SOSAlert, Notice, MaintenanceBill, AmenityBooking, ForumPost } from '../src/types';

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
  res.json(db.users);
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase()) || 
               db.users.find(u => u.role === role);
  if (user) {
    res.json({ success: true, user });
  } else {
    // Return default first user
    res.json({ success: true, user: db.users[1] });
  }
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, role, apartmentId, residentType } = req.body;
  const newUser = {
    id: `usr-${Date.now()}`,
    name: name || 'New Resident',
    email: email || `user${Date.now()}@example.com`,
    phone: phone || '+91 99999 00000',
    role: role || 'resident',
    apartmentId: apartmentId || 'A-102',
    wing: (apartmentId || 'A').split('-')[0] || 'A',
    flatNumber: (apartmentId || '102').split('-')[1] || '102',
    residentType: residentType || 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    familyMembersCount: 1,
    vehiclesCount: 1,
  };
  db.users.push(newUser);
  res.json({ success: true, user: newUser });
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
  const apt = db.apartments.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
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

// Log visitor entry by Security Guard (Direct or request approval)
apiRouter.post('/visitors/entry', (req: Request, res: Response) => {
  const { name, phone, visitorType, purpose, apartmentId, residentName, vehicleNumber, deliveryCompany, passCode } = req.body;

  // Check if there is an existing pre-approved visitor with this passcode or phone
  let existing = db.visitors.find(v => (v.passCode === passCode || (v.phone === phone && v.status === 'Pre-Approved')) && v.apartmentId === apartmentId);

  if (existing) {
    existing.status = 'Inside';
    existing.entryTime = new Date().toISOString();
    existing.vehicleNumber = vehicleNumber || existing.vehicleNumber;
    existing.loggedByGuardName = 'Ramesh Bahadur (Gate 1)';

    broadcastRealtimeEvent({
      type: 'VISITOR_ARRIVAL',
      payload: existing,
      timestamp: new Date().toISOString(),
      targetApartmentId: apartmentId,
    });

    return res.json({ success: true, visitor: existing, message: 'Pre-approved visitor pass verified. Entry granted!' });
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
    status: 'Waiting Approval', // Triggers instant popup on Resident's screen!
    entryTime: new Date().toISOString(),
    loggedByGuardName: 'Ramesh Bahadur (Gate 1)',
    createdAt: new Date().toISOString(),
  };

  db.visitors.unshift(newVisitor);

  // Broadcast to Resident for instant 1-click Approval!
  broadcastRealtimeEvent({
    type: 'VISITOR_ARRIVAL',
    payload: newVisitor,
    timestamp: new Date().toISOString(),
    targetApartmentId: apartmentId,
  });

  res.json({ success: true, visitor: newVisitor, message: 'Approval request sent to resident in real-time.' });
});

// Resident or Guard updates visitor status (Approve, Deny, Checkout)
apiRouter.patch('/visitors/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const visitor = db.visitors.find(v => v.id === req.params.id);
  if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

  visitor.status = status;
  if (status === 'Checked Out') {
    visitor.exitTime = new Date().toISOString();
  }
  if (status === 'Approved' && !visitor.entryTime) {
    visitor.entryTime = new Date().toISOString();
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
  res.json(list);
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
  const { amenityId, apartmentId, residentName, date, slot, paymentAmount } = req.body;
  const amenity = db.amenities.find(a => a.id === amenityId);
  const newBooking: AmenityBooking = {
    id: `bk-${Date.now()}`,
    amenityId,
    amenityName: amenity?.name || 'Amenity',
    apartmentId,
    residentName,
    date,
    slot,
    status: 'Confirmed',
    paymentAmount: Number(paymentAmount) || 0,
    createdAt: new Date().toISOString(),
  };

  db.amenityBookings.unshift(newBooking);
  res.json({ success: true, booking: newBooking });
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
