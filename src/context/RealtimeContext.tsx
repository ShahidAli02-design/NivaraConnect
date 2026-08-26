import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeEvent, Visitor, SOSAlert, Notice } from '../types';
import { useAuth } from './AuthContext';

interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'sos';
  title: string;
  message: string;
  timestamp: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  incomingVisitor: Visitor | null;
  setIncomingVisitor: (v: Visitor | null) => void;
  activeSosAlert: SOSAlert | null;
  dismissSosBanner: () => void;
  notifications: ToastNotification[];
  dismissNotification: (id: string) => void;
  playSiren: () => void;
  triggerSound: (type: 'beep' | 'success' | 'alert') => void;
  refreshTrigger: number;
  triggerManualRefresh: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  incomingVisitor: null,
  setIncomingVisitor: () => {},
  activeSosAlert: null,
  dismissSosBanner: () => {},
  notifications: [],
  dismissNotification: () => {},
  playSiren: () => {},
  triggerSound: () => {},
  refreshTrigger: 0,
  triggerManualRefresh: () => {},
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [incomingVisitor, setIncomingVisitor] = useState<Visitor | null>(null);
  const [activeSosAlert, setActiveSosAlert] = useState<SOSAlert | null>(null);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const triggerManualRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Web Audio Synth for Alerts & Sirens
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playSiren = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.3);
      osc.frequency.linearRampToValueAtTime(440, now + 0.6);
      osc.frequency.linearRampToValueAtTime(880, now + 0.9);
      osc.frequency.linearRampToValueAtTime(440, now + 1.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch (e) {
      console.warn('Audio feedback not supported', e);
    }
  }, []);

  const triggerSound = useCallback((type: 'beep' | 'success' | 'alert') => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'alert') {
        playSiren();
      }
    } catch (e) {
      // ignore
    }
  }, [playSiren]);

  const addNotification = (notif: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastNotification = {
      ...notif,
      id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setNotifications(prev => [newToast, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(t => t.id !== id));
  };

  const dismissSosBanner = () => {
    setActiveSosAlert(null);
  };

  // SSE Stream Listener
  useEffect(() => {
    const aptQuery = currentUser.apartmentId ? `?apartmentId=${currentUser.apartmentId}` : '';
    const eventSource = new EventSource(`/api/realtime/stream${aptQuery}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: RealtimeEvent = JSON.parse(event.data);
        triggerManualRefresh();

        // 1. Visitor Arrival
        if (data.type === 'VISITOR_ARRIVAL') {
          const visitor = data.payload as Visitor;
          triggerSound('beep');
          
          if (currentUser.role === 'resident' && currentUser.apartmentId === visitor.apartmentId) {
            if (visitor.status === 'Waiting Approval') {
              setIncomingVisitor(visitor);
            }
            addNotification({
              type: 'info',
              title: 'Visitor at Main Gate',
              message: `${visitor.name} (${visitor.visitorType}) is requesting entry to Flat ${visitor.apartmentId}`,
            });
          } else if (currentUser.role === 'admin' || currentUser.role === 'security') {
            addNotification({
              type: 'info',
              title: 'Gate Entry Logged',
              message: `${visitor.name} heading to Flat ${visitor.apartmentId}`,
            });
          }
        }

        // 2. Visitor Status Change
        if (data.type === 'VISITOR_STATUS_CHANGE') {
          const visitor = data.payload as Visitor;
          if (visitor.apartmentId === currentUser.apartmentId || currentUser.role !== 'resident') {
            addNotification({
              type: 'success',
              title: 'Visitor Status Update',
              message: `${visitor.name}'s pass status is now "${visitor.status}".`,
            });
          }
        }

        // 3. SOS Triggered
        if (data.type === 'SOS_TRIGGERED') {
          const sos = data.payload as SOSAlert;
          setActiveSosAlert(sos);
          playSiren();
          addNotification({
            type: 'sos',
            title: `EMERGENCY SOS: Flat ${sos.apartmentId}`,
            message: `${sos.category} triggered by ${sos.triggeredByName}! Security guards dispatched.`,
          });
        }

        // 4. SOS Updated / Resolved
        if (data.type === 'SOS_UPDATED') {
          const sos = data.payload as SOSAlert;
          if (sos.status === 'RESOLVED') {
            setActiveSosAlert(null);
            addNotification({
              type: 'success',
              title: `SOS Resolved: Flat ${sos.apartmentId}`,
              message: `Emergency attended & resolved: ${sos.resolutionRemarks || 'All clear.'}`,
            });
          }
        }

        // 5. New Notice
        if (data.type === 'NEW_NOTICE') {
          const notice = data.payload as Notice;
          addNotification({
            type: 'info',
            title: `New Society Notice: ${notice.priority}`,
            message: notice.title,
          });
        }

        // 6. Complaint Created or Updated
        if (data.type === 'COMPLAINT_CREATED' || data.type === 'COMPLAINT_UPDATED') {
          // just refreshes dashboard
        }
      } catch (e) {
        console.error('Error handling SSE payload:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser.id, currentUser.apartmentId, currentUser.role, triggerManualRefresh, triggerSound, playSiren]);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        incomingVisitor,
        setIncomingVisitor,
        activeSosAlert,
        dismissSosBanner,
        notifications,
        dismissNotification,
        playSiren,
        triggerSound,
        refreshTrigger,
        triggerManualRefresh,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
