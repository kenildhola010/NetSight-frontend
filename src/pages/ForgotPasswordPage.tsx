import API_BASE from "../config/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(API_BASE + "/auth/forgotpassword", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset code');
      }

      navigate('/reset-password', { state: { email } });
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
            Reset Your Password
          </h2>
          <p className="text-yellow-100 text-lg leading-relaxed">
            Enter your email address and we'll send you a link to reset your password so you can get back to monitoring your network infrastructure.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-yellow-700 rounded-lg flex items-center justify-center">✓</div>
            <div>
              <div className="font-medium">Secure Recovery</div>
              <div className="text-sm text-yellow-100">Encrypted password reset token</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-yellow-700 rounded-lg flex items-center justify-center">✓</div>
            <div>
              <div className="font-medium">Fast Access</div>
              <div className="text-sm text-yellow-100">Get back to work in minutes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>

          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 text-white mb-6">
              <Network className="w-8 h-8 text-[#d4af37]" />
              <span className="text-xl font-semibold">NetSight</span>
            </div>
            <h2 className="text-white mb-2">Forgot Password?</h2>
            <p className="text-gray-400">No worries, we'll send you reset instructions.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#d4af37] hover:bg-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Generating Verification Code...</span>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
