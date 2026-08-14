import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, MapPin, Hash } from "lucide-react";

export default function PortfolioSummary({ reports = [] }) {
  const summary = useMemo(() => {
    if (!reports.length)
      return { total: 0, avgMin: 0, topLocality: "—", topCount: 0 };
    let sum = 0;
    const counts = {};
    reports.forEach((r) => {
      const min = Number(r.price_min || r.normal_min || 0);
      if (!isNaN(min)) sum += min;
      const loc = (r.locality || "Unknown").trim();
      counts[loc] = (counts[loc] || 0) + 1;
    });
    const [topLocality, topCount] =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
    return {
      total: reports.length,
      avgMin: (sum / reports.length).toFixed(1),
      topLocality,
      topCount,
    };
  }, [reports]);

  if (!reports.length) return null;

  const cards = [
    {
      label: "Total Valuations",
      value: summary.total,
      icon: Hash,
      accent: "from-blue-600/20 to-blue-500/5",
      iconColor: "text-blue-400",
    },
    {
      label: "Avg Min Price (L)",
      value: summary.avgMin,
      icon: TrendingUp,
      accent: "from-emerald-600/20 to-emerald-500/5",
      iconColor: "text-emerald-400",
    },
    {
      label: "Most Valued Locality",
      value: summary.topLocality,
      sub: `${summary.topCount} times`,
      icon: MapPin,
      accent: "from-amber-600/20 to-amber-500/5",
      iconColor: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`relative overflow-hidden bg-gradient-to-br ${c.accent} border border-aura-border rounded-xl p-4`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {c.label}
            </span>
            <c.icon size={15} className={c.iconColor} />
          </div>
          <div className="text-xl font-bold text-slate-50 capitalize truncate tracking-tight">
            {c.value}
          </div>
          {c.sub && (
            <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
