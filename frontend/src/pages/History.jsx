import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getValuationHistory } from "../services/historyService";
import axios from "axios";
import {
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  Lock,
  LogIn,
  Clock,
  MapPin,
  Home,
  TrendingUp,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ScaleIn, FadeInUp } from "../components/ui/Motion";
import PortfolioSummary from "../components/PortfolioSummary";
import ShareButton from "../components/ShareButton";

export default function ReportHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token || token.startsWith("guest")) {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const data = await getValuationHistory();
        setReports(data.success ? data.data || [] : data.reports || data || []);
      } catch (err) {
        const msg = err.response?.data?.error || "";
        if (
          !msg.toLowerCase().includes("suspended") &&
          !msg.toLowerCase().includes("banned")
        ) {
          toast.error("Failed to load valuation history");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (isGuest) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-5">
        <ScaleIn>
          <div className="bg-aura-card border border-aura-border rounded-3xl p-10 text-center max-w-md shadow-2xl">
            <div className="inline-flex p-3.5 bg-blue-500/10 border border-blue-500 rounded-2xl mb-4">
              <Lock size={28} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              Feature Restricted for Guests
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Portfolio history tracking is locked in guest mode. Please log in
              to access this feature.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                sessionStorage.removeItem("token");
                navigate("/auth");
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Log In to Access Feature
            </motion.button>
          </div>
        </ScaleIn>
      </div>
    );
  }

  const filteredReports = reports.filter((r) =>
    (r.locality || r.location || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleReload = (report) => {
    localStorage.setItem(
      "prefillPrediction",
      JSON.stringify({
        locality: report.locality || report.location || "",
        bhk: report.bhk_size || report.bhk || 2,
        area: report.area_sqft || report.area || 1000,
        bathrooms: report.bathrooms || 2,
        balconies: report.balconies || 1,
        propertyAge: report.property_age || 0,
        propertyType: report.property_type || "Apartment",
        furnishingStatus: report.furnishing_status || "Unfurnished",
      })
    );
    toast.success("Parameters reloaded!");
    navigate("/predict");
  };

  const handleDelete = async (reportId, index) => {
    if (!window.confirm("Delete this valuation record?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/history/${reportId}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      setReports(reports.filter((r) => (r.id || r._id) !== reportId));
      toast.success("Record deleted");
    } catch {
      setReports(reports.filter((_, i) => i !== index));
      toast.success("Record removed");
    }
  };

  const formatPrice = (report) => {
    const min = Number(report.normal_min || report.price_min);
    const max = Number(report.normal_max || report.price_max);
    if (!isNaN(min) && !isNaN(max)) {
      const unit = max >= 100 ? "Cr" : "Lakhs";
      const format = (val) =>
        val >= 100 ? (val / 100).toFixed(2) : val.toFixed(2);
      return `₹${format(min)} – ₹${format(max)} ${unit}`;
    }
    return "—";
  };

  const formatTime = (report) => {
    const ts = report.timestamp || report.created_at;
    if (!ts) return "Recent";
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="animate-spin" size={28} />
        Loading your valuation history...
      </div>
    );
  }

  return (
    <FadeInUp>
      <div className="max-w-6xl mx-auto mt-6 px-4 sm:px-6 pb-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
              Your Valuation History
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Review, re-run, or share past valuations across MMR.
            </p>
          </div>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search by locality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-aura-card border border-aura-border rounded-xl text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Portfolio Summary stats */}
        <div className="mb-6">
          <PortfolioSummary reports={filteredReports} />
        </div>

        {/* Empty state */}
        {filteredReports.length === 0 ? (
          <div className="bg-aura-card border border-aura-border rounded-2xl p-16 text-center">
            <div className="inline-flex p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl mb-4">
              <Layers size={28} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              {reports.length === 0
                ? "No valuations yet"
                : "No matching localities"}
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              {reports.length === 0
                ? "Run a valuation in the Valuation Terminal and it will appear here."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          /* Card grid instead of plain table */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report, index) => (
              <motion.div
                key={report.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative bg-aura-card border border-aura-border rounded-2xl overflow-hidden hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
              >
                {/* Accent bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity" />

                <div className="p-5">
                  {/* Top row: locality + time */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-blue-400 shrink-0" />
                        <h3 className="font-bold text-slate-50 capitalize truncate text-base">
                          {report.locality || report.location || "Unknown"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        <Clock size={11} />
                        {formatTime(report)}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                      {report.bhk_size || report.bhk || "—"} BHK
                    </span>
                  </div>

                  {/* Meta pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] bg-aura-accent/70 px-2 py-0.5 rounded-md text-slate-300">
                      <Home size={11} className="text-violet-400" />
                      {report.area_sqft || report.area || "—"} sq.ft
                    </span>
                    {(report.property_type || report.type) && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-aura-accent/70 px-2 py-0.5 rounded-md text-slate-300">
                        {report.property_type || report.type}
                      </span>
                    )}
                    {(report.furnishing_status || report.furnishing) && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-aura-accent/70 px-2 py-0.5 rounded-md text-slate-300">
                        {report.furnishing_status || report.furnishing}
                      </span>
                    )}
                  </div>

                  {/* Price + actions */}
                  <div className="pt-3 border-t border-aura-border/70 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">
                        Fair market range
                      </div>
                      <div className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                        {formatPrice(report)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReload(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/15 border border-blue-500/30 rounded-lg text-xs font-semibold text-blue-300 hover:bg-blue-600/25 transition"
                        title="Re-load into Valuation Terminal"
                      >
                        <RefreshCw size={12} />
                        Re-load
                      </motion.button>

                      <ShareButton logId={report.id} />

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          handleDelete(report.id || report._id, index)
                        }
                        className="p-1.5 bg-aura-accent border border-aura-border rounded-lg text-red-400/80 hover:bg-red-500/15 hover:text-red-400 transition"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </FadeInUp>
  );
}
