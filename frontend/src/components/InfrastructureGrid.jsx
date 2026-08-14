import React from "react";
import { motion } from "framer-motion";
import { Stagger, StaggerItem } from "../components/ui/Motion";

export default function InfrastructureGrid({
  locality,
  infrastructure = [],
}) {
  const highlights = Array.isArray(infrastructure)
    ? infrastructure.filter(
        (item) =>
          item &&
          item.title &&
          item.description &&
          item.category
      )
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-200">
          Micro-Market Infrastructure & Growth Drivers
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Locality-specific drivers supplied by the valuation data service.
        </p>
      </div>

      {highlights.length === 0 ? (
        <div className="rounded-xl border border-aura-border bg-aura-accent p-4">
          <p className="text-sm font-semibold text-slate-200">
            Local infrastructure data unavailable
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            No verified locality-specific infrastructure records were returned
            for {locality || "this market"}. The valuation model is not adjusted
            using invented infrastructure claims.
          </p>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {highlights.map((item, index) => (
            <StaggerItem key={`${item.category}-${item.title}-${index}`}>
              <motion.div
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="bg-aura-accent border border-aura-border rounded-xl p-3.5 h-full flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wide">
                      {item.category}
                    </span>

                    {item.impact ? (
                      <span className="text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded font-semibold">
                        {item.impact}
                      </span>
                    ) : null}
                  </div>

                  <h5 className="text-sm font-bold text-slate-100 mb-1">
                    {item.title}
                  </h5>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}