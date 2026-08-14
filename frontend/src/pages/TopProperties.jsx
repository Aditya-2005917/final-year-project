import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Building2,
  Filter,
  Loader2,
  MapPin,
  Home,
  Bath,
  Layers,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  X,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FadeInUp, Stagger, StaggerItem } from "../components/ui/Motion";

const API = "http://localhost:5000/api/properties";

const defaultFilters = {
  bhk: "",
  furnishing: "",
  property_type: "",
  min_age: "",
  max_age: "",
  locality: "",
  sort: "price",
  order: "desc",
};

export default function TopProperties() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 24,
    offset: 0,
    total: 0,
    has_more: false,
  });
  const [showFilters, setShowFilters] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/suggestions`);
      if (res.data.success) setSuggestions(res.data.suggestions);
    } catch (e) {
      console.error("Suggestions error", e);
    }
  }, []);

  const fetchProperties = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        if (filters.bhk) params.set("bhk", filters.bhk);
        if (filters.furnishing) params.set("furnishing", filters.furnishing);
        if (filters.property_type)
          params.set("property_type", filters.property_type);
        if (filters.min_age !== "") params.set("min_age", filters.min_age);
        if (filters.max_age !== "") params.set("max_age", filters.max_age);
        if (filters.locality) params.set("locality", filters.locality);
        params.set("sort", filters.sort);
        params.set("order", filters.order);
        params.set("limit", "24");
        params.set("offset", String(offset));

        const res = await axios.get(`${API}/top?${params.toString()}`);
        if (res.data.success) {
          setProperties((prev) =>
            append ? [...prev, ...res.data.data] : res.data.data
          );
          setStats(res.data.stats);
          setPagination(res.data.pagination);
        } else {
          toast.error(res.data.error || "Failed to load properties");
        }
      } catch (err) {
        toast.error(
          err.response?.data?.error || "Failed to fetch top properties"
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  useEffect(() => {
    fetchProperties(0, false);
  }, [fetchProperties]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyQuickFilter = (type, value) => {
    if (type === "bhk") setFilters((p) => ({ ...p, bhk: String(value) }));
    if (type === "furnishing")
      setFilters((p) => ({ ...p, furnishing: value }));
    if (type === "property_type")
      setFilters((p) => ({ ...p, property_type: value }));
    if (type === "age") {
      if (value.includes("New"))
        setFilters((p) => ({ ...p, min_age: "0", max_age: "0" }));
      else if (value.includes("1-5"))
        setFilters((p) => ({ ...p, min_age: "1", max_age: "5" }));
      else if (value.includes("6-10"))
        setFilters((p) => ({ ...p, min_age: "6", max_age: "10" }));
      else if (value.includes("10+"))
        setFilters((p) => ({ ...p, min_age: "11", max_age: "99" }));
    }
    if (type === "locality") setFilters((p) => ({ ...p, locality: value }));
  };

  const clearFilters = () => setFilters(defaultFilters);

  const loadMore = () => {
    if (pagination.has_more && !loadingMore) {
      fetchProperties(pagination.offset + pagination.limit, true);
    }
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== "" && k !== "sort" && k !== "order"
  ).length;

  const pageStats = useMemo(() => {
    if (!properties.length) {
      return { avgPrice: 0, avgArea: 0, avgPps: 0 };
    }
    const totalPrice = properties.reduce((s, p) => s + (p.price_lakhs || 0), 0);
    const totalArea = properties.reduce((s, p) => s + (p.area_sqft || 0), 0);
    const totalPps = properties.reduce(
      (s, p) => s + (p.price_per_sqft || 0),
      0
    );
    return {
      avgPrice: totalPrice / properties.length,
      avgArea: totalArea / properties.length,
      avgPps: totalPps / properties.length,
    };
  }, [properties]);

  const formatPrice = (lakhs) => {
    if (!lakhs) return "—";
    if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
    return `₹${lakhs.toFixed(1)} L`;
  };

  const displayAvgPrice =
    stats?.median_price_lakhs != null
      ? formatPrice(stats.median_price_lakhs)
      : formatPrice(pageStats.avgPrice);

  const displayAvgArea =
    stats?.median_price_lakhs != null
      ? `${stats.avg_area?.toLocaleString() ?? "—"} sq.ft`
      : `${Math.round(pageStats.avgArea).toLocaleString()} sq.ft`;

  const displayAvgPps =
    stats?.median_price_lakhs != null
      ? `₹${stats.avg_price_per_sqft?.toLocaleString("en-IN") ?? "—"}`
      : `₹${Math.round(pageStats.avgPps).toLocaleString("en-IN")}`;

  return (
    <FadeInUp>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={22} className="text-blue-500" />
              <h1 className="text-2xl font-bold text-slate-100">
                Top MMR Properties
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Explore ranked listings across Mumbai Metropolitan Region with
              live filters
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Source: cleaned secondary-market dataset (2024+) with
              locality-level market calibration applied. Prices reflect adjusted
              asking levels.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm font-semibold text-slate-300 hover:bg-aura-card-hover"
            >
              <Filter size={15} />
              Filters{" "}
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fetchProperties(0, false)}
              className="flex items-center gap-2 px-4 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm font-semibold text-slate-300 hover:bg-aura-card-hover"
            >
              <RefreshCw size={15} /> Refresh
            </motion.button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: "Matching",
                value: stats.total_matching?.toLocaleString() ?? "—",
                icon: Layers,
                sub: "Total in filter",
                accent: "from-blue-600/20 to-blue-500/5",
                iconColor: "text-blue-400",
              },
              {
                label: "Median / Page Avg",
                value: displayAvgPrice,
                icon: TrendingUp,
                sub:
                  stats?.median_price_lakhs != null
                    ? "Median of all matches"
                    : "Avg of loaded cards",
                accent: "from-emerald-600/20 to-emerald-500/5",
                iconColor: "text-emerald-400",
              },
              {
                label: "Avg Area",
                value: displayAvgArea,
                icon: Home,
                sub: "Filtered set",
                accent: "from-violet-600/20 to-violet-500/5",
                iconColor: "text-violet-400",
              },
              {
                label: "Avg ₹/sq.ft",
                value: displayAvgPps,
                icon: MapPin,
                sub: "Filtered set",
                accent: "from-amber-600/20 to-amber-500/5",
                iconColor: "text-amber-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`relative overflow-hidden bg-gradient-to-br ${s.accent} border border-aura-border rounded-xl p-4`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {s.label}
                  </span>
                  <s.icon size={15} className={s.iconColor} />
                </div>
                <div className="text-xl font-bold text-slate-50 tracking-tight">
                  {s.value}
                </div>
                {s.sub && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {s.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-aura-card border border-aura-border rounded-2xl p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                      BHK
                    </label>
                    <select
                      value={filters.bhk}
                      onChange={(e) =>
                        handleFilterChange("bhk", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    >
                      <option value="">Any</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} BHK
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                      Furnishing
                    </label>
                    <select
                      value={filters.furnishing}
                      onChange={(e) =>
                        handleFilterChange("furnishing", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    >
                      <option value="">Any</option>
                      <option value="Unfurnished">Unfurnished</option>
                      <option value="Semi-Furnished">Semi-Furnished</option>
                      <option value="Fully Furnished">Fully Furnished</option>
                      <option value="Furnished">Furnished</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                      Type
                    </label>
                    <select
                      value={filters.property_type}
                      onChange={(e) =>
                        handleFilterChange("property_type", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    >
                      <option value="">Any</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Villa">Villa</option>
                      <option value="Independent House">
                        Independent House
                      </option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                      Min Age
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Any"
                      value={filters.min_age}
                      onChange={(e) =>
                        handleFilterChange("min_age", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                      Max Age
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Any"
                      value={filters.max_age}
                      onChange={(e) =>
                        handleFilterChange("max_age", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                      Locality
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Andheri"
                      value={filters.locality}
                      onChange={(e) =>
                        handleFilterChange("locality", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">
                      Sort by
                    </span>
                    <select
                      value={filters.sort}
                      onChange={(e) =>
                        handleFilterChange("sort", e.target.value)
                      }
                      className="px-3 py-2 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    >
                      <option value="price">Price</option>
                      <option value="price_per_sqft">₹ / sq.ft</option>
                      <option value="area">Area</option>
                      <option value="age">Age</option>
                    </select>
                    <select
                      value={filters.order}
                      onChange={(e) =>
                        handleFilterChange("order", e.target.value)
                      }
                      className="px-3 py-2 bg-aura-accent border border-aura-border rounded-xl text-sm"
                    >
                      <option value="asc">Low → High</option>
                      <option value="desc">High → Low</option>
                    </select>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300"
                    >
                      <X size={13} /> Clear all filters
                    </button>
                  )}
                </div>

                {suggestions && (
                  <div className="space-y-3 pt-2 border-t border-aura-border">
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Popular filters
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.bhk?.slice(0, 4).map((s) => (
                        <button
                          key={`bhk-${s.bhk}`}
                          onClick={() => applyQuickFilter("bhk", s.bhk)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition ${
                            filters.bhk === String(s.bhk)
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-aura-accent border-aura-border text-slate-300 hover:border-blue-500/50"
                          }`}
                        >
                          {s.bhk} BHK{" "}
                          <span className="text-slate-500">({s.count})</span>
                        </button>
                      ))}
                      {suggestions.furnishing?.map((s) => (
                        <button
                          key={`furn-${s.furnishing}`}
                          onClick={() =>
                            applyQuickFilter("furnishing", s.furnishing)
                          }
                          className={`text-xs px-3 py-1.5 rounded-full border transition ${
                            filters.furnishing === s.furnishing
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-aura-accent border-aura-border text-slate-300 hover:border-blue-500/50"
                          }`}
                        >
                          {s.furnishing}{" "}
                          <span className="text-slate-500">({s.count})</span>
                        </button>
                      ))}
                      {suggestions.age?.map((s) => (
                        <button
                          key={`age-${s.age_bucket}`}
                          onClick={() =>
                            applyQuickFilter("age", s.age_bucket)
                          }
                          className="text-xs px-3 py-1.5 rounded-full border bg-aura-accent border-aura-border text-slate-300 hover:border-blue-500/50 transition"
                        >
                          {s.age_bucket}{" "}
                          <span className="text-slate-500">({s.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main layout: cards + sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-9">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                <Loader2 className="animate-spin" size={32} />
                <p>Loading top MMR properties...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-aura-card border border-aura-border rounded-2xl p-16 text-center">
                <Building2 size={40} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-200 mb-2">
                  No properties found
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Try relaxing your filters or clearing them to see more
                  results.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.map((p, idx) => (
                    <StaggerItem key={`${p.id}-${idx}`}>
                      <motion.div
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className="group relative bg-aura-card border border-aura-border rounded-2xl overflow-hidden h-full flex flex-col hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
                      >
                        {/* Top accent bar */}
                        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity" />

                        <div className="p-5 flex flex-col flex-1 justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-3 gap-2">
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-50 capitalize text-base truncate">
                                  {p.locality}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {p.property_type}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {p.bhk} BHK
                                </span>
                                {p.price_per_sqft >= 40000 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Premium
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-400 mb-4">
                              <span className="inline-flex items-center gap-1 bg-aura-accent/60 px-2 py-0.5 rounded-md">
                                <Home size={11} className="text-blue-400" />
                                {p.area_sqft.toLocaleString()} sq.ft
                              </span>
                              <span className="inline-flex items-center gap-1 bg-aura-accent/60 px-2 py-0.5 rounded-md">
                                <Bath size={11} className="text-violet-400" />
                                {p.bathrooms} Bath
                              </span>
                              <span className="inline-flex items-center gap-1 bg-aura-accent/60 px-2 py-0.5 rounded-md">
                                <Layers size={11} className="text-emerald-400" />
                                {p.furnishing}
                              </span>
                              <span className="inline-flex items-center gap-1 bg-aura-accent/60 px-2 py-0.5 rounded-md">
                                Age: {p.age === 0 ? "New" : `${p.age} yrs`}
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-aura-border/80 flex items-end justify-between gap-2">
                            <div>
                              <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                                {p.price_display}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                ₹{p.price_per_sqft.toLocaleString("en-IN")}/sq.ft
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                localStorage.setItem(
                                  "prefillPrediction",
                                  JSON.stringify({
                                    locality: p.locality,
                                    bhk: p.bhk,
                                    area: p.area_sqft,
                                    bathrooms: p.bathrooms,
                                    balconies: p.balconies,
                                    propertyAge: p.age,
                                    propertyType: p.property_type,
                                    furnishingStatus: p.furnishing,
                                  })
                                );
                                window.location.href = "/predict";
                              }}
                              className="text-xs font-semibold px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 active:scale-95 transition shadow-md shadow-blue-600/25"
                            >
                              Value this
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </Stagger>

                {pagination.has_more && (
                  <div className="flex justify-center mt-8">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-3 bg-aura-accent border border-aura-border rounded-xl text-sm font-semibold text-slate-200 hover:bg-aura-card-hover disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />{" "}
                          Loading...
                        </>
                      ) : (
                        <>
                          Load more <ChevronDown size={16} />
                        </>
                      )}
                    </motion.button>
                  </div>
                )}

                <p className="text-center text-xs text-slate-500 mt-4">
                  Showing {properties.length} of{" "}
                  {pagination.total.toLocaleString()} matching properties
                </p>
              </>
            )}
          </div>

          {/* Sidebar – Top by Locality */}
          <div className="xl:col-span-3 space-y-5">
            {suggestions?.localities?.length > 0 && (
              <div className="bg-aura-card border border-aura-border rounded-2xl p-5 sticky top-24 shadow-lg shadow-black/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <BarChart3 size={15} className="text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Top by Locality
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {suggestions.localities.slice(0, 10).map((loc, i) => (
                    <button
                      key={loc.locality}
                      onClick={() =>
                        applyQuickFilter("locality", loc.locality)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition group ${
                        filters.locality.toLowerCase() ===
                        loc.locality.toLowerCase()
                          ? "bg-blue-600/25 border border-blue-500/50"
                          : "bg-aura-accent/80 border border-transparent hover:border-blue-500/30 hover:bg-aura-accent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            i < 3
                              ? "bg-blue-500/25 text-blue-300"
                              : "bg-slate-700/50 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-200 capitalize truncate group-hover:text-white">
                          {loc.locality}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue-400 shrink-0 ml-2 tabular-nums">
                        {loc.count}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-3 leading-relaxed border-t border-aura-border pt-3">
                  Click a locality to filter listings instantly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </FadeInUp>
  );
}
