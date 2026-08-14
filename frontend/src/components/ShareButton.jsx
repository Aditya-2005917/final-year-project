import React, { useState } from "react";
import axios from "axios";
import { Share2, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function ShareButton({ logId }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!logId) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `http://localhost:5000/api/reports/share/${logId}`,
        {},
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      if (res.data.success && res.data.shareUrl) {
        await navigator.clipboard.writeText(res.data.shareUrl);
        setCopied(true);
        toast.success("Share link copied!");
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast.error(res.data.error || "Failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Share failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      onClick={handleShare} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-aura-accent border border-aura-border rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-500/10">
      {loading ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} className="text-emerald-400" /> : <Share2 size={12} />}
      {copied ? "Copied" : "Share"}
    </motion.button>
  );
}