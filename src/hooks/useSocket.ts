import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import API_BASE from '../config/api';

// Derive WebSocket URL from API base (strip /api/v1)
const WS_URL = API_BASE.replace(/\/api\/v1$/, '');

interface LiveDevice {
  ip: string;
  status: string;
  latency: number;
  packetLoss: number;
  cpuUsage: number;
  memoryUsage: number;
  trafficIn: number;
  trafficOut: number;
  hostname?: string;
  type?: string;
  vendor?: string;
  mac?: string;
  isGateway?: boolean;
  openPorts?: number[];
  lastUpdated?: number;
}

interface LiveStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  avgLatency: number;
  uptimePercent: number;
  totalTrafficIn: number;
  totalTrafficOut: number;
}

interface UseLiveDataReturn {
  liveDevices: LiveDevice[];
  liveStats: LiveStats | null;
  connected: boolean;
  lastUpdate: Date;
}

/**
 * useSocket — Real-time WebSocket hook with HTTP fallback.
 * 
 * Primary: Connects to backend Socket.io, receives live:metrics pushes.
 * Fallback: If WebSocket fails, polls HTTP every 10s.
 * 
 * Works both locally and when hosted (Vercel frontend + hosted backend).
 */
export function useSocket(): UseLiveDataReturn {
  const [liveDevices, setLiveDevices] = useState<LiveDevice[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const socketRef = useRef<Socket | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsEverConnected = useRef(false);

  // Get user org from localStorage
  const getOrganization = useCallback(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed?.organization || parsed?.user?.organization || null;
      }
    } catch { }
    return null;
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        const token = parsed?.token || parsed?.tokens?.accessToken;
        if (token) return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      }
    } catch { }
    return { 'Content-Type': 'application/json' };
  }, []);

  // HTTP fallback fetch
  const fetchViaHTTP = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [statsRes, devicesRes] = await Promise.allSettled([
        fetch(`${API_BASE}/monitoring/dashboard`, { headers }),
        fetch(`${API_BASE}/monitoring/devices`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled') {
        const data = await statsRes.value.json();
        if (data?.success) setLiveStats(data.stats);
      }

      if (devicesRes.status === 'fulfilled') {
        const data = await devicesRes.value.json();
        if (data?.success) setLiveDevices(data.devices || []);
      }

      setLastUpdate(new Date());
    } catch {
      // Silently ignore — will retry
    }
  }, [getAuthHeaders]);

  // Start HTTP fallback polling
  const startFallback = useCallback(() => {
    if (fallbackTimerRef.current) return; // Already running
    console.log('[NetSight] WebSocket unavailable — using HTTP polling fallback');
    fetchViaHTTP(); // Immediate first fetch
    fallbackTimerRef.current = setInterval(fetchViaHTTP, 10000);
  }, [fetchViaHTTP]);

  // Stop HTTP fallback
  const stopFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const organization = getOrganization();

    // Connect WebSocket
    const socket = io(WS_URL, {
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
      timeout: 8000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      wsEverConnected.current = true;
      stopFallback(); // Kill HTTP polling when WS connects

      // Join org room to receive targeted broadcasts
      if (organization) {
        socket.emit('join:org', organization);
      }
    });

    socket.on('live:metrics', (data: { devices: LiveDevice[]; stats: LiveStats; timestamp: number }) => {
      if (data.devices) setLiveDevices(data.devices || []);
      if (data.stats) setLiveStats(data.stats);
      setLastUpdate(new Date(data.timestamp));
    });

    socket.on('live:devices', (data: { devices: LiveDevice[]; stats: LiveStats; timestamp: number }) => {
      if (data.devices) setLiveDevices(data.devices || []);
      if (data.stats) setLiveStats(data.stats);
      setLastUpdate(new Date(data.timestamp));
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
      // Start HTTP fallback after WebSocket fails
      startFallback();
    });

    // If WebSocket never connects within 5s, start HTTP fallback
    const fallbackTimeout = setTimeout(() => {
      if (!wsEverConnected.current) {
        startFallback();
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimeout);
      stopFallback();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [getOrganization, startFallback, stopFallback]);

  return { liveDevices, liveStats, connected, lastUpdate };
}
