"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Sparkles, Clock3, ChevronDown, ChevronUp } from "lucide-react";

import { useEvaluationStore } from "@/store/evaluation-store";
import {
  getSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import { useAppSession } from "@/components/app/app-session-provider";
import type { AtsEvaluationResult, SkillEvidence } from "@/lib/ats/types";

const evidenceDotClass: Record<SkillEvidence["status"], string> = {
  not_found: "bg-foreground/30",
  weakly_implied: "bg-amber-500",
  strongly_demonstrated: "bg-emerald-500",
};

function EvidenceChip({
  skill,
  evidence,
  className,
}: {
  skill: string;
  evidence?: SkillEvidence;
  className: string;
}) {
  const [open, setOpen] = useState(false);

  if (!evidence) {
    return <span className={className}>{skill}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`inline-flex items-center gap-1.5 ${className}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${evidenceDotClass[evidence.status]}`} />
        {skill}
      </button>
      {open && (
        <p className="max-w-[12rem] text-[10px] leading-4 text-muted-foreground/70 italic">
          {evidence.evidence ?? "Not found in resume."}
        </p>
      )}
    </div>
  );
}

interface RemoteEntry {
  id: string;
  job_title: string | null;
  overall_score: number;
  mode: string;
  created_at: string;
  full_result: AtsEvaluationResult | null;
  mandatory_skills: string[];
  missing_keywords: string[];
  career_gap_summary: string | null;
  ai_insight: string | null;
}

function scoreBucket(score: number) {
  if (score >= 85) return "OPTIMIZED";
  if (score >= 70) return "STRONG FIT";
  if (score >= 55) return "MODERATE FIT";
  return "NEEDS WORK";
}

