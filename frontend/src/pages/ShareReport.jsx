import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Building2, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ShareReport() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    axios.get(`http://localhost:5000/api/reports/public/${token}`)
      .then((res) => res.data.success ? setData(res.data.data) : setError(res.data.error))
      .catch((err) => setError(err.response?.data?.error || "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-aura-bg flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin" size={32} />
        <p>Loading shared report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-aura-bg flex items-center justify-center p-6">
        <div className="bg-aura-card border border-aura-border rounded-3xl p-10 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Report Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold">
            <ArrowLeft size={16} /> Go to AURA Estate
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aura-bg text-slate-100">
      <header className="border-b border-aura-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 border border-blue-500 p-2 rounded-xl">
            <Building2 size={20} className="text-blue-500" />
          </div>
          <div>
            <div className="font-bold">AURA <span className="text-blue-500 font-normal">Estate</span></div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Shared Report</div>
          </div>
        </div>
        <Link to="/auth" className="text-sm font-semibold text-blue-400">Create your own →</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-aura-card border border-aura-border rounded-2xl p-8">
          <span className="text-xs font-bold text-blue-500 uppercase">Public Valuation Report</span>
          <h1 className="text-2xl font-bold mt-1 capitalize">{data.locality} Micro-Market Analysis</h1>
          <p className="text-sm text-slate-400 mt-1">{data.configuration} • {data.furnishing_status}</p>

          <h3 className="text-sm font-bold text-slate-300 mt-6 mb-3 uppercase">Price Valuation Tiers</h3>
          <div className="space-y-2.5">
            {Object.entries(data.predictions || {}).map(([tier, range]) => (
              <div key={tier} className="flex justify-between px-4 py-3.5 bg-aura-accent border border-aura-border rounded-xl">
                <span className="text-sm font-semibold text-slate-400 capitalize">{tier.replace(/_/g, " ")}</span>
                <span className="font-bold text-blue-400">
                  {Array.isArray(range) ? `${range[0]} – ${range[1]}` : range}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-aura-border text-center">
            <Link to="/auth" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">
              Run your own valuation
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}