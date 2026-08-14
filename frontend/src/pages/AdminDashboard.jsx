import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  TrendingUp,
  MessageSquare,
  FileText,
  MapPin,
  Shield,
  Search,
  RefreshCw,
  Loader2,
  Activity,
  Download,
  Ban,
  CheckCircle,
  X,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { FadeInUp, Stagger, StaggerItem } from "../components/ui/Motion";

const API_BASE = "http://localhost:5000/api/admin";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingRole, setUpdatingRole] = useState(null);
  const [banningId, setBanningId] = useState(null);

  // User Detail Drawer
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPredictions, setUserPredictions] = useState([]);

  const token = sessionStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // ---------- Fetchers ----------
  const fetchStats = async () => {
    const res = await axios.get(`${API_BASE}/stats`, { headers });
    if (res.data.success) setStats(res.data.data);
  };

  const fetchUsers = async () => {
    const res = await axios.get(`${API_BASE}/users`, { headers });
    if (res.data.success) setUsers(res.data.data || []);
  };

  const fetchPredictions = async () => {
    const res = await axios.get(`${API_BASE}/predictions`, { headers });
    if (res.data.success) setPredictions(res.data.data || []);
  };

  const fetchChats = async () => {
    const res = await axios.get(`${API_BASE}/chat-history`, { headers });
    if (res.data.success) setChats(res.data.data || []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStats(), fetchUsers(), fetchPredictions(), fetchChats()]);
    } catch (err) {
      toast.error("Failed to load some data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = sessionStorage.getItem("userRole");
    if (role !== "admin") {
      toast.error("Admin access required");
      navigate("/predict");
      return;
    }
    loadAll();
  }, []);

  // ---------- Role Change ----------
  const handleRoleChange = async (userId, currentRole) => {
    const newRole = currentRole.toLowerCase() === "admin" ? "user" : "admin";
    if (!window.confirm(`Change this user to ${newRole.toUpperCase()}?`)) return;

    setUpdatingRole(userId);
    try {
      const res = await axios.put(
        `${API_BASE}/update-role`,
        { user_id: userId, role: newRole },
        { headers }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: newRole.toUpperCase() } : u
          )
        );
      } else {
        toast.error(res.data.error || "Failed to update role");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Role update failed");
    } finally {
      setUpdatingRole(null);
    }
  };

  // ---------- Ban / Unban ----------
  const handleBanToggle = async (userId, currentRole) => {
    const isBanned = currentRole.toLowerCase() === "banned";
    const action = isBanned ? "unban" : "ban";

    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    setBanningId(userId);
    try {
      const endpoint = isBanned ? "/unban-user" : "/ban-user";
      const res = await axios.put(
        `${API_BASE}${endpoint}`,
        { user_id: userId },
        { headers }
      );

      if (res.data.success) {
        toast.success(res.data.message);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: isBanned ? "USER" : "BANNED" } : u
          )
        );
      } else {
        toast.error(res.data.error || "Action failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setBanningId(null);
    }
  };

  // ---------- CSV Export ----------
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headersArr = Object.keys(data[0]);
    const csvRows = [
      headersArr.join(","),
      ...data.map((row) =>
        headersArr
          .map((field) => {
            const val = row[field] ?? "";
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  // ---------- Open User Detail ----------
  const openUserDetail = (user) => {
    setSelectedUser(user);
    // Filter predictions belonging to this user
    const userPreds = predictions.filter(
      (p) => String(p.userId) === String(user.id)
    );
    setUserPredictions(userPreds);
  };

  // ---------- Filtering ----------
  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.role || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPredictions = predictions.filter((p) =>
    (p.locality || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChats = chats.filter(
    (c) =>
      (c.userEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.userMessage || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chart data for Top Localities
  const localityChartData =
    stats?.topLocalities?.map((item) => ({
      name: item.locality,
      count: item.count,
    })) || [];

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Users", icon: Users },
    { id: "predictions", label: "Predictions", icon: TrendingUp },
    { id: "chats", label: "Chat History", icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin" size={32} />
        <p>Loading admin console...</p>
      </div>
    );
  }

  return (
    <FadeInUp>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Shield size={18} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Admin Console</h1>
            </div>
            <p className="text-sm text-slate-400">
              Manage users, valuations, and system activity
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={loadAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm font-semibold text-slate-300 hover:bg-aura-card-hover"
          >
            <RefreshCw size={15} />
            Refresh Data
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm("");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-aura-card border border-aura-border text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ==================== OVERVIEW ==================== */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats.totalUsers, icon: Users, accent: "from-blue-600/30 to-blue-500/5", iconBg: "bg-blue-500/20", iconColor: "text-blue-300" },
                { label: "Predictions", value: stats.totalPredictions, icon: TrendingUp, accent: "from-emerald-600/30 to-emerald-500/5", iconBg: "bg-emerald-500/20", iconColor: "text-emerald-300" },
                { label: "Chat Sessions", value: stats.totalChats, icon: MessageSquare, accent: "from-violet-600/30 to-violet-500/5", iconBg: "bg-violet-500/20", iconColor: "text-violet-300" },
                { label: "Reports Generated", value: stats.totalReports, icon: FileText, accent: "from-amber-600/30 to-amber-500/5", iconBg: "bg-amber-500/20", iconColor: "text-amber-300" },
              ].map((card) => (
                <StaggerItem key={card.label}>
                  <div className={`relative overflow-hidden bg-gradient-to-br ${card.accent} border border-white/10 rounded-2xl p-5 shadow-lg shadow-black/10`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center justify-between mb-2 relative">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        {card.label}
                      </span>
                      <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                        <card.icon size={15} className={card.iconColor} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-50 tracking-tight relative">
                      {card.value?.toLocaleString() ?? 0}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Localities Chart */}
              <div className="bg-[#0e1626]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/10">
                <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-blue-500" />
                  Top Localities
                </h3>
                {localityChartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={localityChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={12} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#94a3b8"
                          fontSize={12}
                          width={90}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0e1626",
                            border: "1px solid #1e293b",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "#f8fafc" }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {localityChartData.map((_, index) => (
                            <Cell key={index} fill="#3b82f6" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-10 text-center">No data yet</p>
                )}
              </div>

              {/* Top Localities List */}
              <div className="bg-[#0e1626]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/10">
                <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Valuation Volume Ranking
                </h3>
                {stats.topLocalities?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topLocalities.map((item, idx) => (
                      <div
                        key={item.locality}
                        className="flex items-center justify-between px-4 py-3 bg-aura-accent border border-aura-border rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 w-5">#{idx + 1}</span>
                          <span className="font-semibold text-slate-200 capitalize">
                            {item.locality}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-blue-400">
                          {item.count} valuations
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No locality data yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== USERS ==================== */}
        {activeTab === "users" && (
          <div className="bg-aura-card border border-aura-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-aura-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-slate-100">Users ({filteredUsers.length})</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name, email or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-aura-accent border border-aura-border rounded-xl text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <button
                  onClick={() => exportToCSV(filteredUsers, "users")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-600/25"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-aura-accent/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3.5 font-semibold">ID</th>
                    <th className="px-6 py-3.5 font-semibold">Name</th>
                    <th className="px-6 py-3.5 font-semibold">Email</th>
                    <th className="px-6 py-3.5 font-semibold">Role</th>
                    <th className="px-6 py-3.5 font-semibold">Last Login</th>
                    <th className="px-6 py-3.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aura-border">
                  {filteredUsers.map((user) => {
                    const isProtected =
                      user.role === "ADMIN" &&
                      user.id ===
                        Math.min(
                          ...users.filter((u) => u.role === "ADMIN").map((u) => u.id)
                        );
                    const isBanned = user.role === "BANNED";

                    return (
                      <tr key={user.id} className="hover:bg-aura-accent/40 transition-colors">
                        <td className="px-6 py-4 text-slate-500">{user.id}</td>
                        <td className="px-6 py-4 font-semibold text-slate-200">
                          {user.name}
                          {isProtected && (
                            <span className="ml-2 text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                              DEFAULT
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300">{user.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              user.role === "ADMIN"
                                ? "bg-blue-500/15 text-blue-400"
                                : user.role === "BANNED"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-slate-500/15 text-slate-400"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {user.lastLogin || "Never"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* View Detail */}
                            <button
                              onClick={() => openUserDetail(user)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-aura-border bg-aura-accent hover:bg-blue-500/10 text-blue-400 flex items-center gap-1"
                            >
                              <Eye size={12} /> View
                            </button>

                            {/* Role Change */}
                            <button
                              onClick={() => handleRoleChange(user.id, user.role)}
                              disabled={updatingRole === user.id || isProtected || isBanned}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                                isProtected || isBanned
                                  ? "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
                                  : "border-aura-border bg-aura-accent hover:bg-blue-500/10 text-blue-400"
                              }`}
                            >
                              {updatingRole === user.id
                                ? "..."
                                : user.role === "ADMIN"
                                ? "Demote"
                                : "Make Admin"}
                            </button>

                            {/* Ban / Unban */}
                            <button
                              onClick={() => handleBanToggle(user.id, user.role)}
                              disabled={banningId === user.id || isProtected}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1 ${
                                isProtected
                                  ? "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
                                  : isBanned
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                  : "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                              }`}
                            >
                              {banningId === user.id ? (
                                "..."
                              ) : isBanned ? (
                                <>
                                  <CheckCircle size={12} /> Unban
                                </>
                              ) : (
                                <>
                                  <Ban size={12} /> Ban
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <p className="text-center text-slate-400 py-12">No users found.</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== PREDICTIONS ==================== */}
        {activeTab === "predictions" && (
          <div className="bg-aura-card border border-aura-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-aura-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-slate-100">
                Recent Valuations ({filteredPredictions.length})
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search locality..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-aura-accent border border-aura-border rounded-xl text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <button
                  onClick={() => exportToCSV(filteredPredictions, "predictions")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-600/25"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-aura-accent/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                    <th className="px-5 py-3.5 font-semibold">Locality</th>
                    <th className="px-5 py-3.5 font-semibold text-center">BHK</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Area</th>
                    <th className="px-5 py-3.5 font-semibold">Normal Range</th>
                    <th className="px-5 py-3.5 font-semibold">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aura-border">
                  {filteredPredictions.map((p) => (
                    <tr key={p.id} className="hover:bg-aura-accent/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {p.timestamp ? new Date(p.timestamp).toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-200 capitalize">
                        {p.locality}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-300">{p.bhk}</td>
                      <td className="px-5 py-3.5 text-center text-slate-300">{p.area_sqft}</td>
                      <td className="px-5 py-3.5 text-blue-400 font-medium text-xs">
                        {p.normal_min} – {p.normal_max}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{p.userId || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPredictions.length === 0 && (
                <p className="text-center text-slate-400 py-12">No predictions found.</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== CHATS ==================== */}
        {activeTab === "chats" && (
          <div className="bg-aura-card border border-aura-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-aura-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-slate-100">
                Chat History ({filteredChats.length})
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search email or message..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-aura-accent border border-aura-border rounded-xl text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <button
                  onClick={() => exportToCSV(filteredChats, "chat_history")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-600/25"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            <div className="divide-y divide-aura-border max-h-[600px] overflow-y-auto">
              {filteredChats.length === 0 ? (
                <p className="text-center text-slate-400 py-12">No chats found.</p>
              ) : (
                filteredChats.map((chat) => (
                  <div key={chat.id} className="px-6 py-4 hover:bg-aura-accent/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-400">
                        {chat.userEmail}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {chat.createdAt
                          ? new Date(chat.createdAt).toLocaleString()
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1">
                      <span className="text-slate-500 font-medium">User: </span>
                      {chat.userMessage}
                    </p>
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500 font-medium">Bot: </span>
                      {chat.botResponse?.slice(0, 180)}
                      {chat.botResponse?.length > 180 ? "..." : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== USER DETAIL DRAWER ==================== */}
        <AnimatePresence>
          {selectedUser && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedUser(null)}
                className="fixed inset-0 bg-black/60 z-40"
              />

              {/* Drawer */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-aura-card border-l border-aura-border z-50 shadow-2xl overflow-y-auto"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-100">User Details</h2>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-2 rounded-lg hover:bg-aura-accent text-slate-400"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="bg-aura-accent border border-aura-border rounded-2xl p-5 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
                        {selectedUser.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 text-lg">
                          {selectedUser.name}
                        </div>
                        <div className="text-sm text-slate-400">{selectedUser.email}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-aura-card rounded-xl p-3">
                        <div className="text-xs text-slate-500 mb-1">Role</div>
                        <div className="font-semibold text-blue-400">
                          {selectedUser.role}
                        </div>
                      </div>
                      <div className="bg-aura-card rounded-xl p-3">
                        <div className="text-xs text-slate-500 mb-1">User ID</div>
                        <div className="font-semibold text-slate-200">
                          #{selectedUser.id}
                        </div>
                      </div>
                      <div className="bg-aura-card rounded-xl p-3 col-span-2">
                        <div className="text-xs text-slate-500 mb-1">Last Login</div>
                        <div className="font-semibold text-slate-200">
                          {selectedUser.lastLogin || "Never"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Predictions */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 mb-3">
                      Recent Valuations ({userPredictions.length})
                    </h3>

                    {userPredictions.length === 0 ? (
                      <p className="text-sm text-slate-400 py-6 text-center">
                        No valuations found for this user.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {userPredictions.slice(0, 10).map((p) => (
                          <div
                            key={p.id}
                            className="bg-aura-accent border border-aura-border rounded-xl p-4"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-200 capitalize">
                                {p.locality}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {p.timestamp
                                  ? new Date(p.timestamp).toLocaleDateString()
                                  : ""}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">
                              {p.bhk} BHK • {p.area_sqft} sq.ft
                            </div>
                            <div className="text-sm font-medium text-blue-400 mt-1">
                              {p.normal_min} – {p.normal_max}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </FadeInUp>
  );
}