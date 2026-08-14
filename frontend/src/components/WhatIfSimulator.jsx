import React, { useState } from "react";
import { getPrediction } from "../services/predictionService";
import { motion } from "framer-motion";
import { Sliders, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function WhatIfSimulator({ originalForm, onPreview }) {
  const [params, setParams] = useState({
    area_sqft: Number(originalForm.area_sqft) || 1000,
    property_age: Number(originalForm.property_age) || 0,
    furnishing_status: originalForm.furnishing_status || "Unfurnished",
    bhk_size: Number(originalForm.bhk_size) || 2,
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const runWhatIf = async () => {
    setLoading(true);
    try {
      const data = await getPrediction({
        locality: originalForm.locality,
        property_type: originalForm.property_type,
        bathrooms: Number(originalForm.bathrooms) || 2,
        balconies: Number(originalForm.balconies) || 1,
        ...params,
      });
      setPreview(data);
      if (onPreview) onPreview(data);
      toast.success("What-If valuation updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "What-If failed");
    } finally {
      setLoading(false);
    }
  };

  const basePrice = preview?.predictions?.base_price || preview?.predictions?.Base_Price;
  const normalRange = preview?.predictions?.Normal;

  return (
    <div className="bg-aura-card border border-aura-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Sliders size={18} className="text-blue-500" />
        <h3 className="text-base font-bold text-slate-100">What-If Simulator</h3>
      </div>

      <div>
        <div className="flex justify-between text-sm font-semibold text-slate-300 mb-1.5">
          <span>Area</span><span className="text-blue-400">{params.area_sqft} sq.ft</span>
        </div>
        <input type="range" min={300} max={4000} step={25} value={params.area_sqft}
          onChange={(e) => setParams({ ...params, area_sqft: Number(e.target.value) })}
          className="w-full accent-blue-500" />
      </div>

      <div>
        <div className="flex justify-between text-sm font-semibold text-slate-300 mb-1.5">
          <span>BHK</span><span className="text-blue-400">{params.bhk_size}</span>
        </div>
        <input type="range" min={1} max={5} step={1} value={params.bhk_size}
          onChange={(e) => setParams({ ...params, bhk_size: Number(e.target.value) })}
          className="w-full accent-blue-500" />
      </div>

      <div>
        <div className="flex justify-between text-sm font-semibold text-slate-300 mb-1.5">
          <span>Age</span><span className="text-blue-400">{params.property_age} yrs</span>
        </div>
        <input type="range" min={0} max={30} value={params.property_age}
          onChange={(e) => setParams({ ...params, property_age: Number(e.target.value) })}
          className="w-full accent-blue-500" />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-300 mb-1.5 block">Furnishing</label>
        <select value={params.furnishing_status}
          onChange={(e) => setParams({ ...params, furnishing_status: e.target.value })}
          className="w-full px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm">
          <option>Unfurnished</option>
          <option>Semi-Furnished</option>
          <option>Fully Furnished</option>
        </select>
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={runWhatIf} disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="animate-spin" size={16} /> Recalculating...</> : "Run What-If Valuation"}
      </motion.button>

      {preview && (
        <div className="pt-4 border-t border-aura-border">
          <div className="text-xs text-slate-400 uppercase">Updated Estimate</div>
          {basePrice && <div className="text-lg font-bold text-blue-400">{basePrice}</div>}
          {Array.isArray(normalRange) && (
            <div className="text-sm text-slate-300">Normal: {normalRange[0]} – {normalRange[1]}</div>
          )}
        </div>
      )}
    </div>
  );
}