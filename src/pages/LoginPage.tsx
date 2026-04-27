import API_BASE from "../config/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network, ArrowRight, AlertCircle } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(API_BASE + "/auth/login", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store user session
      localStorage.setItem('user', JSON.stringify(data));

      // Navigate based on setup status
      if (data.user?.setupCompleted) {
        navigate('/app');
      } else {
        navigate('/setup');
      }
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
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white cursor-pointer hover:opacity-80 transition-opacity w-fit"
        >
          <Network className="w-8 h-8" />
          <span className="text-xl font-semibold">NetSight</span>
        </div>
        <div>
          <h2 className="text-white mb-4">
            Welcome back to NetSight
          </h2>
          <p className="text-yellow-100 text-lg leading-relaxed">
            Continue monitoring your network infrastructure with real-time insights and intelligent analytics.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-yellow-700 rounded-lg flex items-center justify-center">✓</div>
            <div>
              <div className="font-medium">Real-time Monitoring</div>
              <div className="text-sm text-yellow-100">Track every device 24/7</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-yellow-700 rounded-lg flex items-center justify-center">✓</div>
            <div>
              <div className="font-medium">Predictive Analytics</div>
              <div className="text-sm text-yellow-100">AI-powered failure prediction</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-yellow-700 rounded-lg flex items-center justify-center">✓</div>
            <div>
              <div className="font-medium">Enterprise Security</div>
              <div className="text-sm text-yellow-100">SOC 2 compliant infrastructure</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div
              onClick={() => navigate("/")}
              className="lg:hidden flex items-center gap-2 text-white mb-6 cursor-pointer hover:opacity-80 transition-opacity w-fit"
            >
              <Network className="w-8 h-8 text-[#d4af37]" />
              <span className="text-xl font-semibold">NetSight</span>
            </div>
            <h2 className="text-white mb-2">Sign in to your account</h2>
            <p className="text-gray-400">Enter your credentials to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-[#d4af37] hover:text-[#f59e0b]"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>



            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#d4af37] hover:bg-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-sm text-gray-400">Don't have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-[#d4af37] hover:text-[#f59e0b] font-medium"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}