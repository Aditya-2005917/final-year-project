import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  User,
  UserX,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ScaleIn, FadeInUp } from "../components/ui/Motion";

export default function Auth() {
  const [authView, setAuthView] = useState("login"); // login | signup | otp | forgot | reset
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.clear();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ==================== LOGIN ====================
      if (authView === "login") {
        const res = await axios.post("http://localhost:5000/api/auth/login", {
          email,
          password,
        });
        sessionStorage.setItem("token", res.data.token || "session-token");
        sessionStorage.setItem("isGuest", "false");
        sessionStorage.setItem(
          "userName",
          res.data.name || res.data.user?.name || email.split("@")[0],
        );
        sessionStorage.setItem(
          "userEmail",
          res.data.email || res.data.user?.email || email,
        );
        sessionStorage.setItem(
          "userRole",
          (res.data.role || "user").toLowerCase(),
        );
        toast.success("Login Successful!");
        navigate("/predict");
      }

      // ==================== SIGNUP (Send OTP) ====================
      else if (authView === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          setLoading(false);
          return;
        }

        await axios.post("http://localhost:5000/api/auth/send-signup-otp", {
          email,
          password,
          name,
        });

        toast.success("Verification code sent to your email!");
        setAuthView("otp"); // ← switch to OTP screen
      }

      // ==================== VERIFY OTP ====================
      else if (authView === "otp") {
        await axios.post("http://localhost:5000/api/auth/verify-signup-otp", {
          email,
          otp,
        });

        toast.success("Account created successfully! Please log in.");
        setAuthView("login");
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        setName("");
      }

      // ==================== FORGOT PASSWORD ====================
      else if (authView === "forgot") {
        await axios.post("http://localhost:5000/api/auth/forgot-password", {
          email,
        });
        toast.success("Reset code sent to your email!");
        setAuthView("reset");
      }

      // ==================== RESET PASSWORD ====================
      else if (authView === "reset") {
        await axios.post("http://localhost:5000/api/auth/reset-password", {
          email,
          token: resetToken,
          newPassword: password,
        });
        toast.success("Password reset successfully!");
        setAuthView("login");
        setPassword("");
        setResetToken("");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    sessionStorage.setItem("token", "guest-session-token");
    sessionStorage.setItem("isGuest", "true");
    sessionStorage.setItem("userName", "Guest User");
    sessionStorage.setItem("userEmail", "guest@auraestate.com");
    sessionStorage.setItem("userRole", "guest");
    toast.success("Logged in as Guest!");
    navigate("/predict");
  };

  const headerInfo = {
    login: {
      title: "Welcome Back",
      subtitle: "Access your real estate valuation intelligence suite",
    },
    signup: {
      title: "Create Account",
      subtitle: "Register to unlock automated market reports",
    },
    otp: {
      title: "Verify Email",
      subtitle: "Enter the 6-digit code sent to your email",
    },
    forgot: {
      title: "Reset Password",
      subtitle: "Enter your email to receive recovery instructions",
    },
    reset: {
      title: "Set New Password",
      subtitle: "Enter the code and your new password",
    },
  }[authView];

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-[#070b14]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#070b14_70%)]" />
      </div>

      {/* City skyline silhouette (household / real-estate theme) */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[42%] opacity-[0.14]">
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-full h-full text-blue-400"
          fill="currentColor"
        >
          {/* Far buildings */}
          <rect x="40" y="140" width="70" height="180" rx="2" />
          <rect x="120" y="100" width="55" height="220" rx="2" />
          <rect x="185" y="160" width="90" height="160" rx="2" />
          <rect x="290" y="80" width="48" height="240" rx="2" />
          <rect x="350" y="120" width="75" height="200" rx="2" />
          {/* House-style peak */}
          <polygon points="450,180 490,120 530,180" />
          <rect x="455" y="180" width="70" height="140" rx="1" />
          <rect x="540" y="90" width="60" height="230" rx="2" />
          <rect x="620" y="150" width="85" height="170" rx="2" />
          <rect x="720" y="60" width="50" height="260" rx="2" />
          <rect x="780" y="110" width="95" height="210" rx="2" />
          {/* Another house */}
          <polygon points="900,170 945,105 990,170" />
          <rect x="910" y="170" width="70" height="150" rx="1" />
          <rect x="1000" y="95" width="55" height="225" rx="2" />
          <rect x="1070" y="130" width="80" height="190" rx="2" />
          <rect x="1160" y="70" width="45" height="250" rx="2" />
          <rect x="1220" y="145" width="70" height="175" rx="2" />
          <rect x="1310" y="100" width="90" height="220" rx="2" />
          {/* Window dots suggestion via thin verticals */}
          <rect x="135" y="120" width="3" height="12" opacity="0.5" />
          <rect x="145" y="120" width="3" height="12" opacity="0.5" />
          <rect x="310" y="100" width="3" height="10" opacity="0.5" />
          <rect x="740" y="80" width="3" height="10" opacity="0.5" />
          <rect x="1180" y="90" width="3" height="10" opacity="0.5" />
        </svg>
        {/* Soft ground fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#070b14] to-transparent" />
      </div>

      {/* Floating property icons */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.08]">
        <div className="absolute top-[18%] left-[8%] text-blue-300">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
        </div>
        <div className="absolute top-[28%] right-[12%] text-cyan-300">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
        </div>
        <div className="absolute bottom-[38%] left-[18%] text-blue-200">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M9 20V10h6v10M4 10h16"/></svg>
        </div>
        <div className="absolute top-[42%] right-[22%] text-cyan-200">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></svg>
        </div>
      </div>

      <ScaleIn>
        <div className="relative w-full max-w-lg rounded-3xl overflow-hidden
          bg-[#0e1626]/90 backdrop-blur-xl border border-white/10
          shadow-[0_25px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(59,130,246,0.08)]">
          {/* Top accent line */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500" />

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-white/5 bg-gradient-to-b from-blue-600/10 to-transparent">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              className="relative inline-flex mb-4"
            >
              <div className="absolute inset-0 bg-blue-500/40 blur-xl rounded-2xl" />
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
                <Building2 size={26} className="text-white" />
              </div>
            </motion.div>
            <h1 className="text-xl font-bold text-slate-50 mb-1 tracking-tight">
              {headerInfo.title}
            </h1>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">
              {headerInfo.subtitle}
            </p>
            <div className="mt-3 text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-500">
              AURA Estate · Intelligence Engine
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-5">
              {/* Name - only on signup */}
              {authView === "signup" && (
                <FadeInUp delay={0.05}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-3.5 top-3.5 text-slate-500"
                      />
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        placeholder="Name"
                      />
                    </div>
                  </div>
                </FadeInUp>
              )}

              {/* Email - hide on OTP and reset */}
              {authView !== "otp" && authView !== "reset" && (
                <FadeInUp delay={0.08}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-3.5 top-3.5 text-slate-500"
                      />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        className="w-full pl-11 pr-4 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        placeholder="Email Id"
                      />
                    </div>
                  </div>
                </FadeInUp>
              )}

              {/* OTP Input - Improved Design */}
              {authView === "otp" && (
                <FadeInUp>
                  <div className="space-y-5">
                    {/* Email confirmation badge */}
                    <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <Mail size={15} className="text-blue-400" />
                      <span className="text-sm text-blue-300 font-medium truncate">
                        {email}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                        Enter 6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <KeyRound
                          size={18}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                        <input
                          required
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={(e) => {
                            // Only allow digits and max 6 characters
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6);
                            setOtp(value);
                          }}
                          maxLength={6}
                          autoFocus
                          className="w-full pl-12 pr-4 py-4 bg-aura-accent border border-aura-border rounded-xl text-center text-2xl font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                          placeholder="• • • • • •"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
                        We sent a verification code to your email.
                        <br />
                        Check your inbox (and spam folder).
                      </p>
                    </div>

                    {/* Resend option */}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await axios.post(
                            "http://localhost:5000/api/auth/send-signup-otp",
                            { email, password, name },
                          );
                          toast.success("New code sent!");
                        } catch (err) {
                          toast.error(
                            err.response?.data?.error ||
                              "Failed to resend code",
                          );
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                    >
                      Didn’t receive the code? Resend
                    </button>
                  </div>
                </FadeInUp>
              )}

              {/* Reset Token */}
              {authView === "reset" && (
                <FadeInUp>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Reset Token
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={18}
                        className="absolute left-3.5 top-3.5 text-slate-500"
                      />
                      <input
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        placeholder="Enter code"
                      />
                    </div>
                  </div>
                </FadeInUp>
              )}

              {/* Password fields */}
              {(authView === "login" ||
                authView === "signup" ||
                authView === "reset") && (
                <FadeInUp delay={0.12}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {authView === "reset" ? "New Password" : "Password"}
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3.5 top-3.5 text-slate-500"
                      />
                      <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={
                          authView === "login"
                            ? "current-password"
                            : "new-password"
                        }
                        className="w-full pl-11 pr-4 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </FadeInUp>
              )}

              {/* Confirm Password - only signup */}
              {authView === "signup" && (
                <FadeInUp delay={0.15}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <ShieldCheck
                        size={18}
                        className="absolute left-3.5 top-3.5 text-slate-500"
                      />
                      <input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full pl-11 pr-4 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </FadeInUp>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25 disabled:opacity-60"
              >
                {loading
                  ? "Processing..."
                  : authView === "login"
                    ? "Sign In"
                    : authView === "signup"
                      ? "Send Verification Code"
                      : authView === "otp"
                        ? "Verify & Create Account"
                        : authView === "forgot"
                          ? "Send Reset Instructions"
                          : "Update Password"}
                {!loading && <ArrowRight size={16} />}
              </motion.button>
            </form>

            {/* Forgot Password link */}
            {authView === "login" && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setAuthView("forgot")}
                  className="text-xs font-semibold text-blue-500 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Back buttons */}
            {(authView === "forgot" ||
              authView === "reset" ||
              authView === "otp") && (
              <button
                onClick={() => {
                  if (authView === "otp") setAuthView("signup");
                  else setAuthView("login");
                }}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-500"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {/* Guest Login */}
            {authView === "login" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGuestLogin}
                className="w-full mt-4 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-aura-card-hover transition"
              >
                <UserX size={16} className="text-slate-400" /> Continue as Guest
                User
              </motion.button>
            )}

            {/* Toggle Login / Signup */}
            {(authView === "login" || authView === "signup") && (
              <p className="text-center text-sm text-slate-400 mt-5">
                {authView === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() =>
                    setAuthView(authView === "login" ? "signup" : "login")
                  }
                  className="text-blue-500 font-semibold hover:underline"
                >
                  {authView === "login" ? "Sign Up" : "Login"}
                </button>
              </p>
            )}
          </div>
        </div>
      </ScaleIn>
    </div>
  );
}
