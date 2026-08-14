import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendChatMessage } from "../services/chatService";
import { Loader2, Send, Sparkles, LogIn, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScaleIn } from "../components/ui/Motion";

const SUGGESTED_PROMPTS = [
  "Looking for 2 BHK in Thane under 80L",
  "Best localities for investment in Western suburbs?",
  "Compare Andheri West vs Bandra for 3 BHK",
  "Rental yield in Badlapur vs Ambernath",
  "What drives prices in Matunga?",
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your MMR real-estate broker AI. Ask me about localities, budgets, configs (1/2/3 BHK), rental yields, or investment pockets across Mumbai Metropolitan Region.",
    },
  ]);
  const [input, setInput] = useState("");
  const [lastValuation, setLastValuation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token || token.startsWith("guest")) setIsGuest(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (isGuest) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-5">
        <ScaleIn>
          <div className="bg-aura-card border border-aura-border rounded-3xl p-10 text-center max-w-md shadow-2xl">
            <div className="inline-flex p-3.5 bg-blue-500/10 border border-blue-500 rounded-2xl mb-4">
              <Sparkles size={28} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">AI Advisor Locked</h2>
            <p className="text-sm text-slate-400 mb-6">
              The AI Real Estate Advisor is available exclusively to registered
              members.
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
              <LogIn size={16} /> Log In to Access AI Advisor
            </motion.button>
          </div>
        </ScaleIn>
      </div>
    );
  }

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setLoading(true);

    try {
      const data = await sendChatMessage(userMessage);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.reply || data.response || "No response." },
      ]);
    } catch (err) {
      const msg = err.response?.data?.error || "";
      if (
        !msg.toLowerCase().includes("suspended") &&
        !msg.toLowerCase().includes("banned")
      ) {
        toast.error("Failed to communicate with AI server");
      }
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendPrompt = (text) => {
    setInput(text);
    // Auto-send after a tick so state updates
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "user", text }]);
      setLoading(true);
      sendChatMessage(text)
        .then((data) => {
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: data.reply || data.response || "No response.",
            },
          ]);
        })
        .catch(() => {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Sorry, I encountered an error." },
          ]);
        })
        .finally(() => setLoading(false));
      setInput("");
    }, 50);
  };

  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4 sm:px-6 pb-8">
      <div className="bg-aura-card border border-aura-border rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[min(680px,calc(100vh-140px))]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-aura-border bg-gradient-to-r from-blue-600/10 via-transparent to-cyan-500/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Sparkles size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-50">
              Real Estate AI Advisor
            </h2>
            <p className="text-[11px] text-slate-400">
              MMR broker · localities · budgets · yields
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b1220]/10">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-aura-accent border border-aura-border text-slate-100 rounded-bl-md"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-slate-400 text-sm px-2"
            >
              <Loader2 className="animate-spin" size={14} />
              Checking listings & micro-markets…
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts */}
        {showSuggestions && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => sendPrompt(p)}
                className="text-[11px] px-3 py-1.5 rounded-full bg-aura-accent border border-aura-border text-slate-300 hover:border-blue-500/40 hover:text-blue-300 transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {lastValuation && (
          <div className="px-4 pb-1 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                setInput(`Explain my recent ${lastValuation.locality} valuation`)
              }
              className="text-xs px-3 py-1 bg-blue-500/15 text-blue-400 rounded-full border border-blue-500/25"
            >
              Explain last valuation
            </button>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-aura-border flex gap-2.5 bg-aura-card"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about properties, localities, or budgets…"
            className="flex-1 px-4 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-500"
          />
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-blue-600/20"
          >
            <Send size={16} />
            Send
          </motion.button>
        </form>
      </div>
    </div>
  );
}
