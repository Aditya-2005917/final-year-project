import React from "react";

const matchLabels = {
  same_micro_market: "Same micro-market",
  same_parent_locality: "Same parent locality",
  same_region: "Same MMR region",
  none: "No comparable data",
};

export default function ComparableProperties({
  comparables = [],
  formData = {},
  matchLevel = "none",
}) {
  const rows = Array.isArray(comparables) ? comparables : [];

  return (
    <div className="bg-aura-card border border-aura-border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-100">
            Comparable Listings
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ranked by locality, configuration and area similarity.
          </p>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-blue-400">{rows.length}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            matches
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-aura-border bg-aura-accent p-4 text-sm text-slate-500">
          No sufficiently similar properties were found for{" "}
          {formData.locality || "this market"}.
        </div>
      ) : (
        <>
          <div className="mb-3 text-[11px] text-slate-500">
            Match scope:{" "}
            <span className="text-slate-300 font-semibold">
              {matchLabels[matchLevel] || "Regional"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows.map((item, index) => (
              <div
                key={`${item.locality}-${item.area_sqft}-${item.price_lakhs}-${index}`}
                className="rounded-xl border border-aura-border bg-aura-accent p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      {item.locality}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {item.bhk} BHK • {Number(item.area_sqft).toLocaleString("en-IN")} sq.ft
                      {item.furnishing ? ` • ${item.furnishing}` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-400">
                      ₹{Number(item.price_lakhs).toFixed(2)} L
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ₹{Math.round(Number(item.price_per_sqft)).toLocaleString("en-IN")}/sq.ft
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Similarity
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {Number(item.similarity_score).toFixed(0)}%
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, Number(item.similarity_score) || 0),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}