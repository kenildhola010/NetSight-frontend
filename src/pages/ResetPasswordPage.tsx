import API_BASE from "../config/api";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Network, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface LocationState {
  email: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.email) {
      setFormData(prev => ({ ...prev, email: state.email }));
    }
  }, [location]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.otp || formData.otp.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/resetpassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);
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
            Security is our priority
          </h2>
          <p className="text-yellow-100 text-lg leading-relaxed">
            Please enter your verification code and choose a strong password that you haven't used before to secure your NetSight account.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-yellow-700 rounded-lg flex items-center justify-center">✓</div>
            <div>
              <div className="font-medium">Strong Encryption</div>
              <div className="text-sm text-yellow-100">Bcrypt password hashing</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-yellow-700 rounded-lg flex items-center justify-center">✓</div>
            <div>
              <div className="font-medium">Secure Session</div>
              <div className="text-sm text-yellow-100">Automatic re-authentication required</div>
            </div>
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
            <h2 className="text-white mb-2 text-2xl font-bold">
              {step === 1 ? "Verify your email" : "Set new password"}
            </h2>
            <p className="text-gray-400">
              {step === 1 ? (
                formData.email ? (
                  <>We sent a verification code to <span className="text-white font-medium">{formData.email}</span></>
                ) : (
                  "Enter your email and the verification code you received."
                )
              ) : (
                "Your new password must be different from previously used passwords."
              )}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success ? (
            <div className="mb-6 p-6 bg-green-500/10 border border-green-500/20 rounded-lg flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">Password reset</h3>
                <p className="text-sm text-gray-400">
                  Your password has been successfully reset. Click below to log in magically.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-6 py-2.5 bg-[#d4af37] hover:bg-[#f59e0b] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 w-full"
              >
                Continue to sign in
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={step === 1 ? handleVerifyOtp : handleResetPassword} className="space-y-5">
              {step === 1 && (
                <>
                  {!location.state?.email && (
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
                        placeholder="Enter your email"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Verification Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      required
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-[#d4af37] hover:bg-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 mt-4"
                  >
                    {isLoading ? (
                      <span>Verifying...</span>
                    ) : (
                      <>
                        Verify Code
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                      placeholder="Enter your new password"
                    />
                    <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters.</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                      placeholder="Confirm your new password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-[#d4af37] hover:bg-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 mt-4"
                  >
                    {isLoading ? (
                      <span>Resetting password...</span>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
