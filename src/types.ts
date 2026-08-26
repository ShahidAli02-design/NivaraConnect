export type UserRole = 'resident' | 'admin' | 'security';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  apartmentId?: string; // e.g., "A-402"
  wing?: string;
  flatNumber?: string;
  residentType?: 'owner' | 'tenant';
  avatarUrl?: string;
  familyMembersCount?: number;
  vehiclesCount?: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: 'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Other';
  phone?: string;
  age?: number;
}

export interface Vehicle {
  id: string;
  type: '2-Wheeler' | '4-Wheeler' | 'Electric Vehicle';
  registrationNumber: string;
  model: string;
  parkingSlot: string;
}

export interface Apartment {
  id: string; // "A-101", "B-402", etc.
  wing: string;
  flatNumber: string;
  floor: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  occupantType: 'owner' | 'tenant' | 'vacant';
  tenantName?: string;
  tenantPhone?: string;
  familyMembers: FamilyMember[];
  vehicles: Vehicle[];
  intercomNumber: string;
  duesBalance: number;
}

export type VisitorType = 'Guest' | 'Delivery' | 'Cab / Taxi' | 'Service / Repair' | 'Daily Help';
export type VisitorStatus = 'Pre-Approved' | 'Waiting Approval' | 'Approved' | 'Denied' | 'Inside' | 'Checked Out';

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  visitorType: VisitorType;
  purpose: string;
  apartmentId: string; // Target Flat e.g. "A-402"
  residentName: string;
  vehicleNumber?: string;
  passCode: string; // 6-digit PIN or QR payload
  status: VisitorStatus;
  entryTime?: string;
  exitTime?: string;
  expectedDate?: string;
  loggedByGuardName?: string;
  photoUrl?: string;
  accompanyingGuests?: number;
  deliveryCompany?: string; // "Amazon", "Swiggy", "Uber", etc.
  createdAt: string;
}

export type ComplaintCategory = 
  | 'Plumbing' 
  | 'Electrical' 
  | 'Lift / Elevator' 
  | 'Security & Gate' 
  | 'Cleanliness & Waste' 
  | 'Noise / Disturbance' 
  | 'Carpentry / Civil' 
  | 'Parking' 
  | 'Garden & Amenities' 
  | 'Other';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Emergency';
export type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface ComplaintTimelineItem {
  id: string;
  timestamp: string;
  authorName: string;
  authorRole: UserRole;
  action: string;
  comment?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  apartmentId: string;
  residentName: string;
  residentPhone: string;
  assignedStaff?: string;
  assignedStaffPhone?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  timeline: ComplaintTimelineItem[];
  aiTriageSummary?: {
    estimatedTime: string;
    suggestedAction: string;
    urgencyLevel: string;
  };
}

export type NoticePriority = 'Normal' | 'Important' | 'Urgent / Alert';
export type NoticeCategory = 'Maintenance' | 'General' | 'Event' | 'AGM / Meeting' | 'Security' | 'Water / Power Supply';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  votedUserIds: string[];
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  priority: NoticePriority;
  publishedBy: string;
  publisherRole: string;
  publishedAt: string;
  expiresAt?: string;
  attachmentName?: string;
  poll?: {
    question: string;
    options: PollOption[];
    closed: boolean;
  };
  acknowledgementsCount: number;
  acknowledgedUserIds: string[];
}

export type SOSCategory = 'Medical Emergency' | 'Fire Hazard' | 'Security Threat / Intruder' | 'Lift Breakdown / Trapped' | 'Other Danger';
export type SOSStatus = 'ACTIVE' | 'RESPONDING' | 'RESOLVED';

export interface SOSAlert {
  id: string;
  category: SOSCategory;
  apartmentId: string;
  triggeredByName: string;
  triggeredByPhone: string;
  triggeredAt: string;
  status: SOSStatus;
  notes?: string;
  respondedByGuard?: string;
  responseTimestamp?: string;
  resolvedTimestamp?: string;
  resolutionRemarks?: string;
}

export interface MaintenanceBill {
  id: string;
  apartmentId: string;
  residentName: string;
  billingMonth?: string; // e.g., "August 2026"
  month?: string;
  baseMaintenance?: number;
  baseAmount?: number;
  sinkingFund: number;
  waterCharges: number;
  commonElectricity?: number;
  parkingCharges: number;
  penaltyCharges: number;
  totalAmount: number;
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue';
  paidAt?: string;
  paidDate?: string;
  paymentMethod?: 'UPI' | 'Credit Card' | 'Net Banking' | 'Cash / Cheque';
  paymentMode?: string;
  transactionId?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
}

export interface Amenity {
  id: string;
  name: string;
  category: string;
  capacity: string;
  hourlyRate: number;
  timings: string;
  description: string;
  rules: string[];
  imageUrl: string;
}

export interface AmenityBooking {
  id: string;
  amenityId?: string;
  amenityName: string;
  apartmentId: string;
  residentName: string;
  date: string;
  slot?: string;
  timeSlot?: string;
  guestsCount?: number;
  purpose?: string;
  status: 'Confirmed' | 'Pending Approval' | 'Cancelled';
  paymentAmount?: number;
  amount?: number;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  apartmentId: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  category: 'General' | 'Buy & Sell' | 'Recommendations' | 'Lost & Found' | 'Carpool';
  createdAt: string;
  likes: number;
  likedBy: string[];
  comments: {
    id: string;
    authorName: string;
    apartmentId: string;
    content: string;
    createdAt: string;
  }[];
}

export interface SocietyStaff {
  id: string;
  name: string;
  role: 'Security Guard' | 'Supervisor' | 'Electrician' | 'Plumber' | 'Housekeeping' | 'Gardener' | string;
  phone: string;
  shift: 'Morning (6 AM - 2 PM)' | 'Evening (2 PM - 10 PM)' | 'Night (10 PM - 6 AM)' | 'General (9 AM - 6 PM)' | string;
  status: 'On Duty' | 'Off Duty' | 'On Leave' | string;
  avatarUrl?: string;
}

export type StaffMember = SocietyStaff;

export interface SocietyStats {
  totalFlats: number;
  occupiedFlats: number;
  totalResidents: number;
  activeVisitorsInside: number;
  pendingApprovals: number;
  openComplaints: number;
  activeSosCount: number;
  maintenanceCollectionRate: number; // percentage
  totalCollectionMonth: number;
}

export interface PublicSuggestion {
  id: string;
  name: string;
  contact: string;
  category: 'General' | 'Maintenance' | 'Security' | 'Amenity' | string;
  apartmentOrType?: string;
  message: string;
  createdAt: string;
}

// Real-time SSE Event
export type RealtimeEventType = 
  | 'VISITOR_ARRIVAL'
  | 'VISITOR_STATUS_CHANGE'
  | 'SOS_TRIGGERED'
  | 'SOS_UPDATED'
  | 'NEW_NOTICE'
  | 'COMPLAINT_CREATED'
  | 'COMPLAINT_UPDATED'
  | 'BILL_PAID'
  | 'NEW_POLL_VOTE'
  | 'NEW_SUGGESTION';

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: any;
  timestamp: string;
  targetApartmentId?: string; // If targeting a specific flat
}
