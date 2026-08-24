"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScanSearch, Wand2, PenLine, Sparkles, ChevronRight } from "lucide-react";

import { relativeTime } from "@/lib/utils";

export interface ActivityEntry {
  id: string;
  jobTitle: string | null;
  score: number;
  mode: string;
  createdAt: string;
}

const modeIcon: Record<string, typeof ScanSearch> = {
  analysis: ScanSearch,
  tailoring: Wand2,
  builder: PenLine,
  creator: Sparkles,
};

const modeLabel: Record<string, string> = {
  analysis: "Analyze",
  tailoring: "Tailor",
  builder: "Build",
  creator: "Creator",
};

export function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-t-0 border-foreground/10 bg-surface-lowest p-7"
    >
      <p className="label-sm text-muted-foreground mb-4">RECENT ACTIVITY</p>
      <div className="divide-y divide-foreground/10">
        {entries.slice(0, 8).map((entry) => {
          const Icon = modeIcon[entry.mode] ?? ScanSearch;
          return (
            <div key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-surface-highest">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {entry.jobTitle || "Evaluation"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {modeLabel[entry.mode] ?? entry.mode} · {relativeTime(entry.createdAt)}
                </p>
              </div>
              <span className="font-display text-lg font-bold text-foreground shrink-0">
                {entry.score}
              </span>
            </div>
          );
        })}
      </div>
      <Link
        href="/app/history"
        className="mt-5 flex items-center gap-1.5 label-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        VIEW ALL HISTORY <ChevronRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
}
