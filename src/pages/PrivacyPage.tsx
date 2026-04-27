import { ArrowLeft, Network, ShieldCheck, Database, Server, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export function PrivacyPage() {
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
        <h1 className="hero-title mb-2">Privacy Policy</h1>
        <p className="hero-sub mb-12">Effective Date: October 15, 2026</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card" style={{ padding: '32px' }}>
                <ShieldCheck className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    NetSight is designed with privacy-first principles. We collect technical metadata, diagnostic metrics, and network topology configurations. Because our Agent runs entirely within your localized environment, telemetry data is generated locally and sent exclusively to your designated backend server.
                </p>
            </div>
            
            <div className="glass-card" style={{ padding: '32px' }}>
                <Database className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">2. How Information is Used</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Collected telemetry is used strictly to power NetSight's predictive failure AI models and deliver real-time dashboards. We do not aggregate your network data for third-party advertising, nor do we sell or distribute network topologies or diagnostic histories to external vendors.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <Server className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">3. Data Retention & Deletion</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Time-series metrics and latency logs are retained within the MongoDB database connected to your backend deployment. You retain full ownership and control over this database. You may configure automated data purging policies within your deployment environment.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <UserCheck className="w-8 h-8 text-[#d4af37] mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">4. Authentication & Access</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Organization-level data is strictly isolated using JSON Web Tokens (JWT) and API Keys. It is your responsibility to safeguard the `MONGO_URI` and `JWT_SECRET` environment variables. Authorized agents require valid, uniquely generated tokens to transmit data.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
