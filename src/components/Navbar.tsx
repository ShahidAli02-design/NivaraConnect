import React, { useState, useRef, useEffect } from 'react';
import {
  Building2, ShieldAlert, Sparkles, Wifi, WifiOff,
  ChevronDown, UserCheck, Shield, Home, Bell, Users,
  FileText, Wrench, CreditCard, Calendar, ArrowLeft,
  Globe, Radio, LogOut, ParkingSquare, Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateAvatar } from '../utils/avatar';
import { useRealtime } from '../context/RealtimeContext';

interface NavbarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onOpenSos: () => void;
  onOpenAi: () => void;
  onGoHome?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeTab,
  setActiveTab,
  onOpenSos,
  onOpenAi,
  onGoHome,
  onLogout
}) => {
  const { currentUser } = useAuth();
  const { isConnected, notifications } = useRealtime();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const selectedTab = currentTab || activeTab || 'dashboard';
  const handleSelect = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    if (setActiveTab) setActiveTab(tab);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Secretary</span>;
      case 'security':
        return <span className="bg-amber-500/10 text-amber-700 border border-amber-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Gate Guard</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Flat {currentUser.apartmentId}</span>;
    }
  };

  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [selectedTab]);

  const navTabs = [
    { 
      id: currentUser.role === 'admin' ? 'dashboard' : currentUser.role === 'security' ? 'security' : 'resident', 
      label: currentUser.role === 'admin' ? 'Secretary Hub' : currentUser.role === 'security' ? 'Gate Terminal' : 'Resident Portal', 
      icon: Home 
    },
    { id: 'visitors', label: 'Visitors & Passes', icon: UserCheck },
    { id: 'complaints', label: 'Tickets & AI', icon: Wrench },
    { id: 'notices', label: 'Notices & Polls', icon: FileText },
    { id: 'billing', label: 'Dues & Bills', icon: CreditCard },
    { id: 'amenities', label: 'Amenities', icon: Calendar },
    { id: 'directory', label: 'Staff & Directory', icon: Users },
    { id: 'parking', label: 'Live Parking', icon: ParkingSquare },
    { id: 'residency', label: 'Residency Pass', icon: Crown },
  ];

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-amber-200/60 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Brand & Home Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onGoHome}
              title="Return to Public Portal"
              className="flex items-center gap-2.5 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-gold-gradient text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20 transform -rotate-3 group-hover:rotate-0 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-base tracking-tight">Nivara<span className="text-amber-600">Connect</span></span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 hidden 2xl:inline-block">
                    Smart Society
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden 2xl:block">Sunrise Heights • PRPCEM</p>
              </div>
            </button>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav
            ref={navRef}
            onWheel={(e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY; }}
            className="hidden lg:flex flex-1 min-w-0 mx-4 items-center gap-1 bg-amber-50/70 p-1.5 rounded-2xl border border-amber-200/70 shadow-xs overflow-x-auto nav-scroll"
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id || (tab.id === 'dashboard' && selectedTab === 'overview');
              return (
                <button
                  key={tab.id}
                  data-active={isActive}
                  onClick={() => handleSelect(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-gold-gradient text-white shadow-sm shadow-amber-500/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-amber-700'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Profile Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            
            {/* Live SSE Pulse */}
            <div 
              title={isConnected ? 'Connected to Real-time Society Stream' : 'Reconnecting...'}
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-amber-200 text-[11px] font-bold text-slate-700 shadow-xs"
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 pulse-glow-dot' : 'bg-amber-500'}`} />
              <span className="font-mono text-[10px] text-amber-700">{isConnected ? 'LIVE SYNC' : 'CONNECTING'}</span>
            </div>

            {/* AI Assistant Trigger */}
            <button
              id="ai-assistant-button"
              onClick={onOpenAi}
              className="flex items-center gap-1.5 px-3 py-2 bg-gold-gradient text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-100" />
              <span className="hidden 2xl:inline">Ask AI</span>
            </button>

            {/* High Priority SOS Button */}
            <button
              id="header-sos-button"
              onClick={onOpenSos}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md shadow-rose-600/30 animate-pulse active:scale-95 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>SOS</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 text-slate-600 hover:text-amber-700 rounded-xl bg-white border border-amber-200 hover:bg-amber-50 relative transition-all shadow-xs"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-amber-200 p-4 z-50 animate-in fade-in zoom-in-95 text-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Activity Feed</span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">{notifications.length} new</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 font-medium">No new alerts yet</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="py-2.5 text-xs">
                          <div className="font-bold text-slate-800">{n.title}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">{n.timestamp}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Role & Profile Switcher */}
            <div className="relative">
              <button
                id="role-switcher-button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-2xl border border-amber-200 bg-white hover:bg-amber-50/80 transition-all text-left shadow-xs cursor-pointer"
              >
                <img
                  src={currentUser.avatarUrl || generateAvatar(currentUser.name)}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-xl object-cover ring-1 ring-amber-300"
                />
                <div className="hidden 2xl:block pr-1">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize mt-0.5">{getRoleBadge(currentUser.role)}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-amber-200 p-3 z-50 animate-in fade-in zoom-in-95 text-slate-800">
                  <div className="px-3 py-2 border-b border-amber-100 flex items-center gap-2.5">
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-amber-200" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all text-rose-700 hover:bg-rose-50 font-bold text-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2.5 border-t border-amber-100 no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gold-gradient text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-amber-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
