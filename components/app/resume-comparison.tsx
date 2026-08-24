"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";

import type { ActivityEntry } from "@/components/app/recent-activity";

const modeLabel: Record<string, string> = {
  analysis: "ORIGINAL",
  tailoring: "TAILORED",
  builder: "BUILT",
  creator: "CREATOR",
};

/** Strips " @ Company" suffixes used by tailor/build/creator job_title values. */
function normalizeTitle(jobTitle: string | null) {
  if (!jobTitle) return null;
  return jobTitle
    .replace(/^Creator\s*—\s*/i, "")
    .split(" @ ")[0]
    .trim()
    .toLowerCase();
}

interface ComparisonGroup {
  label: string;
  entries: ActivityEntry[];
}

function buildGroups(entries: ActivityEntry[]): ComparisonGroup[] {
  const byKey = new Map<string, ActivityEntry[]>();
  for (const entry of entries) {
    const key = normalizeTitle(entry.jobTitle);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(entry);
    byKey.set(key, list);
  }

  const groups: ComparisonGroup[] = [];
  for (const [key, list] of byKey) {
    const distinctModes = new Set(list.map((e) => e.mode));
    if (distinctModes.size < 2) continue;
    // Keep the most recent entry per mode.
    const latestByMode = new Map<string, ActivityEntry>();
    for (const entry of list) {
      const existing = latestByMode.get(entry.mode);
      if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
        latestByMode.set(entry.mode, entry);
      }
    }
    groups.push({
      label: list[0].jobTitle?.split(" @ ")[0] ?? key,
      entries: [...latestByMode.values()].sort((a, b) => b.score - a.score),
    });
  }

  return groups.slice(0, 4);
}

export function ResumeComparison({ entries }: { entries: ActivityEntry[] }) {
  const groups = buildGroups(entries);
  if (groups.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-t-0 border-foreground/10 bg-surface-lowest p-7"
    >
      <div className="mb-1 flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <p className="label-sm text-muted-foreground">SIMILAR ROLES — COMPARE</p>
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Matched by role title, not a shared job description — treat as a rough comparison.
      </p>
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-sm font-semibold text-foreground mb-2 truncate">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 border border-foreground/10 bg-surface-low px-3 py-1.5"
                >
                  <span className="label-sm text-muted-foreground">
                    {modeLabel[entry.mode] ?? entry.mode}
                  </span>
                  <span className="font-display text-sm font-bold text-foreground">
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
