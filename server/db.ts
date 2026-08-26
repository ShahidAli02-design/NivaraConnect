import { 
  User, Apartment, Visitor, Complaint, Notice, SOSAlert, 
  MaintenanceBill, Amenity, AmenityBooking, ForumPost, 
  SocietyStaff, SocietyStats, RealtimeEvent, PublicSuggestion 
} from '../src/types';

// In-Memory Real-Time Database with Seed Data for Nivara Heights
export class NivaraDatabase {
  suggestions: PublicSuggestion[] = [
    {
      id: 'sug-1',
      name: 'Dr. Anand Joshi',
      contact: 'anand.joshi@email.com',
      category: 'Maintenance',
      apartmentOrType: 'Resident Tower-A',
      message: 'Requesting speed bumps near the Tower A basement ramp for children safety.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'sug-2',
      name: 'Ritu Sen',
      contact: '+91 98450 11223',
      category: 'Amenity',
      apartmentOrType: 'Prospective Resident / Visitor',
      message: 'Can non-residents book the banquet hall for small family gatherings on weekends?',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    }
  ];

  users: User[] = [
    {
      id: 'usr-admin-1',
      name: 'Prof. Rajesh Kulkarni',
      email: 'secretary@nivara.com',
      phone: '+91 98230 45678',
      role: 'admin',
      apartmentId: 'A-401',
      wing: 'A',
      flatNumber: '401',
      residentType: 'owner',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      familyMembersCount: 3,
      vehiclesCount: 2,
    },
    {
      id: 'usr-res-1',
      name: 'Aditya Sharma',
      email: 'aditya.sharma@example.com',
      phone: '+91 98765 43210',
      role: 'resident',
      apartmentId: 'A-402',
      wing: 'A',
      flatNumber: '402',
      residentType: 'owner',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      familyMembersCount: 4,
      vehiclesCount: 2,
    },
    {
      id: 'usr-res-2',
      name: 'Pooja Verma',
      email: 'pooja.verma@example.com',
      phone: '+91 98112 33445',
      role: 'resident',
      apartmentId: 'B-101',
      wing: 'B',
      flatNumber: '101',
      residentType: 'tenant',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      familyMembersCount: 2,
      vehiclesCount: 1,
    },
    {
      id: 'usr-res-3',
      name: 'Sunil Deshmukh',
      email: 'sunil.d@example.com',
      phone: '+91 94221 88990',
      role: 'resident',
      apartmentId: 'C-304',
      wing: 'C',
      flatNumber: '304',
      residentType: 'owner',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      familyMembersCount: 3,
      vehiclesCount: 2,
    },
    {
      id: 'usr-guard-1',
      name: 'Ramesh Bahadur (Head Guard)',
      email: 'gate1@nivara.com',
      phone: '+91 91234 56789',
      role: 'security',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    }
  ];

