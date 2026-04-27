import React, { useState, useEffect } from 'react';

const NetworkDashboard = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchDevices = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/devices');
            if (!response.ok) throw new Error('Failed to fetch devices');
            const data = await response.json();
            setDevices(data);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleDiscover = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/api/network/discover', {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Discovery failed');
            await fetchDevices(); // Refresh list after discovery
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        NetSight Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Monitor and manage your network infrastructure</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={handleDiscover}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            Scanning Network...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            Find Network
                        </>
                    )}
                </button>
            </header>

            {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {devices.map((device) => (
                    <div key={device._id} className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{device.hostname}</h3>
                                <code style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{device.ipAddress}</code>
                            </div>
                            <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor:
                                    device.status === 'HEALTHY' ? 'rgba(34, 197, 94, 0.1)' :
                                        device.status === 'WARNING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color:
                                    device.status === 'HEALTHY' ? 'var(--success)' :
                                        device.status === 'WARNING' ? 'var(--warning)' : 'var(--danger)',
                                border: `1px solid ${device.status === 'HEALTHY' ? 'rgba(34, 197, 94, 0.2)' :
                                    device.status === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                                    }`
                            }}>
                                {device.status}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Device Type</div>
                                <div style={{ fontWeight: 500 }}>{device.deviceType}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Last Seen</div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                    {new Date(device.lastSeen).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default NetworkDashboard;
