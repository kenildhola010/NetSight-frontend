import API_BASE from "../config/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network, ArrowRight, AlertCircle } from "lucide-react";

export function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    organizationName: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(API_BASE + "/auth/register", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.adminName,
          email: formData.email,
          password: formData.password,
          organizationName: formData.organizationName,
          role: 'admin' // Defaulting to admin for signup
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Navigate to verify email page
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#d4af37] to-[#b8860b] p-12 flex-col justify-between">
        <div className="flex items-center gap-2 text-white">
          <Network className="w-8 h-8" />
          <span className="text-xl font-semibold">NetSight</span>
        </div>
        <div>
          <h2 className="text-white mb-4">
            Start monitoring your network in minutes
          </h2>
          <p className="text-yellow-100 text-lg leading-relaxed">
            Join thousands of network engineers who trust NetSight for complete network visibility and intelligent insights.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 text-white">
          <div>
            <div className="text-3xl font-semibold mb-1">99.9%</div>
            <div className="text-sm text-yellow-100">Uptime SLA</div>
          </div>
          <div>
            <div className="text-3xl font-semibold mb-1">500K+</div>
            <div className="text-sm text-yellow-100">Devices Monitored</div>
          </div>
          <div>
            <div className="text-3xl font-semibold mb-1">24/7</div>
            <div className="text-sm text-yellow-100">Support</div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 text-white mb-6">
              <Network className="w-8 h-8 text-[#d4af37]" />
              <span className="text-xl font-semibold">NetSight</span>
            </div>
            <h2 className="text-white mb-2">Create your account</h2>
            <p className="text-gray-400">Start your 14-day free trial. No credit card required.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-300 mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                id="organizationName"
                required
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="Acme Corporation"
              />
            </div>

            <div>
              <label htmlFor="adminName" className="block text-sm font-medium text-gray-300 mb-1.5">
                Admin Name
              </label>
              <input
                type="text"
                id="adminName"
                required
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="Create a strong password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#d4af37] hover:bg-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-sm text-gray-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-[#d4af37] hover:text-[#f59e0b] font-medium"
              >
                Sign in
              </button>
            </div>
          </form>

          <p className="mt-6 text-xs text-center text-gray-500">
            By creating an account, you agree to our{" "}
            <a href="#" className="text-[#d4af37] hover:text-[#f59e0b]">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-[#d4af37] hover:text-[#f59e0b]">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}