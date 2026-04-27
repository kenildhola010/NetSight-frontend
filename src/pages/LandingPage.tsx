import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const W = 500, R = 210, cx = 250, cy = 250;
    let rot = 0;
    let animationFrameId: number;

    const cities = [
      [40.7, -74.0], [51.5, -0.1], [35.7, 139.7], [1.3, 103.8], [28.6, 77.2],
      [-33.9, 151.2], [48.8, 2.3], [-23.5, -46.6], [55.7, 37.6], [19.1, 72.9],
      [31.2, 121.5], [25.2, 55.3], [-1.3, 36.8], [41.0, 28.9], [37.6, -122.4]
    ];
    const conns = [
      [0, 2], [0, 6], [0, 14], [1, 6], [1, 8], [2, 3], [2, 10], [3, 9], [4, 9],
      [5, 2], [7, 0], [8, 1], [10, 3], [11, 3], [12, 1], [13, 6], [14, 0], [6, 11]
    ];
    const particles = conns.map(c => ({ conn: c, t: Math.random(), speed: 0.003 + Math.random() * 0.004 }));
    const continents = [
      [[49, -128], [25, -118], [15, -87], [29, -88], [44, -66], [60, -64], [70, -95], [70, -128]],
      [[10, -76], [-5, -36], [-55, -68], [-55, -78], [-14, -80]],
      [[35, -10], [35, 28], [60, 28], [60, 18], [54, 5], [44, -10]],
      [[35, -6], [35, 48], [-36, 26], [-35, 16], [4, -6]],
      [[10, 62], [10, 145], [72, 145], [72, 62]],
      [[-15, 113], [-15, 153], [-44, 149], [-44, 113]]
    ];

    function toXYZ(lat: number, lng: number, r: number) {
      const phi = (90 - lat) * Math.PI / 180, th = lng * Math.PI / 180;
      return { x: r * Math.sin(phi) * Math.cos(th), y: r * Math.cos(phi), z: r * Math.sin(phi) * Math.sin(th) };
    }
    function project(x: number, y: number, z: number, ry: number) {
      const c = Math.cos(ry), s = Math.sin(ry);
      return { sx: cx + x * c - z * s, sy: cy - y, z: x * s + z * c };
    }

    function draw(rotY: number) {
      if(!ctx) return;
      ctx.clearRect(0, 0, W, W);

      // Globe body — matching #0a0a0a / #111 palette
      const bg = ctx.createRadialGradient(cx - 50, cy - 50, 10, cx, cy, R);
      bg.addColorStop(0, '#1c1c1c'); bg.addColorStop(0.5, '#111111'); bg.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Grid lines — using exact border color #2a2a2a
      ctx.lineWidth = 0.5;
      for (let lat = -60; lat <= 60; lat += 30) {
        const phi = (90 - lat) * Math.PI / 180, r2 = R * Math.sin(phi), yy = cy - R * Math.cos(phi);
        ctx.strokeStyle = 'rgba(42,42,42,0.85)';
        ctx.beginPath(); ctx.ellipse(cx, yy, Math.abs(r2), Math.abs(r2 * 0.14), 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(42,42,42,0.6)';
      for (let lng = 0; lng < 180; lng += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 4) {
          const pt = toXYZ(lat, lng, R), pr = project(pt.x, pt.y, pt.z, rotY);
          lat === -90 ? ctx.moveTo(pr.sx, pr.sy) : ctx.lineTo(pr.sx, pr.sy);
        }
        ctx.stroke();
      }

      // Clip
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      // Continents — gold-tinted to match --gold: #d4af37
      ctx.fillStyle = 'rgba(212,175,55,0.07)'; ctx.strokeStyle = 'rgba(212,175,55,0.2)'; ctx.lineWidth = 0.7;
      continents.forEach(poly => {
        ctx.beginPath(); let moved = false;
        poly.forEach(([lat, lng]) => {
          const pt = toXYZ(lat, lng, R), pr = project(pt.x, pt.y, pt.z, rotY);
          if (pr.z < -5) return;
          if (!moved) { ctx.moveTo(pr.sx, pr.sy); moved = true; } else ctx.lineTo(pr.sx, pr.sy);
        });
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.restore();

      const proj = cities.map(([lat, lng]) => {
        const pt = toXYZ(lat, lng, R * 1.005);
        return project(pt.x, pt.y, pt.z, rotY);
      });

      // Arcs — gold
      conns.forEach(([a, b]) => {
        const pa = proj[a], pb = proj[b];
        if (Math.min(pa.z, pb.z) < -40) return;
        const al = Math.min(0.45, (Math.min(pa.z, pb.z) + R) / (2 * R) * 0.55);
        const mx = (pa.sx + pb.sx) / 2, my = (pa.sy + pb.sy) / 2;
        const dx = pb.sx - pa.sx, dy = pb.sy - pa.sy;
        ctx.save(); ctx.globalAlpha = al;
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 0.65; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy);
        ctx.quadraticCurveTo(mx - dy * 0.28, my + dx * 0.28, pb.sx, pb.sy);
        ctx.stroke(); ctx.restore();
      });

      // Particles — gold glow
      particles.forEach(p => {
        const [a, b] = p.conn, pa = proj[a], pb = proj[b];
        if (Math.min(pa.z, pb.z) < -40) return;
        const t = p.t, mx = (pa.sx + pb.sx) / 2, my = (pa.sy + pb.sy) / 2;
        const dx = pb.sx - pa.sx, dy = pb.sy - pa.sy;
        const cpx = mx - dy * 0.28, cpy = my + dx * 0.28;
        const qx = (1 - t) * (1 - t) * pa.sx + 2 * (1 - t) * t * cpx + t * t * pb.sx;
        const qy = (1 - t) * (1 - t) * pa.sy + 2 * (1 - t) * t * cpy + t * t * pb.sy;
        const al = ((Math.min(pa.z, pb.z) + R) / (2 * R)) * 0.9;
        ctx.save(); ctx.globalAlpha = al;
        const pg = ctx.createRadialGradient(qx, qy, 0, qx, qy, 5);
        pg.addColorStop(0, '#d4af37'); pg.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(qx, qy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        p.t = (p.t + p.speed) % 1;
      });

      // Nodes — gold
      proj.forEach(p => {
        if (p.z < -40) return;
        const a = (p.z + R) / (2 * R), front = p.z > 0;
        ctx.save(); ctx.globalAlpha = a;
        const ng = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, 9);
        ng.addColorStop(0, front ? 'rgba(212,175,55,0.5)' : 'rgba(212,175,55,0.12)');
        ng.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(p.sx, p.sy, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = front ? '#d4af37' : '#6b5015';
        ctx.beginPath(); ctx.arc(p.sx, p.sy, front ? 3.5 : 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Rim glow
      const rim = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R);
      rim.addColorStop(0, 'rgba(212,175,55,0)'); rim.addColorStop(1, 'rgba(212,175,55,0.08)');
      ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Shine
      const shine = ctx.createRadialGradient(cx - 60, cy - 60, 0, cx - 40, cy - 40, 120);
      shine.addColorStop(0, 'rgba(255,255,255,0.05)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }

    function loop() { 
      rot += 0.0025; 
      draw(rot); 
      animationFrameId = requestAnimationFrame(loop); 
    }
    
    loop();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleScrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page-container">
      {/* ══ NAV ══ */}
      <nav>
        <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12.5" stroke="#d4af37" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="4.5" fill="#d4af37" />
            <path d="M14 1.5Q20 7 23 14Q20 21 14 26.5Q8 21 5 14Q8 7 14 1.5Z" stroke="#d4af37" strokeWidth="0.6" fill="none" opacity="0.45" />
            <ellipse cx="14" cy="14" rx="12.5" ry="5" stroke="#d4af37" strokeWidth="0.6" fill="none" opacity="0.45" />
            <line x1="1.5" y1="14" x2="26.5" y2="14" stroke="#d4af37" strokeWidth="0.6" opacity="0.45" />
          </svg>
          <span className="nav-logo-text">NetSight</span>
        </a>
        <div className="nav-links">
          <button className="nav-link" onClick={() => handleScrollTo('features')}>Features</button>
          <button className="nav-link" onClick={() => handleScrollTo('pricing')}>Pricing</button>
          <button className="nav-link" onClick={() => navigate('/docs')}>Documentation</button>
          <button className="nav-link" onClick={() => navigate('/login')}>Login</button>
          <button className="nav-cta" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div className="hero-outer">
        <div className="hero">
          <div className="hero-content">
            <div className="hero-badge">
              <div className="hero-badge-dot"></div>
              <span className="hero-badge-text">AI-Powered Network Observability</span>
            </div>
            <h1 className="hero-title">Complete Network<br />Visibility.<br />Intelligent Insights.</h1>
            <p className="hero-sub">
              NetSight automatically discovers your network devices, visualizes topology in real-time,
              monitors health metrics, and predicts failures before they impact your business.
            </p>
            <div className="hero-btns">
              <button className="btn-primary" onClick={() => navigate('/signup')}>
                Start Free Trial
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </button>
              <button className="btn-outline" onClick={() => handleScrollTo('features')}>View Demo</button>
            </div>
            <p className="hero-note">No credit card required · 14-day free trial · Cancel anytime</p>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="stat-num">50k+</div>
                <div className="stat-lbl">Devices monitored</div>
              </div>
              <div className="hero-stat">
                <div className="stat-num">99.9%</div>
                <div className="stat-lbl">Uptime SLA</div>
              </div>
              <div className="hero-stat">
                <div className="stat-num">&lt;2ms</div>
                <div className="stat-lbl">Alert latency</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="globe-wrap">
              <div className="globe-ring"></div>
              <canvas id="globe" ref={canvasRef} width="500" height="500"></canvas>
              <div className="fn fn1"><div className="fn-dot green"></div>NYC-Core-01 · Online</div>
              <div className="fn fn2"><div className="fn-dot amber"></div>LON-Edge-03 · High Load</div>
              <div className="fn fn3"><div className="fn-dot green"></div>TYO-Switch-07 · Online</div>
              <div className="fn fn4"><div className="fn-dot red"></div>SGP-Router-02 · Alert</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FEATURES ══ */}
      <section id="features" className="features-sec">
        <div className="wrap">
          <p className="sec-lbl">Capabilities</p>
          <h2 className="sec-title">Everything you need for network observability</h2>
          <p className="sec-sub">From automatic discovery to AI-driven predictions — a complete toolkit for modern IT teams.</p>
          <div className="feat-grid">
            <div className="feat-card">
              <div className="feat-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg></div>
              <div className="feat-title">Auto Discovery</div>
              <p className="feat-desc">Automatically detect and map all devices on your network in seconds. Zero manual configuration required.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div>
              <div className="feat-title">Topology Map</div>
              <p className="feat-desc">Interactive visual representation of your entire network infrastructure with real-time status overlays.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></div>
              <div className="feat-title">Smart Alerts</div>
              <p className="feat-desc">Real-time notifications for critical network events and anomalies, with intelligent noise filtering.</p>
            </div>
            <div className="feat-card">
              <div className="feat-icon"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg></div>
              <div className="feat-title">AI Prediction</div>
              <p className="feat-desc">Machine learning models predict device failures before they occur, giving you time to act proactively.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="how-sec">
        <div className="wrap">
          <p className="sec-lbl">Process</p>
          <h2 className="sec-title">How It Works</h2>
          <div className="how-steps">
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-title">Connect &amp; Scan</div>
              <p className="step-desc">Define your network range and let NetSight discover all connected devices automatically using SNMP, ICMP, and agent-based methods.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-title">Visualize &amp; Monitor</div>
              <p className="step-desc">View your network topology, track performance metrics in real-time, and receive intelligent alerts when thresholds are breached.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-title">Predict &amp; Optimize</div>
              <p className="step-desc">Leverage AI insights to predict failures and optimize network performance proactively across your entire infrastructure.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECURITY ══ */}
      <section className="sec-sec">
        <div className="wrap">
          <h2 className="sec-title">Enterprise-Grade Security &amp; Technology</h2>
          <div className="sec-grid">
            <div className="sec-card">
              <div className="sec-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
              <div className="sec-title">SOC 2 Compliant</div>
              <p className="sec-desc">Enterprise-grade security and compliance standards, audited annually by independent third parties.</p>
            </div>
            <div className="sec-card">
              <div className="sec-icon"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></div>
              <div className="sec-title">End-to-End Encryption</div>
              <p className="sec-desc">All data encrypted in transit with TLS 1.3 and at rest with AES-256. Zero-knowledge architecture.</p>
            </div>
            <div className="sec-card">
              <div className="sec-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
              <div className="sec-title">99.9% Uptime SLA</div>
              <p className="sec-desc">Reliable monitoring you can count on, backed by a financially guaranteed service level agreement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="pricing-sec">
        <div className="wrap">
          <p className="sec-lbl">Pricing</p>
          <h2 className="sec-title">Transparent, straight-forward pricing</h2>
          <p className="sec-sub">Choose the perfect plan for your network size. All plans include auto-discovery and core observability features.</p>
          <div className="pricing-grid">

            <div className="price-card">
              <div className="price-name">Starter</div>
              <div className="price-desc">Perfect for small home labs or testing.</div>
              <div className="price-amount"><span className="price-num">$0</span><span className="price-period">forever</span></div>
              <button className="price-btn btn-def" onClick={() => navigate('/signup')}>Get Started</button>
              <div className="price-feats">
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Up to 50 devices</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Basic topology map</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>24h data retention</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Community support</div>
              </div>
            </div>

            <div className="price-card popular">
              <div className="popular-badge">Most Popular</div>
              <div className="price-name">Professional</div>
              <div className="price-desc">For medium businesses needing advanced features.</div>
              <div className="price-amount"><span className="price-num">$99</span><span className="price-period">/month</span></div>
              <button className="price-btn btn-gold" onClick={() => navigate('/signup')}>Start Free Trial</button>
              <div className="price-feats">
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Up to 500 devices</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Advanced topology &amp; alerts</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>30-day data retention</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>AI Prediction insights</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Email support</div>
              </div>
            </div>

            <div className="price-card">
              <div className="price-name">Enterprise</div>
              <div className="price-desc">Full-scale observability for large organizations.</div>
              <div className="price-amount"><span className="price-num">Custom</span></div>
              <button className="price-btn btn-def" onClick={() => navigate('/contact')}>Contact Sales</button>
              <div className="price-feats">
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Unlimited devices</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Multi-site topology</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Unlimited data retention</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Custom integrations</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>24/7 dedicated support</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer>
        <div className="foot-inner">
          <div className="foot-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="12.5" stroke="#d4af37" strokeWidth="1.5" />
                  <circle cx="14" cy="14" r="4.5" fill="#d4af37" />
                  <path d="M14 1.5Q20 7 23 14Q20 21 14 26.5Q8 21 5 14Q8 7 14 1.5Z" stroke="#d4af37" strokeWidth="0.6" fill="none" opacity="0.45" />
                  <ellipse cx="14" cy="14" rx="12.5" ry="5" stroke="#d4af37" strokeWidth="0.6" fill="none" opacity="0.45" />
                  <line x1="1.5" y1="14" x2="26.5" y2="14" stroke="#d4af37" strokeWidth="0.6" opacity="0.45" />
                </svg>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-white)' }}>NetSight</span>
              </div>
              <p className="foot-brand-desc">Professional network monitoring and observability platform for modern IT teams.</p>
            </div>
            <div className="foot-col">
              <h5>Product</h5>
              <button onClick={() => handleScrollTo('features')}>Features</button>
              <button onClick={() => handleScrollTo('pricing')}>Pricing</button>
              <button onClick={() => navigate('/docs')}>Documentation</button>
            </div>
            <div className="foot-col">
              <h5>Company</h5>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>About</button>
              <button onClick={() => navigate('/contact')}>Contact</button>
            </div>
            <div className="foot-col">
              <h5>Legal</h5>
              <button onClick={() => navigate('/privacy')}>Privacy</button>
              <button onClick={() => navigate('/terms')}>Terms</button>
              <button onClick={() => navigate('/security')}>Security</button>
            </div>
          </div>
          <div className="foot-bottom">
            <span className="foot-copy">© 2026 NetSight. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}