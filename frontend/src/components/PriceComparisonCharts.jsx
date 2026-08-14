import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function PriceComparisonChart({
  locality,
  predictedPricePerSqFt,
  predictedPriceLakhs,
  areaSqft,
  marketAvg = null,
  cityAvg = null,
}) {
  const propertyPricePerSqFt = useMemo(() => {
    const direct = Number(predictedPricePerSqFt);

    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }

    const priceLakhs = Number(predictedPriceLakhs);
    const area = Number(areaSqft);

    if (
      Number.isFinite(priceLakhs) &&
      priceLakhs > 0 &&
      Number.isFinite(area) &&
      area > 0
    ) {
      return (priceLakhs * 100000) / area;
    }

    return null;
  }, [predictedPricePerSqFt, predictedPriceLakhs, areaSqft]);

  const chartData = useMemo(() => {
    const rows = [];

    if (Number.isFinite(Number(marketAvg)) && Number(marketAvg) > 0) {
      rows.push({
        name: "Micro-Market",
        price: Number(marketAvg),
        color: "#64748b",
      });
    }

    if (
      Number.isFinite(Number(propertyPricePerSqFt)) &&
      Number(propertyPricePerSqFt) > 0
    ) {
      rows.push({
        name: "Your Property",
        price: Number(propertyPricePerSqFt),
        color: "#3b82f6",
      });
    }

    if (Number.isFinite(Number(cityAvg)) && Number(cityAvg) > 0) {
      rows.push({
        name: "City Avg (MMR)",
        price: Number(cityAvg),
        color: "#94a3b8",
      });
    }

    return rows;
  }, [marketAvg, cityAvg, propertyPricePerSqFt]);

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-200">
          Price per Sq. Ft. Comparison
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          {locality
            ? `Compared using valuation data available for ${locality}.`
            : "Compared using valuation data supplied by the backend."}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-44 flex items-center justify-center rounded-xl border border-aura-border bg-aura-accent text-sm text-slate-500">
          Market benchmark data unavailable.
        </div>
      ) : (
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, "dataMax"]}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                stroke="#64748b"
                fontSize={11}
              />

              <YAxis
                dataKey="name"
                type="category"
                stroke="#94a3b8"
                fontSize={11}
                width={105}
              />

              <Tooltip
                formatter={(value) => [
                  `₹${Number(value).toLocaleString("en-IN")} / sq.ft`,
                  "Rate",
                ]}
                contentStyle={{
                  background: "#0e1626",
                  border: "2px solid #1e293b",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#f8fafc" }}
                labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
              />

              <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}