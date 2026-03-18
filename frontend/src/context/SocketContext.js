import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket]               = useState(null);
  const [onlineCount, setOnlineCount]     = useState(0);
  const [liveAlerts, setLiveAlerts]       = useState([]);
  const [communityMessages, setCommunityMessages] = useState([]);
  const alertsRef = useRef(liveAlerts);
  alertsRef.current = liveAlerts;

  useEffect(() => {
    if (!token) {
      if (socket) { socket.disconnect(); setSocket(null); }
      return;
    }

    const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['polling', 'websocket'], // polling first — avoids WS closed warning
      upgrade: true,                         // then upgrades to websocket automatically
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    s.on('connect', () => {
      console.log('✅ Socket connected:', s.id);
      s.emit('join_community');
    });

    s.on('online_count', (count) => setOnlineCount(count));

    s.on('new_incident', ({ incident, message }) => {
      const alert = {
        id: Date.now(),
        type: 'incident',
        message,
        incident,
        timestamp: new Date(),
      };
      setLiveAlerts((prev) => [alert, ...prev].slice(0, 20));
    });

    s.on('sos_alert', (data) => {
      const alert = {
        id: Date.now(),
        type: 'sos',
        message: `🚨 SOS from ${data.userName} — ${data.location?.address || 'Location being tracked'}`,
        data,
        timestamp: new Date(),
      };
      setLiveAlerts((prev) => [alert, ...prev].slice(0, 20));
    });

    s.on('incident_verified', (data) => {
      const alert = {
        id: Date.now(),
        type: 'verified',
        message: `✅ Incident verified: ${data.type} near ${data.location}`,
        data,
        timestamp: new Date(),
      };
      setLiveAlerts((prev) => [alert, ...prev].slice(0, 20));
    });

    s.on('new_message', (msg) => {
      setCommunityMessages((prev) => [...prev, msg].slice(-100));
    });

    s.on('disconnect', () => console.log('⚠️ Socket disconnected'));
    s.on('connect_error', (err) => console.error('Socket error:', err.message));

    setSocket(s);
    return () => { s.disconnect(); };
    // eslint-disable-next-line
  }, [token]);

  const sendMessage = (text, isAnonymous = false) => {
    if (socket) socket.emit('send_message', { text, isAnonymous });
  };

  const shareLocation = (coords) => {
    if (socket) socket.emit('share_location', coords);
  };

  const clearAlert = (id) => {
    setLiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <SocketContext.Provider value={{
      socket, onlineCount, liveAlerts, communityMessages,
      sendMessage, shareLocation, clearAlert,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};