"use client";

import React, { useState } from "react";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: Slice[];
  title?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  isCurrency?: boolean;
}

export function PieChart({
  data,
  title,
  valuePrefix = "",
  valueSuffix = "",
  isCurrency = false,
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter out slices with value <= 0 to prevent rendering artifacts
  const activeSlices = data.filter((slice) => slice.value > 0);
  const total = activeSlices.reduce((sum, slice) => sum + slice.value, 0);

  // Donut SVG parameters
  const radius = 50;
  const strokeWidth = 14;
  const hoveredStrokeWidth = 18;
  const circumference = 2 * Math.PI * radius; // ~314.159

  // Helper to format values
  const formatVal = (val: number) => {
    if (isCurrency) {
      return "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${valuePrefix}${val.toLocaleString("pt-BR")}${valueSuffix}`;
  };

  let accumulatedPercent = 0;

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col h-full transition-all duration-300 hover:border-slate-700/60">
      {title && (
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-6 border-b border-slate-800 pb-3">
          {title}
        </h3>
      )}

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
          <svg className="w-12 h-12 text-slate-700 mb-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider">Sem dados no período</span>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Donut Chart SVG */}
          <div className="flex justify-center items-center relative">
            <svg
              viewBox="0 0 140 140"
              className="w-48 h-48 md:w-56 md:h-56 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] transform -rotate-90 select-none"
            >
              {/* Defs for gradients & filters */}
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background circle track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#1e293b"
                strokeWidth={strokeWidth}
                opacity={0.3}
              />

              {/* Active slices */}
              {activeSlices.map((slice, index) => {
                const percentage = slice.value / total;
                const strokeLength = percentage * circumference;
                const strokeOffset = accumulatedPercent * circumference;

                // Accumulate percentage for the next slice
                accumulatedPercent -= percentage;

                const isHovered = hoveredIndex === index;

                return (
                  <circle
                    key={slice.label}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? hoveredStrokeWidth : strokeWidth}
                    strokeDasharray={`${strokeLength} ${circumference}`}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-300 cursor-pointer origin-center"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      filter: isHovered ? "url(#glow)" : "none",
                      opacity: hoveredIndex !== null && !isHovered ? 0.4 : 1,
                    }}
                  />
                );
              })}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">
                {hoveredIndex !== null ? activeSlices[hoveredIndex].label : "Total Geral"}
              </span>
              <span className="text-sm md:text-xl font-black text-white mt-0.5 truncate max-w-[140px] drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                {hoveredIndex !== null ? formatVal(activeSlices[hoveredIndex].value) : formatVal(total)}
              </span>
              <span className="text-[9px] md:text-[10px] font-extrabold text-cyan-400 font-mono mt-0.5">
                {hoveredIndex !== null
                  ? `${((activeSlices[hoveredIndex].value / total) * 100).toFixed(1)}%`
                  : "100%"}
              </span>
            </div>

          </div>

          {/* Interactive Side Legend */}
          <div className="space-y-3 font-sans">
            {activeSlices.map((slice, index) => {
              const percentage = (slice.value / total) * 100;
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={slice.label}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? "bg-slate-800/80 border-slate-700 shadow-md translate-x-1"
                      : "bg-slate-900/30 border-transparent hover:bg-slate-800/20 hover:border-slate-800/50"
                  }`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-center gap-3">
                    {/* Color dot with pulsing inner element */}
                    <div className="relative flex items-center justify-center w-3 h-3 shrink-0">
                      <span
                        className="absolute inset-0 rounded-full opacity-35 animate-ping"
                        style={{ backgroundColor: slice.color }}
                      ></span>
                      <span
                        className="w-2.5 h-2.5 rounded-full z-10"
                        style={{ backgroundColor: slice.color }}
                      ></span>
                    </div>
                    <div>
                      <span className={`text-xs font-bold transition-colors ${isHovered ? "text-white" : "text-slate-300"}`}>
                        {slice.label}
                      </span>
                      <span className="text-[9px] font-extrabold font-mono text-slate-500 block">
                        {percentage.toFixed(1)}% do total
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black block font-mono ${isHovered ? "text-cyan-400" : "text-slate-200"}`}>
                      {formatVal(slice.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
