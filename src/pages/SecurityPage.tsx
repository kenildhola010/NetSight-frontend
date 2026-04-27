import { ArrowLeft, Network, Shield, Lock, Server, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export function SecurityPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page-container">
      <nav>
        <div className="nav-logo cursor-pointer" onClick={() => navigate('/')}>
          <Network className="w-6 h-6 text-[#d4af37]" />
          <span className="nav-logo-text">NetSight</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="nav-link flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </nav>

      <div className="hero-outer" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        <h1 className="hero-title mb-2">Security & Trust</h1>
        <p className="hero-sub mb-12 border-b border-white/10 pb-6">
            We understand network observability depends on the root of trust. NetSight was built with an enterprise-first security approach ensuring all network monitoring metadata is continuously secured against data exfiltration.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card" style={{ padding: '32px' }}>
                <Shield className="w-8 h-8 text-[#d4af37] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Local Agent Architecture</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Unlike cloud-based scanners that require punching holes in your firewall, NetSight's discovery Agent runs entirely within your local boundary (on `localhost:9090`). The Agent securely pushes telemetry outward to your backend via WebSockets, eliminating inbound attack vectors.</p>
            </div>
            
            <div className="glass-card" style={{ padding: '32px' }}>
                <Lock className="w-8 h-8 text-[#d4af37] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">JWT & Key Authentication</h3>
                <p className="text-gray-400 text-sm leading-relaxed">All dashboard API requests are protected by cryptographically signed JSON Web Tokens (JWT). External Agents authenticate using unique, high-entropy API keys tied strictly to your organization's tenant context.</p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <Cpu className="w-8 h-8 text-[#d4af37] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Passive Footprinting</h3>
                <p className="text-gray-400 text-sm leading-relaxed">The Agent utilizes passive ARP table lookups, standard ICMP echoing, and targeted HTTP banner grabs to discover devices. We do not employ aggressive vulnerability exploitation or destructive scanning methodologies that could destabilize fragile infrastructure.</p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <Server className="w-8 h-8 text-[#d4af37] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Tenant Isolation</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Our backend architecture implements rigid data partitioning. Organizational boundaries prevent cross-tenant metadata traversal, locking topology datasets exclusively to authorized API keys and backend databases.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
