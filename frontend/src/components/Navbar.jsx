import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  Sparkles,
  History,
  Calculator,
  Building2,
  Shield,
  Layers,
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "User",
    email: "",
    picture: "",
  });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = sessionStorage.getItem("token");
      const isSharePage = location.pathname.startsWith("/share/");

      if (
        !token &&
        location.pathname !== "/auth" &&
        location.pathname !== "/" &&
        !isSharePage
      ) {
        navigate("/auth");
        return;
      }

      if (isSharePage) return;

      if (sessionStorage.getItem("isGuest") === "true") {
        setUserInfo({
          name: sessionStorage.getItem("userName") || "Guest User",
          email: sessionStorage.getItem("userEmail") || "guest@auraestate.com",
          picture: "",
        });
        return;
      }

      if (token && token !== "guest-session-token") {
        try {
          const response = await axios.get(
            "http://localhost:5000/api/auth/user",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.data?.success) {
            const u = response.data.user;
            setUserInfo({
              name: u.name || u.email?.split("@")[0] || "User",
              email: u.email || "",
              picture:
                u.picture ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
            });
          }
        } catch {
          /* silent */
        }
      }
    };
    fetchUserData();
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/auth");
  };

  if (
    location.pathname === "/auth" ||
    location.pathname === "/" ||
    location.pathname.startsWith("/share/")
  ) {
    return null;
  }

  const isActive = (path) => location.pathname === path;
  const isAdmin = sessionStorage.getItem("userRole") === "admin";

  const navLinks = [
    { to: "/top-properties", icon: Layers, label: "Top Properties" },
    { to: "/predict", icon: Calculator, label: "Valuation Terminal" },
    { to: "/history", icon: History, label: "Portfolio History" },
    { to: "/chat", icon: Sparkles, label: "AI Advisor" },
  ];

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="sticky top-0 z-50 px-5 sm:px-7 py-3 flex items-center justify-between
        bg-[#0b1220]/85 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.35)]"
    >
      {/* Brand */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => navigate("/predict")}
        className="flex items-center gap-3 cursor-pointer shrink-0"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/30 blur-md rounded-xl" />
          <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-xl shadow-lg shadow-blue-500/30">
            <Building2 size={18} className="text-white" />
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="font-bold text-[15px] tracking-tight text-slate-50 leading-none">
            AURA{" "}
            <span className="font-semibold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Estate
            </span>
          </div>
          <div className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mt-0.5">
            Intelligence Engine
          </div>
        </div>
      </motion.div>

      {/* Center nav pill */}
      <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5">
        {navLinks.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              isActive(to)
                ? "text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {isActive(to) && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-xl bg-blue-600 shadow-md shadow-blue-600/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon size={14} />
              {label}
            </span>
          </Link>
        ))}

        {isAdmin && (
          <Link
            to="/admin"
            className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              isActive("/admin")
                ? "text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {isActive("/admin") && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-xl bg-blue-600 shadow-md shadow-blue-600/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Shield size={14} />
              Admin
            </span>
          </Link>
        )}
      </nav>

      {/* Mobile nav icons */}
      <div className="flex md:hidden items-center gap-1 overflow-x-auto max-w-[50vw]">
        {navLinks.map(({ to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`p-2 rounded-lg ${
              isActive(to)
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <Icon size={16} />
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/admin"
            className={`p-2 rounded-lg ${
              isActive("/admin")
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <Shield size={16} />
          </Link>
        )}
      </div>

      {/* Profile */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-500/60 ring-offset-2 ring-offset-[#0b1220] bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center"
        >
          {userInfo.picture ? (
            <img
              src={userInfo.picture}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-bold text-sm">
              {userInfo.name?.charAt(0).toUpperCase() || "U"}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-12 w-72 rounded-2xl z-50 overflow-hidden
                bg-[#0e1626]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50"
            >
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />

              <div className="p-5 flex flex-col items-center text-center border-b border-white/5">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-blue-500/50 mb-3 bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  {userInfo.picture ? (
                    <img
                      src={userInfo.picture}
                      alt="DP"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {userInfo.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="font-bold text-base text-slate-50 truncate w-full">
                  {userInfo.name}
                </div>
                <div className="text-xs text-slate-400 truncate w-full mt-0.5">
                  {userInfo.email}
                </div>
                <div className="mt-2.5">
                  {(() => {
                    const role = (
                      sessionStorage.getItem("userRole") || "user"
                    ).toLowerCase();
                    if (role === "admin") {
                      return (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 tracking-wide">
                          ADMIN
                        </span>
                      );
                    }
                    if (role === "guest") {
                      return (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          GUEST
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        USER
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="p-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition"
                >
                  <LogOut size={15} /> Logout Session
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