  apartments: Apartment[] = [
    {
      id: 'A-402',
      wing: 'A',
      flatNumber: '402',
      floor: 4,
      ownerName: 'Aditya Sharma',
      ownerPhone: '+91 98765 43210',
      ownerEmail: 'aditya.sharma@example.com',
      occupantType: 'owner',
      intercomNumber: '1402',
      duesBalance: 0,
      familyMembers: [
        { id: 'fm-1', name: 'Neha Sharma', relation: 'Spouse', phone: '+91 98765 43211', age: 34 },
        { id: 'fm-2', name: 'Aarav Sharma', relation: 'Child', age: 7 },
        { id: 'fm-3', name: 'Kusum Sharma', relation: 'Parent', phone: '+91 98765 43212', age: 64 },
      ],
      vehicles: [
        { id: 'vh-1', type: '4-Wheeler', registrationNumber: 'MH-27-AZ-4509', model: 'Hyundai Creta', parkingSlot: 'P-A402' },
        { id: 'vh-2', type: '2-Wheeler', registrationNumber: 'MH-27-BK-1102', model: 'Honda Activa 6G', parkingSlot: 'P-2W-24' },
      ],
    },
    {
      id: 'B-101',
      wing: 'B',
      flatNumber: '101',
      floor: 1,
      ownerName: 'Vikram Joshi',
      ownerPhone: '+91 94220 11223',
      ownerEmail: 'vikram.j@example.com',
      occupantType: 'tenant',
      tenantName: 'Pooja Verma',
      tenantPhone: '+91 98112 33445',
      intercomNumber: '2101',
      duesBalance: 3200,
      familyMembers: [
        { id: 'fm-4', name: 'Rohan Verma', relation: 'Spouse', phone: '+91 98112 33446', age: 30 },
      ],
      vehicles: [
        { id: 'vh-3', type: '4-Wheeler', registrationNumber: 'MH-27-CF-8821', model: 'Tata Nexon EV', parkingSlot: 'P-B101' },
      ],
    },
    {
      id: 'C-304',
      wing: 'C',
      flatNumber: '304',
      floor: 3,
      ownerName: 'Sunil Deshmukh',
      ownerPhone: '+91 94221 88990',
      ownerEmail: 'sunil.d@example.com',
      occupantType: 'owner',
      intercomNumber: '3304',
      duesBalance: 0,
      familyMembers: [
        { id: 'fm-5', name: 'Smita Deshmukh', relation: 'Spouse', phone: '+91 94221 88991', age: 48 },
        { id: 'fm-6', name: 'Aniket Deshmukh', relation: 'Child', phone: '+91 94221 88992', age: 21 },
      ],
      vehicles: [
        { id: 'vh-4', type: '4-Wheeler', registrationNumber: 'MH-27-DA-3030', model: 'Honda City', parkingSlot: 'P-C304' },
        { id: 'vh-5', type: '2-Wheeler', registrationNumber: 'MH-27-EE-9090', model: 'Royal Enfield Classic 350', parkingSlot: 'P-2W-51' },
      ],
    },
    {
      id: 'A-401',
      wing: 'A',
      flatNumber: '401',
      floor: 4,
      ownerName: 'Prof. Rajesh Kulkarni',
      ownerPhone: '+91 98230 45678',
      ownerEmail: 'secretary@nivara.com',
      occupantType: 'owner',
      intercomNumber: '1401',
      duesBalance: 0,
      familyMembers: [
        { id: 'fm-7', name: 'Dr. Vasudha Kulkarni', relation: 'Spouse', phone: '+91 98230 45679', age: 52 },
      ],
      vehicles: [
        { id: 'vh-6', type: '4-Wheeler', registrationNumber: 'MH-27-AB-9900', model: 'Maruti Grand Vitara', parkingSlot: 'P-A401' },
      ],
    },
    {
      id: 'A-102',
      wing: 'A',
      flatNumber: '102',
      floor: 1,
      ownerName: 'Kunal Shinde',
      ownerPhone: '+91 99887 76655',
      ownerEmail: 'kunal.s@example.com',
      occupantType: 'owner',
      intercomNumber: '1102',
      duesBalance: 3200,
      familyMembers: [],
      vehicles: [],
    },
    {
      id: 'B-202',
      wing: 'B',
      flatNumber: '202',
      floor: 2,
      ownerName: 'Manish Patil',
      ownerPhone: '+91 97654 32190',
      ownerEmail: 'manish.p@example.com',
      occupantType: 'owner',
      intercomNumber: '2202',
      duesBalance: 0,
      familyMembers: [],
      vehicles: [],
    }
  ];

