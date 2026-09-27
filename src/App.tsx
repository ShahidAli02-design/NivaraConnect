import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { WelcomeIntro } from './components/WelcomeIntro';
import { FluidCanvas } from './components/FluidCanvas';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { ResidentPortal } from './components/ResidentPortal';
import { SecurityGateDesk } from './components/SecurityGateDesk';
import { VisitorManagementView } from './components/VisitorManagementView';
import { ComplaintsView } from './components/ComplaintsView';
import { NoticesView } from './components/NoticesView';
import { BillingView } from './components/BillingView';
import { AmenitiesView } from './components/AmenitiesView';
import { DirectoryView } from './components/DirectoryView';
import { ParkingView } from './components/ParkingView';
import { ResidencyPassView } from './components/ResidencyPassView';
import { SOSModal } from './components/SOSModal';
import { VisitorApprovalModal } from './components/VisitorApprovalModal';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { Sparkles, Radio, Compass, Play } from 'lucide-react';
import { UserRole } from './types';

const PROTECTED_TABS = ['dashboard', 'resident', 'security', 'visitors', 'complaints', 'notices', 'billing', 'amenities', 'directory', 'parking', 'residency'];

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated, logoutUser } = useAuth();
  // Show the animated Intro screen first
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Guard: only authenticated (approved) accounts may view dashboard tabs.
  useEffect(() => {
    if (!isAuthenticated && PROTECTED_TABS.includes(currentTab)) {
      setCurrentTab('landing');
    }
  }, [isAuthenticated, currentTab]);

  const handleEnterDashboard = (role?: UserRole) => {
    const effectiveRole = role || currentUser.role;
    if (effectiveRole === 'admin') setCurrentTab('dashboard');
    else if (effectiveRole === 'security') setCurrentTab('security');
    else setCurrentTab('resident');
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'landing':
        return (
          <LandingPage
            onEnterDashboard={handleEnterDashboard}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenAi={() => setIsAiOpen(true)}
          />
        );
      case 'dashboard':
        return (
          <AdminDashboard
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenAi={() => setIsAiOpen(true)}
          />
        );
      case 'resident':
        return (
          <ResidentPortal
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenAi={() => setIsAiOpen(true)}
          />
        );
      case 'security':
        return <SecurityGateDesk onOpenSos={() => setIsSosOpen(true)} />;
      case 'visitors':
        return <VisitorManagementView />;
      case 'complaints':
        return <ComplaintsView />;
      case 'notices':
        return <NoticesView />;
      case 'billing':
        return <BillingView />;
      case 'amenities':
        return <AmenitiesView />;
      case 'directory':
        return <DirectoryView />;
      case 'parking':
        return <ParkingView />;
      case 'residency':
        return <ResidencyPassView />;
      default:
        return (
          <LandingPage
            onEnterDashboard={handleEnterDashboard}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenAi={() => setIsAiOpen(true)}
          />
        );
    }
  };

  // If initial intro is active, display the animated WelcomeIntro screen
  if (showIntro) {
    return <WelcomeIntro onContinue={() => setShowIntro(false)} />;
  }

  const isLanding = currentTab === 'landing';

  return (
    <div className="min-h-screen text-slate-800 font-sans antialiased flex flex-col relative selection:bg-amber-400 selection:text-slate-900 animate-in fade-in duration-500">
      
      {/* Global Sunrise Pearl White & Liquid Gold Dynamic Canvas */}
      <FluidCanvas />

      {/* When inside any Dashboard view, render the unified top Navbar with Public Portal toggle */}
      {!isLanding && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenSos={() => setIsSosOpen(true)}
          onOpenAi={() => setIsAiOpen(true)}
          onGoHome={() => setCurrentTab('landing')}
          onLogout={() => {
            logoutUser();
            setCurrentTab('landing');
          }}
        />
      )}

      {/* Main Canvas Area */}
      <main className={`flex-1 w-full ${isLanding ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16'}`}>
        {renderContent()}
      </main>

      {/* Global Realtime Modals & Drawers */}
      <SOSModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />
      <VisitorApprovalModal />
      <AiAssistantDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

      {/* Floating Bottom Action Buttons */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3">
        {/* Button to replay the Intro Animation */}
        <button
          onClick={() => setShowIntro(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-white/95 hover:bg-white text-slate-700 rounded-2xl shadow-lg border border-amber-300/80 text-xs font-bold transition-all hover:scale-105"
          title="Replay Welcome Intro"
        >
          <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
          <span className="hidden sm:inline">Intro</span>
        </button>

        {/* Toggle back to landing page if inside dashboard */}
        {!isLanding && (
          <button
            onClick={() => setCurrentTab('landing')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/95 hover:bg-white text-amber-800 rounded-2xl shadow-lg border border-amber-300 text-xs font-bold transition-all hover:scale-105"
            title="Return to Public Portal"
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Portal</span>
          </button>
        )}

        <button
          onClick={() => setIsAiOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/95 hover:bg-white text-slate-800 rounded-2xl shadow-xl shadow-amber-500/15 border border-amber-300/80 text-xs font-bold transition-all hover:scale-105 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Ask AI</span>
        </button>

        <button
          onClick={() => setIsSosOpen(true)}
          className="flex items-center justify-center w-11 h-11 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl shadow-xl shadow-rose-600/30 border border-rose-400/40 text-xs font-black transition-all hover:scale-105 cursor-pointer"
          title="Emergency Panic Alarm"
        >
          <Radio className="w-5 h-5 animate-pulse" />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AuthProvider>
  );
}
