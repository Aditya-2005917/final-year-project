import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ReportActions({ onDownloadPDF, onEmailReport }) {
  const [email, setEmail] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownloadPDF();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) return;

    setIsEmailing(true);
    try {
      await onEmailReport(email);
      setEmailSent(true);
      setEmail("");
      setTimeout(() => setEmailSent(false), 4000);
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-100">Export & Share Report</h4>
        <p className="text-xs text-slate-400 mt-0.5">Download PDF or email the valuation report.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-semibold rounded-xl transition"
        >
          {isDownloading ? "Generating PDF..." : "📥 Download PDF"}
        </motion.button>

        <form onSubmit={handleEmailSubmit} className="flex-1 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="flex-1 px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isEmailing}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl whitespace-nowrap"
          >
            {isEmailing ? "Sending..." : "✉️ Send"}
          </motion.button>
        </form>
      </div>

      <AnimatePresence>
        {emailSent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-center text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2"
          >
            ✅ Report successfully sent to your inbox!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}