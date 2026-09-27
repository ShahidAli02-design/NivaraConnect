import {
  User, Apartment, Visitor, Complaint, Notice, SOSAlert,
  MaintenanceBill, Amenity, AmenityBooking, ForumPost,
  SocietyStaff, SocietyStats, PublicSuggestion, SignupRequest,
  ParkingSlot, ResidentPass, ResidentEntry
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }
      return data as T;
    }

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${text.slice(0, 100)}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON received: ${text.slice(0, 50)}...`);
    }
  } catch (err: any) {
    console.error(`API Error on [${options?.method || 'GET'} ${url}]:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  async getUsers(): Promise<User[]> {
    return request<User[]>(`${API_BASE}/auth/users`);
  },

  async login(email: string, password: string): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    apartmentId?: string;
    residentType?: string;
  }): Promise<{ success: boolean; pending: boolean; message: string }> {
    return request<{ success: boolean; pending: boolean; message: string }>(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Account approval (Secretary)
  async getSignupRequests(status?: string): Promise<SignupRequest[]> {
    const q = status ? `?status=${status}` : '';
    return request<SignupRequest[]>(`${API_BASE}/admin/signup-requests${q}`);
  },

  async approveSignupRequest(id: string, reviewedBy?: string): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>(`${API_BASE}/admin/signup-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewedBy }),
    });
  },

  async rejectSignupRequest(id: string, reviewedBy?: string, reason?: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`${API_BASE}/admin/signup-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewedBy, reason }),
    });
  },

  // Stats
  async getStats(): Promise<SocietyStats> {
    return request<SocietyStats>(`${API_BASE}/stats`);
  },

  // Apartments & Residents
  async getApartments(): Promise<Apartment[]> {
    return request<Apartment[]>(`${API_BASE}/apartments`);
  },

  async getApartment(id: string): Promise<Apartment> {
    return request<Apartment>(`${API_BASE}/apartments/${id}`);
  },

  async addFamilyMember(apartmentId: string, data: { name: string; relation: string; phone?: string; age?: number }) {
    return request(`${API_BASE}/apartments/${apartmentId}/family`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async addVehicle(apartmentId: string, data: { type: string; registrationNumber: string; model: string; parkingSlot?: string }) {
    return request(`${API_BASE}/apartments/${apartmentId}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Visitors
  async getVisitors(params?: { apartmentId?: string; status?: string }): Promise<Visitor[]> {
    const q = new URLSearchParams();
    if (params?.apartmentId) q.append('apartmentId', params.apartmentId);
    if (params?.status) q.append('status', params.status);
    return request<Visitor[]>(`${API_BASE}/visitors?${q.toString()}`);
  },

  async preApproveVisitor(data: {
    name: string;
    phone?: string;
    visitorType: string;
    purpose?: string;
    apartmentId: string;
    residentName: string;
    expectedDate?: string;
    accompanyingGuests?: number;
  }): Promise<{ success: boolean; visitor: Visitor }> {
    return request<{ success: boolean; visitor: Visitor }>(`${API_BASE}/visitors/pre-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async logVisitorEntry(data: {
    name: string;
    phone?: string;
    visitorType: string;
    purpose?: string;
    apartmentId: string;
    residentName?: string;
    vehicleNumber?: string;
    deliveryCompany?: string;
    passCode?: string;
  }): Promise<{ success: boolean; visitor: Visitor; message: string }> {
    return request<{ success: boolean; visitor: Visitor; message: string }>(`${API_BASE}/visitors/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateVisitorStatus(id: string, status: string): Promise<{ success: boolean; visitor: Visitor }> {
    return request<{ success: boolean; visitor: Visitor }>(`${API_BASE}/visitors/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  // Guard-only: the sole path that can grant physical entry — requires a valid Aadhaar
  // number AND the name printed on the card to match the logged visitor name.
  async verifyEntryWithAadhaar(id: string, aadhaarNumber: string, aadhaarName: string, verifiedByGuard?: string): Promise<{ success: boolean; visitor: Visitor }> {
    return request<{ success: boolean; visitor: Visitor }>(`${API_BASE}/visitors/${id}/verify-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaarNumber, aadhaarName, verifiedByGuard }),
    });
  },

  // Complaints
  async getComplaints(params?: { apartmentId?: string; status?: string; category?: string }): Promise<Complaint[]> {
    const q = new URLSearchParams();
    if (params?.apartmentId) q.append('apartmentId', params.apartmentId);
    if (params?.status) q.append('status', params.status);
    if (params?.category) q.append('category', params.category);
    return request<Complaint[]>(`${API_BASE}/complaints?${q.toString()}`);
  },

  async createComplaint(data: {
    title: string;
    description: string;
    category: string;
    priority?: string;
    apartmentId: string;
    residentName: string;
    residentPhone?: string;
    imageUrl?: string;
  }): Promise<{ success: boolean; complaint: Complaint }> {
    return request<{ success: boolean; complaint: Complaint }>(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateComplaint(id: string, data: {
    status?: string;
    assignedStaff?: string;
    assignedStaffPhone?: string;
    comment?: string;
    updatedBy?: string;
    authorRole?: string;
  }): Promise<{ success: boolean; complaint: Complaint }> {
    return request<{ success: boolean; complaint: Complaint }>(`${API_BASE}/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // SOS Emergency
  async getSosAlerts(): Promise<SOSAlert[]> {
    return request<SOSAlert[]>(`${API_BASE}/sos`);
  },

  async triggerSos(data: {
    category: string;
    apartmentId: string;
    triggeredByName: string;
    triggeredByPhone?: string;
    notes?: string;
  }): Promise<{ success: boolean; alert: SOSAlert }> {
    return request<{ success: boolean; alert: SOSAlert }>(`${API_BASE}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async respondSos(id: string, data: {
    status: string;
    respondedByGuard?: string;
    resolutionRemarks?: string;
  }): Promise<{ success: boolean; alert: SOSAlert }> {
    return request<{ success: boolean; alert: SOSAlert }>(`${API_BASE}/sos/${id}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Notices
  async getNotices(): Promise<Notice[]> {
    return request<Notice[]>(`${API_BASE}/notices`);
  },

  async createNotice(data: {
    title: string;
    content: string;
    category: string;
    priority: string;
    publishedBy: string;
    publisherRole: string;
    pollQuestion?: string;
    pollOptions?: string[];
  }): Promise<{ success: boolean; notice: Notice }> {
    return request<{ success: boolean; notice: Notice }>(`${API_BASE}/notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async votePoll(noticeId: string, optionId: string, userId: string): Promise<{ success: boolean; notice: Notice }> {
    return request<{ success: boolean; notice: Notice }>(`${API_BASE}/notices/${noticeId}/poll-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId, userId }),
    });
  },

  async acknowledgeNotice(noticeId: string, userId: string): Promise<{ success: boolean; notice: Notice }> {
    return request<{ success: boolean; notice: Notice }>(`${API_BASE}/notices/${noticeId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  // Maintenance & Billing
  async getBills(apartmentId?: string): Promise<MaintenanceBill[]> {
    const q = apartmentId ? `?apartmentId=${apartmentId}` : '';
    return request<MaintenanceBill[]>(`${API_BASE}/billing${q}`);
  },

  async payBill(billId: string, paymentMethod: string): Promise<{ success: boolean; bill: MaintenanceBill }> {
    return request<{ success: boolean; bill: MaintenanceBill }>(`${API_BASE}/billing/${billId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod }),
    });
  },

  async createBill(data: {
    apartmentId: string; month: string; baseAmount: number; sinkingFund: number; waterCharges: number;
    commonElectricity: number; parkingCharges: number; penaltyCharges: number; dueDate: string;
  }): Promise<{ success: boolean; created: MaintenanceBill[]; skipped: string[] }> {
    return request(`${API_BASE}/billing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteBill(id: string): Promise<{ success: boolean }> {
    return request(`${API_BASE}/billing/${id}`, { method: 'DELETE' });
  },

  // Amenities
  async getAmenities(): Promise<Amenity[]> {
    return request<Amenity[]>(`${API_BASE}/amenities`);
  },

  async getAmenityBookings(): Promise<AmenityBooking[]> {
    return request<AmenityBooking[]>(`${API_BASE}/amenity-bookings`);
  },

  async bookAmenity(data: {
    amenityId: string;
    apartmentId: string;
    residentName: string;
    date: string;
    slot: string;
    paymentAmount: number;
  }): Promise<{ success: boolean; booking: AmenityBooking }> {
    return request<{ success: boolean; booking: AmenityBooking }>(`${API_BASE}/amenity-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async createAmenityBooking(data: {
    amenityName: string;
    apartmentId: string;
    residentName: string;
    date: string;
    timeSlot: string;
    guestsCount?: number;
    purpose?: string;
    amount?: number;
  }): Promise<{ success: boolean; booking: AmenityBooking }> {
    return request<{ success: boolean; booking: AmenityBooking }>(`${API_BASE}/amenity-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amenityId: 'a-1',
        amenityName: data.amenityName,
        apartmentId: data.apartmentId,
        residentName: data.residentName,
        date: data.date,
        slot: data.timeSlot,
        timeSlot: data.timeSlot,
        guestsCount: data.guestsCount,
        purpose: data.purpose,
        paymentAmount: data.amount || 0,
        amount: data.amount || 0,
      }),
    });
  },

  // Forum
  async getForumPosts(): Promise<ForumPost[]> {
    return request<ForumPost[]>(`${API_BASE}/forum`);
  },

  async createForumPost(data: {
    title: string;
    content: string;
    category: string;
    apartmentId: string;
    authorName: string;
    authorRole: string;
  }): Promise<{ success: boolean; post: ForumPost }> {
    return request<{ success: boolean; post: ForumPost }>(`${API_BASE}/forum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async likeForumPost(postId: string, userId: string): Promise<{ success: boolean; post: ForumPost }> {
    return request<{ success: boolean; post: ForumPost }>(`${API_BASE}/forum/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  async commentForumPost(postId: string, data: { authorName: string; apartmentId: string; content: string }): Promise<{ success: boolean; post: ForumPost }> {
    return request<{ success: boolean; post: ForumPost }>(`${API_BASE}/forum/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Staff
  async getStaff(): Promise<SocietyStaff[]> {
    return request<SocietyStaff[]>(`${API_BASE}/staff`);
  },

  // AI
  async askAi(message: string, role: string, apartmentId?: string): Promise<{ reply: string }> {
    return request<{ reply: string }>(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, role, apartmentId }),
    });
  },

  async draftNoticeWithAi(topic: string, category: string, tone: string): Promise<{ title: string; content: string; priority: string }> {
    return request<{ title: string; content: string; priority: string }>(`${API_BASE}/ai/draft-notice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, category, tone }),
    });
  },

  async triageComplaintWithAi(title: string, description: string, category: string) {
    return request<{ estimatedTime: string; suggestedAction: string; urgencyLevel: string }>(`${API_BASE}/ai/triage-complaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category }),
    });
  },

  // Live Parking
  async getParking(): Promise<ParkingSlot[]> {
    return request<ParkingSlot[]>(`${API_BASE}/parking`);
  },

  async assignParking(id: string, data: { visitorId?: string; occupantName?: string; vehicleNumber: string; minutes: number }) {
    return request<{ success: boolean; slot: ParkingSlot }>(`${API_BASE}/parking/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async extendParking(id: string, minutes: number) {
    return request<{ success: boolean; slot: ParkingSlot }>(`${API_BASE}/parking/${id}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes }),
    });
  },

  async releaseParking(id: string) {
    return request<{ success: boolean; slot: ParkingSlot }>(`${API_BASE}/parking/${id}/release`, { method: 'POST' });
  },

  // Premium Residency Pass
  async getResidentPasses(): Promise<ResidentPass[]> {
    return request<ResidentPass[]>(`${API_BASE}/resident-passes`);
  },

  async getResidentEntries(apartmentId?: string): Promise<ResidentEntry[]> {
    const q = apartmentId ? `?apartmentId=${encodeURIComponent(apartmentId)}` : '';
    return request<ResidentEntry[]>(`${API_BASE}/resident-entries${q}`);
  },

  async scanResidentPass(data: { code: string; holderName: string; direction?: 'IN' | 'OUT'; vehicleNumber?: string; loggedBy?: string }) {
    return request<{ success: boolean; entry: ResidentEntry }>(`${API_BASE}/resident-passes/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Public Suggestions
  async getSuggestions(): Promise<PublicSuggestion[]> {
    return request<PublicSuggestion[]>(`${API_BASE}/suggestions`);
  },

  async submitSuggestion(data: {
    name: string;
    contact?: string;
    category: string;
    apartmentOrType?: string;
    message: string;
  }): Promise<{ success: boolean; suggestion: PublicSuggestion }> {
    return request<{ success: boolean; suggestion: PublicSuggestion }>(`${API_BASE}/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
};
