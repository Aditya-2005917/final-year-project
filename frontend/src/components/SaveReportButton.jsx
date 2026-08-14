import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function SaveReportButton({ result, formData }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const token = sessionStorage.getItem("token");

    if (!token || token === "guest-session-token") {
      toast.error("Please log in to save reports to your watchlist.");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/reports/save",
        {
          property_data: {
            locality: formData?.locality || result?.location,
            bhk: formData?.bhk_size || 1,
            area: formData?.area_sqft || 0,
            furnishing: formData?.furnishing_status || "Unfurnished",
          },
          valuations: result?.predictions || {},
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setSaved(true);
        toast.success(response.data.message || "Saved to your portfolio!");
      } else {
        toast.error(response.data?.error || "Could not save report.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Could not save report. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.button
      whileHover={!saved ? { scale: 1.03 } : {}}
      whileTap={!saved ? { scale: 0.97 } : {}}
      onClick={handleSave}
      disabled={saving || saved}
      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
        saved
          ? "bg-emerald-600 text-white cursor-default"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      <motion.span
        key={saved ? "saved" : saving ? "saving" : "default"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="inline-block"
      >
        {saving
          ? "Saving..."
          : saved
          ? "✓ Saved to Portfolio"
          : "💾 Save to My Watchlist"}
      </motion.span>
    </motion.button>
  );
}