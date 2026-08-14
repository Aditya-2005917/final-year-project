import React from "react";
import { Sparkles, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { FadeInUp, Stagger, StaggerItem } from "../components/ui/Motion";

const LOCALITY_SUGGESTIONS = [
  "Andheri East", "Andheri West", "Ghatkopar East", "Ghatkopar West",
  "Bandra East", "Bandra West", "Powai", "Goregaon East", "Goregaon West",
  "Malad East", "Malad West", "Borivali East", "Borivali West",
  "Kandivali East", "Kandivali West", "Vile Parle East", "Vile Parle West",
  "Thane", "Mira Road", "Mulund", "Matunga East", "Matunga West",
  "Matunga South", "Dadar West", "Badlapur", "Ambernath",
];

export default function PredictForm({ formData, setFormData, onSubmit, loading }) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition";
  const labelClass =
    "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4">
      <FadeInUp>
        <div className="relative bg-[#0e1626]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500" />

          <div className="px-9 pt-8 pb-6 bg-gradient-to-br from-blue-600/15 via-transparent to-cyan-500/10 border-b border-white/5">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/40 px-3 py-1 rounded-full mb-3 shadow-sm shadow-blue-500/20"
            >
              <Sparkles size={12} className="text-blue-400" />
              <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                AI Valuation Protocol
              </span>
            </motion.div>
            <h2 className="text-xl font-bold text-slate-50 mb-1 tracking-tight">
              Real Estate Price & Location Engine
            </h2>
            <p className="text-sm text-slate-400">
              Enter property and micro-market parameters to generate an estimated valuation report.
            </p>
          </div>

          <form onSubmit={onSubmit} className="p-9">
            <Stagger className="space-y-5">
              <StaggerItem>
                <div>
                  <label className={labelClass}>Target Locality / Micro-Market</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text" name="locality" required autoComplete="off"
                      list="locality-suggestions"
                      placeholder="e.g. Andheri East, Ghatkopar West"
                      value={formData.locality || ""}
                      onChange={handleChange}
                      className={`${inputClass} pl-10`}
                    />
                    <datalist id="locality-suggestions">
                      {LOCALITY_SUGGESTIONS.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Use East/West where applicable so the model can treat different micro-markets separately.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Property Type</label>
                    <select name="property_type" value={formData.property_type || "Apartment"} onChange={handleChange} className={inputClass}>
                      <option value="Apartment">Apartment</option>
                      <option value="Independent House">Independent House</option>
                      <option value="Villa">Villa</option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Furnishing Status</label>
                    <select name="furnishing_status" value={formData.furnishing_status || "Unfurnished"} onChange={handleChange} className={inputClass}>
                      <option value="Unfurnished">Unfurnished</option>
                      <option value="Semi-Furnished">Semi-Furnished</option>
                      <option value="Fully Furnished">Fully Furnished</option>
                    </select>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>BHK Size</label>
                    <input type="number" name="bhk_size" min="1" max="6" step="1" required placeholder="e.g. 1"
                      value={formData.bhk_size ?? ""} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Area Used by Model (Sq. Ft.)</label>
                    <input type="number" name="area_sqft" min="280" max="5500" step="1" required placeholder="e.g. 450"
                      value={formData.area_sqft ?? ""} onChange={handleChange} className={inputClass} />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Keep the area definition consistent with your dataset (for example, carpet area).
                    </p>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Bathrooms</label>
                    <input type="number" name="bathrooms" min="1" max="6" step="1" required placeholder="e.g. 1"
                      value={formData.bathrooms ?? ""} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Balconies</label>
                    <input type="number" name="balconies" min="0" max="5" step="1" required placeholder="e.g. 1"
                      value={formData.balconies ?? ""} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div>
                  <label className={labelClass}>Property Age (Years)</label>
                  <input type="number" name="property_age" min="0" max="100" step="1" required
                    placeholder="e.g. 0 for new construction"
                    value={formData.property_age ?? ""} onChange={handleChange} className={inputClass} />
                </div>
              </StaggerItem>

              <StaggerItem>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25"
                >
                  {loading ? "Calculating Valuation..." : "Run Valuation & Market Analysis"}
                </motion.button>
              </StaggerItem>
            </Stagger>
          </form>
        </div>
      </FadeInUp>
    </div>
  );
}
