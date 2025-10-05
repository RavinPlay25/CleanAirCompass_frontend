"use client";

import React from "react";

type Sub = { pm25?: number; o3?: number; no2?: number; co?: number };

type Props = {
  /** Overall AQI 0–500 */
  value: number;
  /** Optional sub-index values (0–500) */
  sub?: Sub;
  /** Pixel height of the SVG container */
  height?: number;
  /** Put the needle above or below the bar */
  needlePosition?: "above" | "below";
};

const SEGMENTS: Array<{ label: string; lo: number; hi: number; color: string }> = [
  { label: "Good", lo: 0, hi: 50, color: "#2ECC71" },
  { label: "Moderate", lo: 51, hi: 100, color: "#F1C40F" },
  { label: "USG", lo: 101, hi: 150, color: "#E67E22" },
  { label: "Unhealthy", lo: 151, hi: 200, color: "#E74C3C" },
  { label: "Very Unhealthy", lo: 201, hi: 300, color: "#8E44AD" },
  { label: "Hazardous", lo: 301, hi: 500, color: "#7D3C98" },
];

const SUB_COLORS = {
  pm25: "#0ea5e9", // blue
  no2: "#6366f1",  // indigo
  o3:  "#10b981",  // emerald
  co:  "#ef4444",  // red
};

export default function AQNumberLine({
  value,
  sub,
  height = 100,
  needlePosition = "below",
}: Props) {
  const W = 1000;               // internal viewBox width
  const H = Math.max(72, height);
  const PADX = 24;
  const BAR_Y = needlePosition === "above" ? H * 0.45 : H * 0.35;
  const BAR_H = 14;

  const x = (v: number) => PADX + (Math.min(Math.max(v, 0), 500) / 500) * (W - PADX * 2);

  const needleX = x(value);
  const tickVals = [0, 50, 100, 150, 200, 300, 500];

  const subPoints: Array<{ key: keyof Sub; v: number; cx: number; color: string }> = [];
  (["pm25", "o3", "no2", "co"] as Array<keyof Sub>).forEach((k) => {
    const v = sub?.[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      subPoints.push({ key: k, v, cx: x(v), color: (SUB_COLORS as any)[k] });
    }
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Bands */}
        {SEGMENTS.map((s, i) => {
          const x1 = x(s.lo);
          const x2 = x(s.hi);
          return (
            <rect
              key={i}
              x={x1}
              y={BAR_Y}
              width={Math.max(1, x2 - x1)}
              height={BAR_H}
              rx={8}
              fill={s.color}
            />
          );
        })}

        {/* Bar outline */}
        <rect
          x={x(0)}
          y={BAR_Y}
          width={x(500) - x(0)}
          height={BAR_H}
          rx={8}
          fill="none"
          stroke="#111827"
          strokeOpacity="0.25"
        />

        {/* Ticks + labels */}
        {tickVals.map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={BAR_Y + BAR_H}
              y2={BAR_Y + BAR_H + 12}
              stroke="#111827"
              strokeOpacity="0.35"
              strokeWidth={1}
            />
            <text
              x={x(t)}
              y={BAR_Y + BAR_H + 28}
              textAnchor="middle"
              fontSize={12}
              fill="#374151"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Category labels */}
        {SEGMENTS.map((s, i) => (
          <text
            key={`lbl-${i}`}
            x={(x(s.lo) + x(s.hi)) / 2}
            y={BAR_Y - 10}
            textAnchor="middle"
            fontSize={12}
            fill="#374151"
          >
            {s.label}
          </text>
        ))}

        {/* Needle */}
        <g>
          {/* needle line */}
          <line
            x1={needleX}
            x2={needleX}
            y1={needlePosition === "above" ? BAR_Y - 20 : BAR_Y + BAR_H + 20}
            y2={needlePosition === "above" ? BAR_Y - 1 : BAR_Y + BAR_H + 1}
            stroke="#111827"
            strokeWidth={3.5}
          />
          {/* head */}
          <circle
            cx={needleX}
            cy={needlePosition === "above" ? BAR_Y - 24 : BAR_Y + BAR_H + 24}
            r={8}
            fill="#111827"
          />
          <text
            x={needleX}
            y={needlePosition === "above" ? BAR_Y - 34 : BAR_Y + BAR_H + 40}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill="#111827"
          >
            {Math.round(Math.min(Math.max(value, 0), 500))}
          </text>
        </g>

        {/* Sub-index dots + legend markers right under the bar */}
        {subPoints.map((p, i) => (
          <g key={`sub-${i}`}>
            <circle cx={p.cx} cy={BAR_Y + BAR_H + 56} r={6} fill={p.color} />
          </g>
        ))}
      </svg>

      {/* Legend */}
      {subPoints.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          {subPoints.map((p) => (
            <div key={`lg-${p.key}`} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ background: p.color }}
              />
              <span className="uppercase">{p.key}</span>
              <span className="font-semibold text-[var(--text)]">{Math.round(p.v)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 text-[11px] text-[var(--muted)]">
        Scale: 0 → 500 (US EPA). Needle shows overall AQI; colored dots mark sub-indices.
      </div>
    </div>
  );
}
