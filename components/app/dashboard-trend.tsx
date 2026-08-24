"use client";

import { motion } from "framer-motion";

import { relativeTime } from "@/lib/utils";

interface TrendPoint {
  score: number;
  createdAt: string;
}

interface DashboardTrendProps {
  /** Newest first. */
  points: TrendPoint[];
}

export function DashboardTrend({ points }: DashboardTrendProps) {
  if (points.length === 0) return null;

  const chronological = [...points].reverse().slice(-14);
  const lastScan = points[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="label-sm text-white/40">SCORE TREND</p>
        <p className="text-[10px] text-white/40">
          Last scan {relativeTime(lastScan.createdAt)}
        </p>
      </div>
      <div className="flex items-end gap-1 h-10">
        {chronological.map((point, i, arr) => (
          <motion.div
            key={`${point.createdAt}-${i}`}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(point.score * 0.4, 4)}px` }}
            transition={{ duration: 0.5, delay: i * 0.03 }}
            className={`flex-1 max-w-3 rounded-t-sm ${
              i === arr.length - 1 ? "bg-white" : "bg-white/25"
            }`}
            title={`${point.score} · ${new Date(point.createdAt).toLocaleDateString()}`}
          />
        ))}
      </div>
    </div>
  );
}
