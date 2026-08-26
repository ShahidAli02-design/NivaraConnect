import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, ShieldAlert, Sparkles, UserCheck, 
  Wrench, Bell, ArrowRight, CheckCircle2, ChevronRight, 
  Send, Phone, Radio, KeyRound, Lock, User, Megaphone, 
  Droplets, QrCode, Zap, Compass, Menu, X, Home, MapPin, 
  Calendar, Layers, MessageSquare, Award, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserRole } from '../types';

interface LandingPageProps {
  onEnterDashboard: (role?: UserRole) => void;
  onOpenSos: () => void;
  onOpenAi: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterDashboard,
  onOpenSos,
  onOpenAi,
}) => {
  const { users, switchRole } = useAuth();
  
  // Navigation & UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBulletinsDropdown, setShowBulletinsDropdown] = useState(false);
  const [towerFilter, setTowerFilter] = useState<'all' | 'tower-a' | 'tower-b' | 'tower-c'>('all');
  
  // Role Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('resident');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [apartmentUnit, setApartmentUnit] = useState('A-402');
  const [adminKey, setAdminKey] = useState('SEC-2026');
  const [guardBadge, setGuardBadge] = useState('GUARD-01');

  // Suggestion Form State
  const [sugName, setSugName] = useState('');
  const [sugContact, setSugContact] = useState('');
  const [sugCategory, setSugCategory] = useState('General');
  const [sugApartment, setSugApartment] = useState('');
  const [sugMessage, setSugMessage] = useState('');
  const [isSubmittingSug, setIsSubmittingSug] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenLogin = (role: UserRole = 'resident') => {
    setSelectedRole(role);
    if (role === 'admin') {
      const adminUser = users.find(u => u.role === 'admin');
      if (adminUser) setLoginEmail(adminUser.email);
    } else if (role === 'security') {
      const secUser = users.find(u => u.role === 'security');
      if (secUser) setLoginEmail(secUser.email);
    } else {
      const resUser = users.find(u => u.role === 'resident');
      if (resUser) setLoginEmail(resUser.email);
    }
    setIsLoginModalOpen(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(u => u.role === selectedRole);
    if (targetUser) {
      switchRole(targetUser.id);
    }
    setIsLoginModalOpen(false);
    showToast(`Welcome back! Logged in as ${selectedRole.toUpperCase()}.`);
    onEnterDashboard(selectedRole);
  };

  const handleDirectQuickLogin = (role: UserRole) => {
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
      switchRole(targetUser.id);
    }
    showToast(`Switched to ${role.toUpperCase()} Workspace.`);
    onEnterDashboard(role);
  };

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugName || !sugMessage) return;

    setIsSubmittingSug(true);
    try {
      await api.submitSuggestion({
        name: sugName,
        contact: sugContact,
        category: sugCategory,
        apartmentOrType: sugApartment || 'Resident / Visitor',
        message: sugMessage,
      });

      showToast(`Thank you, ${sugName}! Your ${sugCategory} inquiry has been recorded.`);
      setSugName('');
      setSugContact('');
      setSugApartment('');
      setSugMessage('');
    } catch (err: any) {
      showToast('Your inquiry has been noted into the society log.');
    } finally {
      setIsSubmittingSug(false);
    }
  };

  const towers = [
    {
      id: 'tower-a',
      category: 'tower-a',
      title: 'Tower A — Sunrise Heights',
      badge: '98% Occupied',
      tag: 'Luxury Sky Villas',
      description: '3BHK & 4BHK Sky Villas with panoramic sunrise balcony views and automated biometric smart locks.',
      specs: {
        units: '120 Flats',
        floors: '30 Floors',
        parking: '2 Slots / Unit',
        elevators: '4 High-Speed',
      },
      color: 'border-amber-400/40'
    },
    {
      id: 'tower-b',
      category: 'tower-b',
      title: 'Tower B — Golden Crest',
      badge: '94% Occupied',
      tag: 'Premium Residences',
      description: '2BHK & 3BHK residences facing the central landscaped park and jogging track.',
      specs: {
        units: '160 Flats',
        floors: '20 Floors',
        parking: '1 Slot / Unit',
        elevators: '3 High-Speed',
      },
      color: 'border-amber-400/40'
    },
    {
      id: 'tower-c',
      category: 'tower-c',
      title: 'Tower C — Pearl Horizon',
      badge: 'Available',
      tag: 'Executive Suites',
      description: '1BHK & 2BHK Executive suites equipped with 24/7 clubhouse and workspace access.',
      specs: {
        units: '148 Flats',
        floors: '18 Floors',
        parking: 'Dedicated Slot',
        elevators: '3 High-Speed',
      },
      color: 'border-amber-400/40'
    }
  ];

  const filteredTowers = towerFilter === 'all' 
    ? towers 
    : towers.filter(t => t.category === towerFilter);

  return (
    <div className="relative min-h-screen font-sans selection:bg-amber-400 selection:text-slate-900">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl border-l-4 border-amber-400 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-amber-200/50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Brand Logo */}
            <a href="#home" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gold-gradient flex items-center justify-center text-white shadow-lg shadow-amber-500/20 transform -rotate-3 group-hover:rotate-0 transition-transform duration-300">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Nivara<span className="text-amber-600">Connect</span>
                </span>
                <p className="text-[10px] uppercase font-bold tracking-widest text-amber-700/80">
                  Smart Society Platform
                </p>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7">
              <a href="#home" className="text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors">Home</a>
              <a href="#about" className="text-sm font-medium text-slate-600 hover:text-amber-700 transition-colors">About</a>
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-amber-700 transition-colors">Features</a>
              <a href="#apartments" className="text-sm font-medium text-slate-600 hover:text-amber-700 transition-colors">Community</a>
              <a href="#suggestions" className="text-sm font-medium text-slate-600 hover:text-amber-700 transition-colors">Suggestions</a>
              <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-amber-700 transition-colors">Contact</a>
            </nav>

            {/* Nav Action Controls */}
            <div className="flex items-center gap-3">
              
              {/* Society Bulletins Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBulletinsDropdown(!showBulletinsDropdown)}
                  className="relative p-2.5 rounded-full bg-white/80 border border-amber-200 text-slate-700 hover:text-amber-700 hover:bg-amber-50 transition-all"
                  aria-label="Society Bulletins"
                  title="Society Bulletins"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    3
                  </span>
                </button>

                {showBulletinsDropdown && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-amber-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-900">Society Bulletins</span>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Real-time</span>
                    </div>
                    <div className="divide-y divide-slate-100 mt-2">
                      <div className="py-2.5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Annual General Meeting (AGM)</p>
                          <p className="text-[11px] text-slate-500">Sunday 10:00 AM • Clubhouse Hall</p>
                        </div>
                      </div>
                      <div className="py-2.5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Gate-1 Passcode Updated</p>
                          <p className="text-[11px] text-slate-500">Encrypted QR pass system synced.</p>
                        </div>
                      </div>
                      <div className="py-2.5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Droplets className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Overhead Tank Maintenance</p>
                          <p className="text-[11px] text-slate-500">Scheduled for Thursday 2 PM - 4 PM.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Login Button */}
              <button
                onClick={() => handleOpenLogin('resident')}
                className="btn-gold px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide flex items-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>

              {/* Direct Dashboard Entry Button */}
              <button
                onClick={() => handleDirectQuickLogin('resident')}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs shadow-md transition-all hover:scale-105"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-700 hover:text-amber-700"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-amber-200 px-6 py-5 space-y-4">
            <a href="#home" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-amber-700">Home</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-700">About System</a>
            <a href="#apartments" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-700">Apartment Directory</a>
            <a href="#suggestions" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-700">Suggestion Desk</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-700">Emergency & Contact</a>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={() => { setMobileMenuOpen(false); handleOpenLogin('resident'); }}
                className="w-full py-2.5 bg-gold-gradient text-white font-bold text-xs rounded-xl shadow-md"
              >
                Open Portal Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative pt-12 pb-20 md:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-7 text-left">
              
              {/* Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Modern Smart Living Platform</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                Connect Every Home. <br />
                <span className="text-gold-gradient">Simplify Every Society.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
                NivaraConnect brings residents, society management, and security personnel together into a single, elegant digital ecosystem with real-time gate pass verification, AI maintenance triage, and instant emergency alerts.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => handleDirectQuickLogin('resident')}
                  className="btn-gold px-7 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-amber-500/25 group"
                >
                  <span>Explore Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#suggestions"
                  className="btn-secondary-pearl px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-xs"
                >
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>Submit Inquiry</span>
                </a>
              </div>

              {/* Hero Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-amber-200/50 max-w-lg">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-700">428+</h3>
                  <p className="text-xs text-slate-500 font-medium">Residences Connected</p>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-700">99.9%</h3>
                  <p className="text-xs text-slate-500 font-medium">Security Audit Rate</p>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-700">24/7</h3>
                  <p className="text-xs text-slate-500 font-medium">SOS & Gate Sync</p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Society Hub Card */}
            <div className="lg:col-span-5 relative">
              
              {/* Main Glass Card */}
              <div className="glass-card rounded-3xl p-6 sm:p-7 relative z-10 shadow-2xl">
                <div className="flex items-center justify-between pb-5 border-b border-amber-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Live Society Hub</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Nivara Heights Enclave</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow-dot" />
                    <span>Active Gate Sync</span>
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-3 mt-5">
                  <div className="flex items-center gap-3.5 p-3.5 bg-white/90 rounded-2xl border border-amber-100 shadow-xs hover:border-amber-300 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-slate-900 truncate">Visitor Entry Approved</h5>
                      <p className="text-[11px] text-slate-500 truncate">Courier Delivery #802 • Tower A Gate</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Verified</span>
                  </div>

                  <div className="flex items-center gap-3.5 p-3.5 bg-white/90 rounded-2xl border border-amber-100 shadow-xs hover:border-amber-300 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-slate-900 truncate">Security Shift Verified</h5>
                      <p className="text-[11px] text-slate-500 truncate">Guard Desk #2 Active • Gate-A</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">On Duty</span>
                  </div>

                  <div className="flex items-center gap-3.5 p-3.5 bg-white/90 rounded-2xl border border-amber-100 shadow-xs hover:border-amber-300 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-slate-900 truncate">Maintenance Ticket Resolved</h5>
                      <p className="text-[11px] text-slate-500 truncate">Unit B-301 Plumbing Check</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">AI Triaged</span>
                  </div>
                </div>

                {/* Direct Role Portal Jump Buttons */}
                <div className="mt-6 pt-5 border-t border-amber-100 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleDirectQuickLogin('resident')}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-center transition-all group"
                  >
                    <p className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-amber-700">Resident</p>
                    <p className="text-xs font-black text-slate-800">Flat A-402</p>
                  </button>
                  <button
                    onClick={() => handleDirectQuickLogin('admin')}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-center transition-all group"
                  >
                    <p className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-amber-700">Secretary</p>
                    <p className="text-xs font-black text-slate-800">Admin Desk</p>
                  </button>
                  <button
                    onClick={() => handleDirectQuickLogin('security')}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-center transition-all group"
                  >
                    <p className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-amber-700">Security</p>
                    <p className="text-xs font-black text-slate-800">Gate #1</p>
                  </button>
                </div>
              </div>

              {/* Floating Badge 1: Instant Visitor Pass */}
              <div className="hidden sm:flex items-center gap-3 absolute -top-5 -right-5 z-20 bg-white/95 px-4 py-3 rounded-2xl shadow-xl border border-amber-200 animate-float-slow">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block text-xs font-bold text-slate-900">Instant Visitor Pass</strong>
                  <p className="text-[10px] text-slate-500">Encrypted QR Security</p>
                </div>
              </div>

              {/* Floating Badge 2: Emergency SOS */}
              <div 
                onClick={onOpenSos}
                className="hidden sm:flex items-center gap-3 absolute -bottom-5 -left-5 z-20 bg-white/95 px-4 py-3 rounded-2xl shadow-xl border border-rose-200 animate-float-delay cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <strong className="block text-xs font-bold text-rose-700">Emergency SOS</strong>
                  <p className="text-[10px] text-slate-500">1-Tap Security Alert</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* About Section & Features Grid */}
      <section id="about" className="py-20 bg-white/50 backdrop-blur-md border-y border-amber-200/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span>About NivaraConnect</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Crafted for Modern Community Excellence
          </h2>
          
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Replacing manual paper registers and fragmented WhatsApp groups with an integrated SaaS platform designed for speed, clarity, and security.
          </p>

          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
            
            {/* Feature 1: Admin */}
            <div className="glass-card glass-card-hover rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mb-6 shadow-xs">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">Society Administration</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Comprehensive dashboard for managing residents, publishing digital notices with real-time voting polls, tracking monthly dues, and generating invoices.
                </p>
              </div>
              <button
                onClick={() => handleDirectQuickLogin('admin')}
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800 group"
              >
                <span>Access Admin Console</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Feature 2: Resident Portal */}
            <div className="glass-card glass-card-hover rounded-3xl p-8 flex flex-col justify-between border-amber-400/40">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gold-gradient text-white flex items-center justify-center mb-6 shadow-md shadow-amber-500/20">
                  <Home className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">Resident Portal</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Pre-approve expected visitors with digital passcodes, raise AI-triaged maintenance tickets, book clubhouse facilities, and vote on community initiatives.
                </p>
              </div>
              <button
                onClick={() => handleDirectQuickLogin('resident')}
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800 group"
              >
                <span>Open Resident Hub</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Feature 3: Security Guard */}
            <div className="glass-card glass-card-hover rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center mb-6 shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2.5">Security & Gate Guard</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Streamlined gate terminal to verify visitor passcodes in seconds, record delivery personnel logs, inspect vehicles, and act instantly on resident SOS alerts.
                </p>
              </div>
              <button
                onClick={() => handleDirectQuickLogin('security')}
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800 group"
              >
                <span>Launch Guard Desk</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Apartment Directory Section */}
      <section id="apartments" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Apartment Directory</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Explore Our Residential Towers
          </h2>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
            Interactive directory detailing occupancy, floor plans, and amenities across towers.
          </p>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8 mb-12">
            <button
              onClick={() => setTowerFilter('all')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                towerFilter === 'all'
                  ? 'bg-gold-gradient text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/80 border border-amber-200 text-slate-600 hover:bg-amber-50'
              }`}
            >
              All Towers
            </button>
            <button
              onClick={() => setTowerFilter('tower-a')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                towerFilter === 'tower-a'
                  ? 'bg-gold-gradient text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/80 border border-amber-200 text-slate-600 hover:bg-amber-50'
              }`}
            >
              Tower A (Luxury)
            </button>
            <button
              onClick={() => setTowerFilter('tower-b')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                towerFilter === 'tower-b'
                  ? 'bg-gold-gradient text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/80 border border-amber-200 text-slate-600 hover:bg-amber-50'
              }`}
            >
              Tower B (Premium)
            </button>
            <button
              onClick={() => setTowerFilter('tower-c')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                towerFilter === 'tower-c'
                  ? 'bg-gold-gradient text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/80 border border-amber-200 text-slate-600 hover:bg-amber-50'
              }`}
            >
              Tower C (Executive)
            </button>
          </div>

          {/* Towers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {filteredTowers.map((tower) => (
              <div 
                key={tower.id}
                className={`glass-card rounded-3xl p-7 border ${tower.color} hover:shadow-xl transition-all hover:-translate-y-1.5 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{tower.tag}</span>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-extrabold rounded-full">
                      {tower.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2">{tower.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">{tower.description}</p>

                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/60 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Units</span>
                      <strong className="text-slate-800 font-bold">{tower.specs.units}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Floors</span>
                      <strong className="text-slate-800 font-bold">{tower.specs.floors}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Parking</span>
                      <strong className="text-slate-800 font-bold">{tower.specs.parking}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Elevators</span>
                      <strong className="text-slate-800 font-bold">{tower.specs.elevators}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDirectQuickLogin('resident')}
                  className="mt-6 w-full py-3 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <span>View Apartment Details</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Public Suggestion & Inquiry Desk */}
      <section id="suggestions" className="py-20 bg-white/60 backdrop-blur-md border-t border-amber-200/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-3xl p-8 sm:p-12 shadow-2xl border-amber-300/40">
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                <span>Resident & Visitor Voice</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Public Suggestion & Inquiry Desk
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Have feedback, questions about residency, or maintenance ideas? Submit directly without logging in.
              </p>
            </div>

            <form onSubmit={handleSuggestionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={sugName}
                    onChange={(e) => setSugName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email or Mobile</label>
                  <input
                    type="text"
                    value={sugContact}
                    onChange={(e) => setSugContact(e.target.value)}
                    placeholder="alex@domain.com or +91 98..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Inquiry Category</label>
                  <select
                    value={sugCategory}
                    onChange={(e) => setSugCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  >
                    <option value="General">General Inquiry</option>
                    <option value="Maintenance">Maintenance Suggestion</option>
                    <option value="Security">Security Feedback</option>
                    <option value="Amenity">Amenity Booking Question</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Apartment / Visitor Type</label>
                  <input
                    type="text"
                    value={sugApartment}
                    onChange={(e) => setSugApartment(e.target.value)}
                    placeholder="e.g. Resident Tower-A or Prospective Buyer"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Suggestion / Query *</label>
                <textarea
                  required
                  rows={4}
                  value={sugMessage}
                  onChange={(e) => setSugMessage(e.target.value)}
                  placeholder="Type your details or suggestion here..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="text-center pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingSug}
                  className="btn-gold px-8 py-3 rounded-2xl font-bold text-sm inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingSug ? 'Submitting...' : 'Submit Message'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer id="contact" className="bg-slate-900 text-slate-400 pt-16 pb-8 border-t-2 border-amber-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            
            {/* Brand Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center text-white font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xl font-extrabold text-white">Nivara<span className="text-amber-400">Connect</span></span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Empowering smart society living with modern digital communication, high-speed security verification, and resident management.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Navigation</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#home" className="hover:text-amber-400 transition-colors">Home</a></li>
                <li><a href="#about" className="hover:text-amber-400 transition-colors">About System</a></li>
                <li><a href="#apartments" className="hover:text-amber-400 transition-colors">Apartment Directory</a></li>
                <li><a href="#suggestions" className="hover:text-amber-400 transition-colors">Suggestions Desk</a></li>
              </ul>
            </div>

            {/* Role Portals */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Role Access</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button 
                    onClick={() => handleDirectQuickLogin('admin')} 
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Society Admin Portal
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleDirectQuickLogin('resident')} 
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Resident Dashboard
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleDirectQuickLogin('security')} 
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Security Guard Desk
                  </button>
                </li>
              </ul>
            </div>

            {/* Emergency & Contacts */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Emergency & Contact</h4>
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Gate Desk: +1 (800) 555-NIVARA</span>
                </p>
                <p className="flex items-center gap-2 text-rose-400 font-bold cursor-pointer" onClick={onOpenSos}>
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>SOS Hotline: 911 / Emergency</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>100 Sunrise Blvd, Smart Tech City</span>
                </p>
              </div>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 NivaraConnect. All Rights Reserved.</p>
            <p className="text-amber-500/80 font-medium">Sunrise Pearl White & Liquid Gold Premium Architecture</p>
          </div>
        </div>
      </footer>

      {/* Role Login Modal Popup */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl border border-amber-300 relative animate-in zoom-in-95">
            
            {/* Close Button */}
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Portal Login</h3>
              <p className="text-xs text-slate-500 mt-1">Select your registered role to log in securely.</p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedRole('resident')}
                className={`py-2 rounded-xl transition-all ${
                  selectedRole === 'resident' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Resident
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`py-2 rounded-xl transition-all ${
                  selectedRole === 'admin' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Secretary
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('security')}
                className={`py-2 rounded-xl transition-all ${
                  selectedRole === 'security' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Security
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email / Username</label>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter email or username"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword || '••••••••'}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {selectedRole === 'resident' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apartment / Unit No.</label>
                  <input
                    type="text"
                    value={apartmentUnit}
                    onChange={(e) => setApartmentUnit(e.target.value)}
                    placeholder="e.g. A-402"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              )}

              {selectedRole === 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Security Key</label>
                  <input
                    type="text"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="e.g. SEC-2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              )}

              {selectedRole === 'security' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guard Passcode / Badge #</label>
                  <input
                    type="text"
                    value={guardBadge}
                    onChange={(e) => setGuardBadge(e.target.value)}
                    placeholder="e.g. GUARD-01"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-gold-gradient text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <span>Access Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