  visitors: Visitor[] = [
    {
      id: 'vis-1',
      name: 'Rajat Dave',
      phone: '+91 98223 99112',
      visitorType: 'Guest',
      purpose: 'Family Dinner Visit',
      apartmentId: 'A-402',
      residentName: 'Aditya Sharma',
      passCode: '482910',
      status: 'Inside',
      entryTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      vehicleNumber: 'MH-27-BX-1002',
      loggedByGuardName: 'Ramesh Bahadur',
      accompanyingGuests: 1,
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'vis-2',
      name: 'Deepak (Amazon Logistics)',
      phone: '+91 91720 33441',
      visitorType: 'Delivery',
      deliveryCompany: 'Amazon',
      purpose: 'Package Delivery',
      apartmentId: 'B-101',
      residentName: 'Pooja Verma',
      passCode: '193822',
      status: 'Inside',
      entryTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      loggedByGuardName: 'Ramesh Bahadur',
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
    {
      id: 'vis-3',
      name: 'Dr. Alok Mehta',
      phone: '+91 94229 00112',
      visitorType: 'Guest',
      purpose: 'Medical Consultation Visit',
      apartmentId: 'A-402',
      residentName: 'Aditya Sharma',
      passCode: '772914',
      status: 'Pre-Approved',
      expectedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'vis-4',
      name: 'Uber Cab (Mahesh)',
      phone: '+91 98888 12345',
      visitorType: 'Cab / Taxi',
      deliveryCompany: 'Uber',
      purpose: 'Resident Pickup',
      apartmentId: 'C-304',
      residentName: 'Sunil Deshmukh',
      vehicleNumber: 'MH-27-TR-4433',
      passCode: '620194',
      status: 'Checked Out',
      entryTime: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      exitTime: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
      loggedByGuardName: 'Ramesh Bahadur',
      createdAt: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    }
  ];

  complaints: Complaint[] = [
    {
      id: 'cmp-101',
      title: 'Water Seepage near Master Bedroom Wall',
      description: 'Noticed continuous dampness and moisture marks appearing on the external corner wall of flat A-402 since heavy rains yesterday.',
      category: 'Plumbing',
      priority: 'High',
      status: 'In Progress',
      apartmentId: 'A-402',
      residentName: 'Aditya Sharma',
      residentPhone: '+91 98765 43210',
      assignedStaff: 'Suresh Kumar (Plumber)',
      assignedStaffPhone: '+91 98221 77665',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      aiTriageSummary: {
        estimatedTime: '4 - 6 hours',
        suggestedAction: 'Inspect rooftop drainage outlet above Wing A 4th floor and patch sealant on exterior joints.',
        urgencyLevel: 'High',
      },
      timeline: [
        {
          id: 'tl-1',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          authorName: 'Aditya Sharma',
          authorRole: 'resident',
          action: 'Complaint Registered',
          comment: 'Submitted with damp wall description.',
        },
        {
          id: 'tl-2',
          timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          authorName: 'Prof. Rajesh Kulkarni',
          authorRole: 'admin',
          action: 'Status updated to In Progress',
          comment: 'Assigned to Suresh Kumar (Plumbing contractor). Site inspection scheduled at 2:30 PM.',
        }
      ],
    },
    {
      id: 'cmp-102',
      title: 'Wing B Lift Light & Fan Flickering',
      description: 'The cabin light and ventilation fan inside Passenger Lift 2 in Wing B turns off intermittently when moving between 2nd and 4th floors.',
      category: 'Lift / Elevator',
      priority: 'Emergency',
      status: 'In Progress',
      apartmentId: 'B-101',
      residentName: 'Pooja Verma',
      residentPhone: '+91 98112 33445',
      assignedStaff: 'Otis Elevator AMC Service',
      assignedStaffPhone: '+91 98900 11223',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      aiTriageSummary: {
        estimatedTime: '2 hours',
        suggestedAction: 'Immediate Otis technician call logged. Warning signage placed at ground floor lobby.',
        urgencyLevel: 'Emergency',
      },
      timeline: [
        {
          id: 'tl-3',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          authorName: 'Pooja Verma',
          authorRole: 'resident',
          action: 'Complaint Registered',
        },
        {
          id: 'tl-4',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          authorName: 'Prof. Rajesh Kulkarni',
          authorRole: 'admin',
          action: 'Technician Dispatched',
          comment: 'Otis service engineer en route to society.',
        }
      ],
    },
    {
      id: 'cmp-103',
      title: 'Basement Parking Light Sensor Repair',
      description: 'Motion sensor tube lights in Pillar P-20 area near Wing C staircase were not turning on automatically.',
      category: 'Electrical',
      priority: 'Medium',
      status: 'Resolved',
      apartmentId: 'C-304',
      residentName: 'Sunil Deshmukh',
      residentPhone: '+91 94221 88990',
      assignedStaff: 'Vinod (Electrician)',
      assignedStaffPhone: '+91 98224 44556',
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      timeline: [
        {
          id: 'tl-5',
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          authorName: 'Sunil Deshmukh',
          authorRole: 'resident',
          action: 'Complaint Registered',
        },
        {
          id: 'tl-6',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          authorName: 'Vinod (Electrician)',
          authorRole: 'admin',
          action: 'Resolved',
          comment: 'Replaced PIR sensor module and checked wiring.',
        }
      ],
    }
  ];

  notices: Notice[] = [
    {
      id: 'not-1',
      title: 'Annual General Meeting (AGM) 2026-27 Notification',
      content: `Notice is hereby given to all registered apartment owners and members that the Annual General Meeting (AGM) of Nivara Heights Cooperative Housing Society is scheduled on Sunday, 30th August at 10:30 AM in the Main Clubhouse.\n\nAgenda:\n1. Approval of Audited Balance Sheet & Financial Statements for FY 2025-26.\n2. Review of Solar Rooftop Installation Proposal.\n3. Election for 3 Committee Member vacancies.\n4. Any other item with the permission of the Chair.\n\nHigh-tea will be served post meeting. All residents are requested to attend on time.`,
      category: 'AGM / Meeting',
      priority: 'Important',
      publishedBy: 'Prof. Rajesh Kulkarni (Secretary)',
      publisherRole: 'admin',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      acknowledgementsCount: 48,
      acknowledgedUserIds: ['usr-res-1', 'usr-res-3'],
      poll: {
        question: 'Will you be attending the Annual General Body Meeting (AGM) in person?',
        options: [
          { id: 'opt-1', text: 'Yes, attending in person', votes: 34, votedUserIds: ['usr-res-1'] },
          { id: 'opt-2', text: 'No, submitting proxy form', votes: 6, votedUserIds: [] },
          { id: 'opt-3', text: 'Will join via Zoom stream', votes: 12, votedUserIds: ['usr-res-3'] },
        ],
        closed: false,
      }
    },
    {
      id: 'not-2',
      title: 'Water Supply Pipeline Maintenance - Wing A & B',
      content: `Please note that Municipal Water Tank cleaning and pressure pump valve replacement will be carried out tomorrow between 1:00 PM and 5:00 PM. Residents are advised to store adequate drinking water in advance. Normal supply will resume by 6:00 PM.`,
      category: 'Water / Power Supply',
      priority: 'Urgent / Alert',
      publishedBy: 'Prof. Rajesh Kulkarni (Secretary)',
      publisherRole: 'admin',
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      acknowledgementsCount: 62,
      acknowledgedUserIds: ['usr-res-1', 'usr-res-2'],
    },
    {
      id: 'not-3',
      title: 'Ganesh Festival 2026 Cultural Committee Registrations',
      content: `The Cultural Committee invites applications from young residents for cultural performances, art competition, and eco-friendly decoration. Sign up at the society office before Friday.`,
      category: 'Event',
      priority: 'Normal',
      publishedBy: 'Cultural Committee',
      publisherRole: 'admin',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      acknowledgementsCount: 29,
      acknowledgedUserIds: ['usr-res-1'],
    }
  ];

  sosAlerts: SOSAlert[] = [
    {
      id: 'sos-1',
      category: 'Medical Emergency',
      apartmentId: 'B-101',
      triggeredByName: 'Pooja Verma',
      triggeredByPhone: '+91 98112 33445',
      triggeredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: 'RESPONDING',
      notes: 'Elderly family member feeling sudden chest pain. First aid kit and on-call ambulance dispatched to Wing B.',
      respondedByGuard: 'Ramesh Bahadur (Head Guard)',
      responseTimestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    }
  ];

  bills: MaintenanceBill[] = [
    {
      id: 'bill-aug-a402',
      apartmentId: 'A-402',
      residentName: 'Aditya Sharma',
      billingMonth: 'August 2026',
      baseMaintenance: 2200,
      sinkingFund: 400,
      waterCharges: 400,
      parkingCharges: 200,
      penaltyCharges: 0,
      totalAmount: 3200,
      dueDate: '2026-08-10',
      status: 'Paid',
      paidAt: '2026-08-05T11:20:00Z',
      paymentMethod: 'UPI',
      transactionId: 'UPI/NIVARA/20260805/982910',
      receiptNumber: 'NIV-REC-2026-0842',
    },
    {
      id: 'bill-aug-b101',
      apartmentId: 'B-101',
      residentName: 'Pooja Verma',
      billingMonth: 'August 2026',
      baseMaintenance: 2200,
      sinkingFund: 400,
      waterCharges: 400,
      parkingCharges: 200,
      penaltyCharges: 0,
      totalAmount: 3200,
      dueDate: '2026-08-10',
      status: 'Pending',
    },
    {
      id: 'bill-aug-c304',
      apartmentId: 'C-304',
      residentName: 'Sunil Deshmukh',
      billingMonth: 'August 2026',
      baseMaintenance: 2200,
      sinkingFund: 400,
      waterCharges: 400,
      parkingCharges: 200,
      penaltyCharges: 0,
      totalAmount: 3200,
      dueDate: '2026-08-10',
      status: 'Paid',
      paidAt: '2026-08-08T14:15:00Z',
      paymentMethod: 'Credit Card',
      transactionId: 'CC/NIVARA/20260808/443109',
      receiptNumber: 'NIV-REC-2026-0888',
    }
  ];

  amenities: Amenity[] = [
    {
      id: 'am-1',
      name: 'Grand Clubhouse & Banquet Hall',
      category: 'Community Hall',
      capacity: '120 Persons',
      hourlyRate: 500,
      timings: '8:00 AM - 11:00 PM',
      description: 'Air-conditioned multipurpose banquet hall with audio-visual system, stage, and catering pantry.',
      rules: ['Loud music prohibited after 10:00 PM', 'Cleaning deposit of ₹1000 refundable', 'No smoking/alcohol inside'],
      imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'am-2',
      name: 'Infinity Swimming Pool & Kids Splash Zone',
      category: 'Sports & Wellness',
      capacity: '25 Persons',
      hourlyRate: 0,
      timings: '6:00 AM - 11:00 AM & 4:00 PM - 9:00 PM',
      description: 'Temperature-controlled pool with dedicated certified lifeguard and ozone water filtration.',
      rules: ['Proper swimming attire mandatory', 'Children under 12 must be accompanied by an adult', 'Closed on Tuesdays for cleaning'],
      imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'am-3',
      name: 'Fitness Center & Cardio Gym',
      category: 'Fitness',
      capacity: '20 Persons',
      hourlyRate: 0,
      timings: '5:30 AM - 10:30 PM',
      description: 'Fully equipped modern gym with treadmills, cross-trainers, dumbbells, and functional training zone.',
      rules: ['Gym shoes and towel mandatory', 'Sanitize equipment after use', 'Guest fee ₹100/session'],
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'am-4',
      name: 'Rooftop Floodlit Tennis & Badminton Court',
      category: 'Outdoor Sports',
      capacity: '8 Persons',
      hourlyRate: 150,
      timings: '6:00 AM - 10:00 PM',
      description: 'Synthetic rubberized all-weather court with LED night lighting and seating pavilion.',
      rules: ['Non-marking shoes required', 'Maximum 1 hour booking per slot per flat'],
      imageUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&auto=format&fit=crop&q=80',
    }
  ];

  amenityBookings: AmenityBooking[] = [
    {
      id: 'bk-1',
      amenityId: 'am-1',
      amenityName: 'Grand Clubhouse & Banquet Hall',
      apartmentId: 'A-402',
      residentName: 'Aditya Sharma',
      date: '2026-08-30',
      slot: '6:00 PM - 10:00 PM',
      status: 'Confirmed',
      paymentAmount: 2000,
      createdAt: '2026-08-20T10:00:00Z',
    },
    {
      id: 'bk-2',
      amenityId: 'am-4',
      amenityName: 'Rooftop Floodlit Tennis & Badminton Court',
      apartmentId: 'C-304',
      residentName: 'Sunil Deshmukh',
      date: '2026-08-26',
      slot: '7:00 PM - 8:00 PM',
      status: 'Confirmed',
      paymentAmount: 150,
      createdAt: '2026-08-24T18:00:00Z',
    }
  ];

  forumPosts: ForumPost[] = [
    {
      id: 'post-1',
      apartmentId: 'A-402',
      authorName: 'Neha Sharma',
      authorRole: 'Resident',
      category: 'Recommendations',
      title: 'Highly Recommended Pediatrician nearby Camp Area',
      content: 'Hello neighbors! Dr. Kapse Clinic at Camp Road was wonderful with our son Aarav. Sharing contact (+91 94228 12340) in case any young parents are looking for trusted pediatric care.',
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      likes: 14,
      likedBy: ['usr-res-2', 'usr-res-3'],
      comments: [
        {
          id: 'cm-1',
          authorName: 'Pooja Verma',
          apartmentId: 'B-101',
          content: 'Thank you for sharing Neha! Very helpful.',
          createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        }
      ]
    },
    {
      id: 'post-2',
      apartmentId: 'C-304',
      authorName: 'Aniket Deshmukh',
      authorRole: 'Resident',
      category: 'Carpool',
      title: 'Daily Carpool to Amravati MIDC Tech Park',
      content: 'Driving Mon-Fri leaving 8:45 AM from Nivara Heights Gate 1. 2 seats available in my Honda City. Reach out on WhatsApp if interested!',
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      likes: 8,
      likedBy: ['usr-res-1'],
      comments: []
    }
  ];

  staff: SocietyStaff[] = [
    {
      id: 'st-1',
      name: 'Ramesh Bahadur',
      role: 'Security Guard',
      phone: '+91 91234 56789',
      shift: 'Morning (6 AM - 2 PM)',
      status: 'On Duty',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'st-2',
      name: 'Dinesh Gurung',
      role: 'Security Guard',
      phone: '+91 91234 56790',
      shift: 'Evening (2 PM - 10 PM)',
      status: 'On Duty',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'st-3',
      name: 'Suresh Kumar',
      role: 'Plumber',
      phone: '+91 98221 77665',
      shift: 'General (9 AM - 6 PM)',
      status: 'On Duty',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'st-4',
      name: 'Vinod Mestry',
      role: 'Electrician',
      phone: '+91 98224 44556',
      shift: 'General (9 AM - 6 PM)',
      status: 'On Duty',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    }
  ];

  getStats(): SocietyStats {
    const totalFlats = 120;
    const occupiedFlats = 108;
    const totalResidents = 342;
    const activeVisitorsInside = this.visitors.filter(v => v.status === 'Inside').length;
    const pendingApprovals = this.visitors.filter(v => v.status === 'Waiting Approval' || v.status === 'Pre-Approved').length;
    const openComplaints = this.complaints.filter(c => c.status === 'Open' || c.status === 'In Progress').length;
    const activeSosCount = this.sosAlerts.filter(s => s.status === 'ACTIVE' || s.status === 'RESPONDING').length;
    const totalBills = this.bills.length;
    const paidBills = this.bills.filter(b => b.status === 'Paid').length;
    const maintenanceCollectionRate = totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 100;
    const totalCollectionMonth = this.bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.totalAmount, 0);

    return {
      totalFlats,
      occupiedFlats,
      totalResidents,
      activeVisitorsInside,
      pendingApprovals,
      openComplaints,
      activeSosCount,
      maintenanceCollectionRate,
      totalCollectionMonth,
    };
  }
}

export const db = new NivaraDatabase();
