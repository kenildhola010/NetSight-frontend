import { ArrowLeft, Network, Scale, FileSignature, AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export function TermsPage() {
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
        <h1 className="hero-title mb-2">Terms of Service</h1>
        <p className="hero-sub mb-12">Effective Date: October 15, 2026</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card" style={{ padding: '32px' }}>
                <Scale className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    By installing the NetSight Agent and accessing the NetSight observability dashboard ("the Service"), you agree to be bound by these Terms. If you do not accept these terms, you must uninstall the Agent and cease using the service immediately.
                </p>
            </div>
            
            <div className="glass-card" style={{ padding: '32px' }}>
                <FileSignature className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">2. Service Provision</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    NetSight provides an enterprise software solution encompassing a React frontend, Node.js backend, and local Node.js discovery Agent. The platform offers network observability, diagnostic polling, and AI-assisted predictions based on locally gathered telemetry.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <AlertTriangle className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">3. Authorized Scanning</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    You explicitly agree to run the NetSight Agent ONLY on subnets, hardware, and infrastructure that you legally own or are authorized to monitor. Running unauthorized ARP sweeps or ICMP pings against external or unowned networks constitutes a direct violation of these terms.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <XCircle className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">4. Limitation of Liability</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    The Service is provided "as is". We make no warranties regarding uninterrupted availability. Our AI-driven predictive warnings are probabilistic estimations and should not be solely relied upon for critical infrastructure safety. We are not liable for network downtime or misconfigurations.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