function ExpandableEntry({ entry, index }: { entry: RemoteEntry; index: number }) {
  const [open, setOpen] = useState(false);
  const evidenceBySkill = new Map(
    (entry.full_result?.skillEvidence ?? []).map((e) => [e.skill, e] as const),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="border border-foreground/10"
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-4 bg-surface-lowest px-6 py-5 text-left transition-colors hover:bg-surface-low"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-surface-highest">
            {entry.mode === "tailoring" ? (
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-foreground truncate">
              {entry.job_title || "Evaluation"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock3 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="font-display text-3xl font-bold text-foreground">
              {entry.overall_score}
            </span>
            <p className="label-sm text-muted-foreground">{scoreBucket(entry.overall_score)}</p>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-foreground/10"
          >
            <div className="bg-surface-base p-6 space-y-6">
              {/* AI Insight */}
              {entry.ai_insight && (
                <div>
                  <p className="label-sm text-muted-foreground mb-2">AI VERDICT</p>
                  <p className="text-sm leading-7 text-foreground border-l-2 border-surface-highest pl-4 italic text-muted-foreground/80">
                    {entry.ai_insight}
                  </p>
                </div>
              )}

              {/* Career Gap Summary */}
              {entry.career_gap_summary && (
                <div>
                  <p className="label-sm text-muted-foreground mb-2">CAREER GAP</p>
                  <p className="text-sm leading-7 text-foreground">{entry.career_gap_summary}</p>
                </div>
              )}

              {/* Score breakdown from full_result */}
              {entry.full_result?.breakdown && (
                <div>
                  <p className="label-sm text-muted-foreground mb-3">SCORE BREAKDOWN</p>
                  <div className="grid gap-px border border-foreground/10 md:grid-cols-5">
                    {Object.entries(entry.full_result.breakdown).map(([key, val]) => (
                      <div key={key} className="bg-surface-lowest p-4 text-center">
                        <span className="font-display text-2xl font-bold text-foreground">{val}</span>
                        <p className="label-sm mt-1 text-muted-foreground">
                          {key.replace(/([A-Z])/g, " $1").trim().toUpperCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills gap three-col */}
              <div className="grid gap-px border border-foreground/10 md:grid-cols-3">
                {entry.mandatory_skills?.length > 0 && (
                  <div className="bg-surface-lowest p-4">
                    <p className="label-sm text-muted-foreground mb-2">MANDATORY MISSING</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.mandatory_skills.map((s) => (
                        <EvidenceChip
                          key={s}
                          skill={s}
                          evidence={evidenceBySkill.get(s)}
                          className="bg-surface-highest px-2 py-0.5 text-xs text-foreground"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {entry.missing_keywords?.length > 0 && (
                  <div className="bg-surface-low p-4">
                    <p className="label-sm text-muted-foreground mb-2">MISSING KEYWORDS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.missing_keywords.slice(0, 8).map((kw) => (
                        <span key={kw} className="border border-foreground/10 px-2 py-0.5 text-xs text-foreground">
                          {kw}
                        </span>
                      ))}
                      {entry.missing_keywords.length > 8 && (
                        <span className="text-xs text-muted-foreground">
                          +{entry.missing_keywords.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {entry.full_result?.matchedSkills?.length ? (
                  <div className="bg-surface-lowest p-4">
                    <p className="label-sm text-muted-foreground mb-2">MATCHED SKILLS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.full_result.matchedSkills.slice(0, 6).map((s) => (
                        <EvidenceChip
                          key={s}
                          skill={s}
                          evidence={evidenceBySkill.get(s)}
                          className="bg-foreground px-2 py-0.5 text-[10px] font-medium text-background"
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Top suggestions */}
              {entry.full_result?.suggestions && entry.full_result.suggestions.length > 0 && (
                <div>
                  <p className="label-sm text-muted-foreground mb-3">TOP ACTIONS</p>
                  <div className="divide-y divide-foreground/10 border border-foreground/10">
                    {entry.full_result.suggestions.slice(0, 3).map((s) => (
                      <div key={s.title} className="flex gap-3 bg-surface-lowest p-4">
                        <span
                          className={`label-sm mt-0.5 shrink-0 px-1.5 py-0.5 text-[9px] ${
                            s.priority === "high"
                              ? "bg-foreground text-background"
                              : s.priority === "medium"
                                ? "bg-surface-highest text-foreground"
                                : "bg-surface-low text-muted-foreground"
                          }`}
                        >
                          {s.priority.toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{s.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LocalEntryCard({
  entry,
  index,
}: {
  entry: { id: string; jobTitleHint: string; createdAt: string; result: AtsEvaluationResult };
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="border border-foreground/10"
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-4 bg-surface-lowest px-6 py-5 text-left transition-colors hover:bg-surface-low"
      >
        <div className="min-w-0">
          <p className="font-display font-semibold text-foreground truncate">
            {entry.jobTitleHint || "Evaluation"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock3 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="font-display text-3xl font-bold text-foreground">
              {entry.result.overallScore}
            </span>
            <p className="label-sm text-muted-foreground">{scoreBucket(entry.result.overallScore)}</p>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-foreground/10"
          >
            <div className="bg-surface-base p-6 space-y-4">
              {entry.result.aiInsight && (
                <p className="text-sm italic text-muted-foreground/80 border-l-2 border-surface-highest pl-4">
                  {entry.result.aiInsight}
                </p>
              )}
              {entry.result.careerGapSummary && (
                <div>
                  <p className="label-sm text-muted-foreground mb-1">CAREER GAP</p>
                  <p className="text-sm leading-7 text-foreground">{entry.result.careerGapSummary}</p>
                </div>
              )}
              {entry.result.missingKeywords.length > 0 && (
                <div>
                  <p className="label-sm text-muted-foreground mb-2">MISSING KEYWORDS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.result.missingKeywords.slice(0, 8).map((kw) => (
                      <span key={kw} className="border border-foreground/10 px-2 py-0.5 text-xs text-foreground">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HistoryPage() {
  const { history: localHistory } = useEvaluationStore();
  const { user, ready } = useAppSession();
  const [remoteHistory, setRemoteHistory] = useState<RemoteEntry[] | null>(null);
  const isLoggedIn = Boolean(user);
  const isResolvingSession = hasSupabaseConfig() && (!ready || (Boolean(user) && remoteHistory === null));

  useEffect(() => {
    if (!ready) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) {
      setRemoteHistory(null);
      return;
    }

    let isActive = true;
    const userId = user.id;

    const loadHistory = async () => {
      const { data: rows } = await supabase
        .from("user_evaluations")
        .select(
          "id, job_title, overall_score, mode, created_at, full_result, mandatory_skills, missing_keywords, career_gap_summary, ai_insight",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!isActive) return;

      setRemoteHistory((rows as RemoteEntry[] | null) ?? []);
    };

    void loadHistory();
    return () => { isActive = false; };
  }, [ready, user]);

  const displayList =
    isLoggedIn && remoteHistory !== null ? remoteHistory : null;
  const fallbackList = localHistory;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="label-sm text-muted-foreground">RESULTS</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Evaluation History
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isResolvingSession
            ? "Loading..."
            : isLoggedIn
              ? "All evaluations synced from cloud."
              : "Session history — sign in to sync across devices."}
        </p>

        {isResolvingSession ? (
          <div className="mt-16 text-center">
            <p className="label-sm text-muted-foreground">LOADING</p>
          </div>
        ) : displayList !== null ? (
          displayList.length > 0 ? (
            <div className="mt-8 space-y-px">
              {displayList.map((entry, index) => (
                <ExpandableEntry key={entry.id} entry={entry} index={index} />
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center">
              <p className="label-sm text-muted-foreground">NO EVALUATIONS YET</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Complete your first ATS evaluation to see it here.
              </p>
            </div>
          )
        ) : fallbackList.length > 0 ? (
          <div className="mt-8 space-y-px">
            {fallbackList.map((entry, index) => (
              <LocalEntryCard key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center">
            <p className="label-sm text-muted-foreground">NO EVALUATIONS YET</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Complete your first ATS evaluation to see it here.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
