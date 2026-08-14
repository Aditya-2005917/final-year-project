import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Safely converts the various formats returned by the backend into pure Rupees.
 * Handles:
 * - "₹43.58 Lakhs"
 * - "₹1.25 Cr"
 * - numeric values in lakhs or rupees
 * - missing / wrong keys
 */
function parseBasePriceToRupees(predictions) {
  if (!predictions) return 10_000_000;

  // Try every possible key the backend might return
  const raw =
    predictions.base_price ||
    predictions.Base_Price ||
    predictions["Base Price"] ||
    predictions.BasePrice ||
    predictions.basePrice;

  if (raw == null) return 10_000_000;

  // Already a number
  if (typeof raw === "number" && !isNaN(raw)) {
    // If the number is small (< 10 000) we treat it as lakhs
    return raw < 10_000 ? raw * 100_000 : raw;
  }

  // String parsing
  const cleaned = String(raw)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim()
    .toLowerCase();

  const numMatch = cleaned.match(/([\d.]+)/);
  if (!numMatch) return 10_000_000;

  const value = parseFloat(numMatch[1]);
  if (isNaN(value)) return 10_000_000;

  if (cleaned.includes("cr") || cleaned.includes("crore")) {
    return value * 10_000_000; // Crores → Rupees
  }
  if (cleaned.includes("lakh") || cleaned.includes("lac")) {
    return value * 100_000; // Lakhs → Rupees
  }

  // Fallback heuristic
  return value > 100_000 ? value : value * 100_000;
}

export default function RentalYieldCalculator({ result }) {
  const basePrice = useMemo(
    () => parseBasePriceToRupees(result?.predictions),
    [result]
  );

  const [yieldRate, setYieldRate] = useState(2.8);
  const [includeLoan, setIncludeLoan] = useState(false);
  const [loanAmount, setLoanAmount] = useState(() =>
    Math.round(basePrice * 0.8)
  );
  const [interestRate, setInterestRate] = useState(8.5);
  const [loanTenure, setLoanTenure] = useState(20);

  // Keep loan amount in sync whenever the base price changes
  useEffect(() => {
    setLoanAmount(Math.round(basePrice * 0.8));
  }, [basePrice]);

  const annualRentGross = basePrice * (yieldRate / 100);
  const monthlyRentMin = Math.round((annualRentGross * 0.9) / 12);
  const monthlyRentMax = Math.round((annualRentGross * 1.1) / 12);
  const averageMonthlyRent = (monthlyRentMin + monthlyRentMax) / 2;

  const netYield = (
    ((annualRentGross * 0.85) / basePrice) *
    100
  ).toFixed(2);

  const monthlyInterestRate = Number(interestRate) / 12 / 100;
  const totalMonths = Number(loanTenure) * 12;

  const monthlyEMI =
    includeLoan && monthlyInterestRate > 0 && totalMonths > 0
      ? Math.round(
          (loanAmount *
            monthlyInterestRate *
            Math.pow(1 + monthlyInterestRate, totalMonths)) /
            (Math.pow(1 + monthlyInterestRate, totalMonths) - 1)
        )
      : 0;

  const monthlyCashFlow = Math.round(averageMonthlyRent - monthlyEMI);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-base font-bold text-slate-100">
          Rental Yield & Investment ROI
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Enhanced metrics for buy-to-let investors including net returns and
          cash flow.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-aura-accent border border-aura-border rounded-xl p-3.5"
        >
          <span className="text-xs text-slate-400 font-semibold">
            Est. Monthly Rent
          </span>
          <div className="text-base font-bold text-slate-100 mt-1">
            ₹{monthlyRentMin.toLocaleString("en-IN")} – ₹
            {monthlyRentMax.toLocaleString("en-IN")}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-aura-accent border border-aura-border rounded-xl p-3.5"
        >
          <span className="text-xs text-slate-400 font-semibold">
            Gross vs Net Yield
          </span>
          <div className="text-base font-bold text-blue-400 mt-1">
            {yieldRate}% <span className="text-xs text-slate-500">(G)</span> /{" "}
            {netYield}%{" "}
            <span className="text-xs text-emerald-400">(N)</span>
          </div>
        </motion.div>
      </div>

      {/* Yield Slider */}
      <div>
        <div className="flex justify-between text-sm font-semibold text-slate-300 mb-2">
          <span>Expected Yield Rate</span>
          <span className="text-blue-400">{yieldRate}%</span>
        </div>
        <input
          type="range"
          min="1.5"
          max="4.5"
          step="0.1"
          value={yieldRate}
          onChange={(e) => setYieldRate(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
          <span>1.5% Conservative</span>
          <span>3.0% Average</span>
          <span>4.5% High Demand</span>
        </div>
      </div>

      {/* Loan Toggle */}
      <div className="border-t border-aura-border pt-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={includeLoan}
            onChange={(e) => setIncludeLoan(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          Factor in Home Loan Financing
        </label>

        <AnimatePresence>
          {includeLoan && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold">
                      Loan Amount
                    </label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1.5 bg-aura-accent border border-aura-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold">
                      Interest %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1.5 bg-aura-accent border border-aura-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold">
                      Tenure (Yrs)
                    </label>
                    <input
                      type="number"
                      value={loanTenure}
                      onChange={(e) => setLoanTenure(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1.5 bg-aura-accent border border-aura-border rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Monthly EMI</span>
                  <span className="font-bold text-amber-400">
                    ₹{monthlyEMI.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-amber-500/20 pt-2">
                  <span className="text-slate-400">Net Monthly Cash Flow</span>
                  <span
                    className={`font-bold ${
                      monthlyCashFlow >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {monthlyCashFlow >= 0 ? "+" : "-"}₹
                    {Math.abs(monthlyCashFlow).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}