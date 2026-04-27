import API_BASE from "../config/api";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Network, ArrowRight, AlertCircle } from "lucide-react";

interface LocationState {
    email: string;
}

export function VerifyEmailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [otp, setOtp] = useState("");
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Get email from location state
        const state = location.state as LocationState;
        if (state?.email) {
            setEmail(state.email);
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(API_BASE + "/auth/verify-otp", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Verification failed');
            }

            // Email verified — redirect to login
            navigate('/login', { state: { verified: true } });
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
                    <h2 className="text-white mb-4 text-3xl font-bold">
                        Secure your account
                    </h2>
                    <p className="text-yellow-100 text-lg leading-relaxed">
                        Verify your email address to access the full power of NetSight network monitoring.
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
                        <h2 className="text-white mb-2 text-2xl font-bold">Verify your email</h2>
                        <p className="text-gray-400">
                            {email ? (
                                <>We sent a verification code to <span className="text-white font-medium">{email}</span></>
                            ) : (
                                "Enter your email and the verification code you received."
                            )}
                        </p>
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
                                type="email"
                                id="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                id="otp"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent text-center text-2xl tracking-widest font-mono"
                                placeholder="000000"
                                maxLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 bg-[#d4af37] hover:bg-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <span>Verifying...</span>
                            ) : (
                                <>
                                    Verify Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/signup')}
                                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Change email address
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
