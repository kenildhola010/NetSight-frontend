import { ArrowLeft, Network, Mail, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export function ContactPage() {
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
        <h1 className="hero-title mb-2">Contact Us</h1>
        <p className="hero-sub mb-12">
            Whether you are inquiring about our enterprise network intelligence models, require architectural support, or wish to report a security vulnerability, our team is ready to assist you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Leadership Box */}
            <div className="glass-card" style={{ padding: '40px' }}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-[#d4af37]/10 rounded-lg">
                        <Users className="w-6 h-6 text-[#d4af37]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Leadership</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg text-white font-bold mb-1">Harshvardhansinh Sarvaiya</h4>
                        <p className="text-sm text-[#d4af37] font-medium mb-2">Founder & Chief Executive Officer</p>
                        <p className="text-sm text-gray-400 leading-relaxed">Driving the corporate vision, strategic growth, and overall enterprise direction of NetSight.</p>
                    </div>
                    <div>
                        <h4 className="text-lg text-white font-bold mb-1">Vivek Savaliya</h4>
                        <p className="text-sm text-[#d4af37] font-medium mb-2">Co-Founder & Chief Executive Officer</p>
                        <p className="text-sm text-gray-400 leading-relaxed">Sharing executive leadership to drive operational strategy, business development, and scaling NetSight's market presence.</p>
                    </div>
                    <div>
                        <h4 className="text-lg text-white font-bold mb-1">Kenil Dhola</h4>
                        <p className="text-sm text-[#d4af37] font-medium mb-2">Chief Technology Officer</p>
                        <p className="text-sm text-gray-400 leading-relaxed">Leading core engineering, architecting the scalable backend infrastructure, and overseeing AI/telemetry systems.</p>
                    </div>
                    <div>
                        <h4 className="text-lg text-white font-bold mb-1">Hardik Vachhani</h4>
                        <p className="text-sm text-[#d4af37] font-medium mb-2">Head of Platform Design</p>
                        <p className="text-sm text-gray-400 leading-relaxed">Architecting the intuitive UI/UX workflows, 3D topologies, and real-time dashboard experiences.</p>
                    </div>
                </div>
            </div>

            {/* General Contact Info */}
            <div className="space-y-8">
                <div className="glass-card flex items-start gap-4 hover:border-[#d4af37]/50 transition-colors" style={{ padding: '32px' }}>
                    <Mail className="w-6 h-6 text-[#d4af37] shrink-0 mt-1" />
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Enterprise Support</h3>
                        <p className="text-gray-400 text-sm mb-4 leading-relaxed">For deployment assistance, tenant provisioning, API key troubleshooting, and general inquiries.</p>
                        <a href="mailto:hkrana992@gmail.com?subject=NetSight%20Enterprise%20Enquiry" className="text-[#d4af37] hover:text-white transition-colors font-medium">hkrana992@gmail.com</a>
                    </div>
                </div>

                <div className="glass-card flex items-start gap-4 hover:border-[#d4af37]/50 transition-colors" style={{ padding: '32px' }}>
                    <MapPin className="w-6 h-6 text-[#d4af37] shrink-0 mt-1" />
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Global Headquarters</h3>
                        <p className="text-gray-400 text-sm mb-4 leading-relaxed">If you are sending legal documentation or formal vendor assessments, please direct correspondence to our enterprise address.</p>
                        <address className="not-italic text-gray-300 text-sm leading-relaxed">
                            NetSight Technologies Inc.<br />
                            Gift City SEZ<br />
                            Gandhinagar, Gujarat<br />
                            India
                        </address>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
