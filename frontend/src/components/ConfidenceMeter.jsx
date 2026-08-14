import React from "react";
import { motion } from "framer-motion";

export default function ConfidenceMeter({
  locality,
  metrics = {},
  comparableCount = 0,
}) {
  const r2 = Number.isFinite(Number(metrics?.r2)) ? Number(metrics.r2) : null;
  const mape = Number.isFinite(Number(metrics?.mape)) ? Number(metrics.mape) : null;

  const coverageLabel =
    comparableCount >= 10
      ? "High Data Density"
      : comparableCount >= 5
        ? "Good Data Density"
        : comparableCount > 0
          ? "Limited Data"
          : "Data Coverage Unavailable";

  const coverageText =
    comparableCount > 0
      ? `${comparableCount} comparable ${
          comparableCount === 1 ? "listing" : "listings"
        } available for ${locality || "this market"}.`
      : "Comparable-listing count was not supplied by the valuation service.";

  const barWidth =
    comparableCount > 0
      ? Math.min(100, Math.max(15, comparableCount * 10))
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-bold text-slate-200">
            Model Performance & Market Coverage
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Validation metrics and comparable-data coverage
          </p>
        </div>

        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300"
        >
          {r2 !== null ? `R² ${r2.toFixed(1)}%` : "R² unavailable"}
        </motion.span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-aura-border bg-aura-accent px-3.5 py-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Validation R²
          </div>
          <div className="text-lg font-bold text-slate-100 mt-1">
            {r2 !== null ? `${r2.toFixed(2)}%` : "N/A"}
          </div>
        </div>

        <div className="rounded-xl border border-aura-border bg-aura-accent px-3.5 py-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Validation MAPE
          </div>
          <div className="text-lg font-bold text-slate-100 mt-1">
            {mape !== null ? `${mape.toFixed(2)}%` : "N/A"}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400">Comparable-data coverage</span>
          <span className="font-semibold text-emerald-400">
            {coverageLabel}
          </span>
        </div>

        <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-slate-400 leading-relaxed"
      >
        {coverageText}
      </motion.p>
    </div>
  );
}