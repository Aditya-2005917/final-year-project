import React, { useEffect, useMemo, useState } from "react";
import { getPrediction } from "../services/predictionService";
import PredictForm from "../components/PredictForm";
import LocalityMap from "../components/LocalityMap";
import ReportActions from "../components/ReportActions";
import ConfidenceMeter from "../components/ConfidenceMeter";
import PriceComparisonChart from "../components/PriceComparisonCharts";
import RentalYieldCalculator from "../components/RentalYieldCalculator";
import InfrastructureGrid from "../components/InfrastructureGrid";
import SaveReportButton from "../components/SaveReportButton";
import ComparableProperties from "../components/ComparableProperties";
import WhatIfSimulator from "../components/WhatIfSimulator";
import { ArrowLeft, TrendingUp, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { motion } from "framer-motion";
import { FadeInUp } from "../components/ui/Motion";

export default function Predict() {
  const [formData, setFormData] = useState({
    locality: "",
    property_type: "Apartment",
    furnishing_status: "Unfurnished",
    property_age: "",
    area_sqft: "",
    bhk_size: "",
    bathrooms: "",
    balconies: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedPrefill = localStorage.getItem("prefillPrediction");
    if (!savedPrefill) return;

    try {
      const parsed = JSON.parse(savedPrefill);
      setFormData({
        locality: String(parsed.locality || ""),
        property_type: String(parsed.propertyType || parsed.property_type || "Apartment"),
        furnishing_status: String(parsed.furnishingStatus || parsed.furnishing_status || "Unfurnished"),
        bhk_size: String(parsed.bhk ?? parsed.bhk_size ?? ""),
        area_sqft: String(parsed.area ?? parsed.area_sqft ?? ""),
        bathrooms: String(parsed.bathrooms ?? parsed.bathroom ?? ""),
        balconies: String(parsed.balconies ?? parsed.balcony ?? ""),
        property_age: String(parsed.propertyAge ?? "0"),
      });
      localStorage.removeItem("prefillPrediction");
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    const loadingToast = toast.loading("Analyzing market trends & running valuation model...");

    try {
      const payload = {
        locality: String(formData.locality || "").trim(),
        property_type: formData.property_type,
        furnishing_status: formData.furnishing_status,
        property_age: Number(formData.property_age),
        area_sqft: Number(formData.area_sqft),
        bhk_size: Number(formData.bhk_size),
        bathrooms: Number(formData.bathrooms),
        balconies: Number(formData.balconies),
      };

      const data = await getPrediction(payload);

      if (!data?.success) {
        throw new Error(data?.error || "Invalid prediction response.");
      }

      setResult(data);
      toast.dismiss(loadingToast);
      toast.success("Valuation report generated successfully!");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err?.response?.data?.error || err?.message || "Failed to fetch prediction.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/reports/download-pdf",
        { property_data: formData, valuations: result?.predictions || {} },
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        },
      );

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      link.download = "valuation-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      toast.error("Failed to download PDF report.");
    }
  };

  const handleEmailReport = async (emailAddress) => {
    try {
      await axios.post(
        "http://localhost:5000/api/reports/email-pdf",
        {
          email: emailAddress,
          property_data: formData,
          valuations: result?.predictions || {},
        },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } },
      );
      toast.success("Report emailed successfully!");
    } catch (err) {
      toast.error("Failed to send report via email.");
    }
  };

  const predictedPriceLakhs = useMemo(
    () => Number(result?.predicted_price_lakhs) || null,
    [result],
  );

  if (!result) {
    return (
      <FadeInUp>
        <PredictForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </FadeInUp>
    );
  }

  const predictions = result.predictions || {};
  const marketRates = result.price_per_sqft || {};
  const basePrice = predictions.base_price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="space-y-6">
        <div className="bg-aura-card border border-aura-border rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-blue-500">
          <div>
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
              Valuation Intelligence Report
            </span>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 mb-1.5 text-slate-100">
              {result.location || formData.locality} Market Analysis
            </h1>
            <p className="text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
              <span><strong className="text-slate-300">Config:</strong> {result.configuration}</span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span><strong className="text-slate-300">Type:</strong> {formData.property_type}</span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span><strong className="text-slate-300">Furnishing:</strong> {formData.furnishing_status}</span>
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setResult(null)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-blue-600 to-indigo-600
                       border border-blue-400/40
                       shadow-[0_0_18px_rgba(37,99,235,0.45)]
                       hover:shadow-[0_0_28px_rgba(37,99,235,0.7)]
                       hover:from-blue-500 hover:to-indigo-500
                       transition-all duration-200"
          >
            <ArrowLeft size={16} /> Modify Parameters
          </motion.button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-aura-card border border-aura-border rounded-2xl p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-slate-100">
                <TrendingUp size={20} className="text-blue-500" />
                What This Property Is Worth
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                One AI estimate, plus realistic selling bands based on how similar MMR homes actually trade.
              </p>

              <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Best estimate (most likely price)</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">{basePrice}</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Model point estimate calibrated to current secondary-market levels.
                </p>
              </div>

              <div className="space-y-2.5">
                {(() => {
                  const labelMap = {
                    Normal: {
                      title: "Fair market band",
                      hint: "Typical resale range for this config in the micro-market",
                    },
                    Premium: {
                      title: "Strong asking band",
                      hint: "Achievable if the unit is well-kept / better floor-plate",
                    },
                    Premium_Brand: {
                      title: "Top-end ceiling",
                      hint: "Upper stretch for brand society / luxury finish",
                    },
                  };
                  return Object.entries(predictions)
                    .filter(([tier]) => tier !== "base_price" && tier !== "Base_Price")
                    .map(([tier, range]) => {
                      const meta = labelMap[tier] || {
                        title: tier.replace(/_/g, " "),
                        hint: "",
                      };
                      return (
                        <div
                          key={tier}
                          className="px-4 py-3.5 bg-aura-accent border border-aura-border rounded-xl"
                        >
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-sm font-semibold text-slate-200">
                              {meta.title}
                            </span>
                            <span className="text-base font-bold text-blue-400 text-right whitespace-nowrap">
                              {Array.isArray(range)
                                ? `${range[0]} – ${range[1]}`
                                : range}
                            </span>
                          </div>
                          {meta.hint ? (
                            <p className="text-[11px] text-slate-500 mt-1">{meta.hint}</p>
                          ) : null}
                        </div>
                      );
                    });
                })()}
              </div>

              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Bands widen with uncertainty — they are not three separate models.
                Use the fair-market band for negotiation; treat the ceiling as aspirational.
              </p>
            </div>

            <ComparableProperties
              formData={formData}
              comparables={result?.comparables || []}
              matchLevel={result?.comparables_match_level}
            />

            <div className="bg-aura-card border border-aura-border rounded-2xl p-6">
              <PriceComparisonChart
                locality={result.location || formData.locality}
                areaSqft={Number(formData.area_sqft)}
                predictedPriceLakhs={predictedPriceLakhs}
                predictedPricePerSqFt={marketRates.property}
                marketAvg={marketRates.micro_market}
                cityAvg={marketRates.city_avg}
              />
            </div>

            <div className="bg-aura-card border border-aura-border rounded-2xl p-6">
              <RentalYieldCalculator result={result} />
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="bg-aura-card border border-aura-border rounded-2xl p-5">
              <h3 className="text-base font-bold flex items-center gap-2 mb-3 text-slate-100">
                <Building2 size={18} className="text-blue-500" />
                Micro-Locality Map View
              </h3>
              <div className="w-full rounded-xl overflow-hidden border border-aura-border" style={{ height: "280px", position: "relative" }}>
                <LocalityMap
                  coords={result.coords}
                  locationName={result.location || formData.locality}
                  configuration={result.configuration}
                />
              </div>
            </div>

            <div className="bg-aura-card border border-aura-border rounded-2xl p-5">
              <InfrastructureGrid
                locality={result.location || formData.locality}
                infrastructure={result.infrastructure || []}
              />
            </div>

            <div className="bg-aura-card border border-aura-border rounded-2xl p-5">
              <ConfidenceMeter
                locality={result.location || formData.locality}
                metrics={result.metrics || {}}
                comparableCount={result.comparable_count || 0}
              />
            </div>

            <div className="bg-aura-card border border-aura-border rounded-2xl p-5 space-y-4">
              <SaveReportButton result={result} formData={formData} />
              <ReportActions
                result={result}
                formData={formData}
                onDownloadPDF={handleDownloadPDF}
                onEmailReport={handleEmailReport}
              />
            </div>

            <WhatIfSimulator originalForm={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}