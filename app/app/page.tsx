"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Route } from "next";
import {
  ScanSearch,
  Wand2,
  PenLine,
  Sparkles,
  ArrowRight,
  BarChart3,
  Target,
  TrendingUp,
  Zap,
  AlertCircle,
  Hammer,
  ChevronRight,
} from "lucide-react";

import { useEvaluationStore } from "@/store/evaluation-store";
import {
  getSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import type { CareerSummary, ProjectRecommendation } from "@/lib/ats/types";

interface RemoteEntry {
  id: string;
  job_title: string | null;
  overall_score: number;
  mode: string;
  created_at: string;
  mandatory_skills: string[];
  missing_keywords: string[];
}

export default function AppDashboardPage() {
  const { history: localHistory } = useEvaluationStore();
  const [mountedAt] = useState(() => Date.now());
  const [remoteHistory, setRemoteHistory] = useState<RemoteEntry[] | null>(
    null,
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [careerSummary, setCareerSummary] = useState<
    | (CareerSummary & {
        total_analyses: number;
        avg_score: number;
        best_score: number;
      })
    | null
  >(null);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;
      setIsLoggedIn(true);

      const [historyRes, summaryRes] = await Promise.all([
        supabase
          .from("user_evaluations")
          .select(
            "id, job_title, overall_score, mode, created_at, mandatory_skills, missing_keywords",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("user_career_summary")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (active) {
        setRemoteHistory((historyRes.data as RemoteEntry[] | null) ?? []);
        if (summaryRes.data) {
          setCareerSummary({
            topSkillGaps: summaryRes.data.top_skill_gaps ?? [],
            projectsToStart: (summaryRes.data.projects_to_start ??
              []) as ProjectRecommendation[],
            targetRoles: summaryRes.data.target_roles ?? [],
            careerNarrative: summaryRes.data.career_narrative ?? "",
            nextStep: summaryRes.data.next_step ?? "",
            progressSummary: summaryRes.data.progress_summary ?? null,
            total_analyses: summaryRes.data.total_analyses ?? 0,
            avg_score: summaryRes.data.avg_score ?? 0,
            best_score: summaryRes.data.best_score ?? 0,
          });
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    // Prefer server-derived stats from user_career_summary when logged in
    if (isLoggedIn && careerSummary && careerSummary.total_analyses > 0) {
      const oneWeekAgo = mountedAt - 7 * 24 * 60 * 60 * 1000;
      const thisWeek = remoteHistory
        ? remoteHistory.filter(
            (h) => new Date(h.created_at).getTime() > oneWeekAgo,
          ).length
        : 0;
      return {
        total: careerSummary.total_analyses,
        avg: careerSummary.avg_score,
        best: careerSummary.best_score,
        thisWeek,
      };
    }

    const useRemote = isLoggedIn && remoteHistory !== null;
    const entries = useRemote ? remoteHistory! : localHistory;
    if (entries.length === 0) return null;

    const scores = useRemote
      ? remoteHistory!.map((h) => h.overall_score)
      : localHistory.map((h) => h.result.overallScore);

    const total = scores.length;
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / total);
    const best = Math.max(...scores);
    const oneWeekAgo = mountedAt - 7 * 24 * 60 * 60 * 1000;

    const thisWeek = useRemote
      ? remoteHistory!.filter(
          (h) => new Date(h.created_at).getTime() > oneWeekAgo,
        ).length
      : localHistory.filter((h) => new Date(h.createdAt).getTime() > oneWeekAgo)
          .length;

    return { total, avg, best, thisWeek };
  }, [localHistory, remoteHistory, isLoggedIn, mountedAt, careerSummary]);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-lg:mb-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="label-sm text-muted-foreground">PRECISION PORTAL</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          What do you want to do?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a tool below to get started.
        </p>

        <div className="mt-8 grid gap-px border border-foreground/10 lg:grid-cols-3">
          {/* Analyze — wide card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex flex-col justify-between bg-surface-lowest p-7 lg:col-span-2"
          >
            <div>
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center bg-foreground text-primary-foreground">
                  <ScanSearch className="h-5 w-5" />
                </div>
                <span className="label-sm text-muted-foreground">
                  ATS GAP ANALYSIS
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Find the gap. Close it.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Get a precise ATS score, skill gaps, what to learn, and what
                projects to build to land the role.
              </p>
            </div>
            <Link
              href="/app/analyze"
              className="mt-8 inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-80 self-start"
            >
              ANALYZE RESUME
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          {/* Tailor */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col justify-between bg-surface-lowest p-7"
          >
            <div>
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center bg-surface-highest text-foreground">
                  <Wand2 className="h-5 w-5" />
                </div>
                <span className="label-sm text-muted-foreground">
                  RESUME TAILORING
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Rewrite for the role.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Mirror the JD&apos;s exact vocabulary and requirements in your
                resume.
              </p>
            </div>
            <Link
              href="/app/tailor"
              className="mt-8 inline-flex items-center gap-2 border border-foreground/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-surface-low self-start"
            >
              TAILOR RESUME
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          {/* Build */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-col justify-between bg-surface-lowest p-7"
          >
            <div>
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center bg-surface-highest text-foreground">
                  <PenLine className="h-5 w-5" />
                </div>
                <span className="label-sm text-muted-foreground">
                  RESUME BUILDER
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Build from scratch.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Generate a JD-matched resume from your saved profile in one
                click.
              </p>
            </div>
            <Link
              href="/app/build"
              className="mt-8 inline-flex items-center gap-2 border border-foreground/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-surface-low self-start"
            >
              BUILD RESUME
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          {/* Creator — wide card (new feature) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col justify-between bg-surface-lowest p-7 lg:col-span-2"
          >
            <div>
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center bg-foreground text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="label-sm text-muted-foreground">
                  RESUME CREATOR
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Target a role. Not a JD.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Enter a role (e.g. &quot;Frontend Developer&quot;) and get a resume optimized
                for that role category — stronger bullet points, better framing, and zero
                invented skills. Works entirely from your existing profile.
              </p>
            </div>
            <Link
              href={"/app/creator" as Route}
              className="mt-8 inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-80 self-start"
            >
              CREATE RESUME
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          {/* Stats panel */}
          {stats ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="flex flex-col bg-foreground p-7 lg:col-span-3"
            >
              <p className="label-sm text-white/50 mb-5">YOUR STATS</p>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {[
                  { label: "SCANS", value: stats.total, Icon: BarChart3 },
                  { label: "AVG SCORE", value: stats.avg, Icon: Target },
                  { label: "BEST SCORE", value: stats.best, Icon: TrendingUp },
                  { label: "THIS WEEK", value: stats.thisWeek, Icon: Zap },
                ].map(({ label, value, Icon }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="h-3 w-3 text-white/40" />
                      <p className="label-sm text-white/40">{label}</p>
                    </div>
                    <p className="font-display text-3xl font-bold text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="flex flex-col justify-center bg-surface-low p-7 lg:col-span-3"
            >
              <p className="label-sm text-muted-foreground mb-2">
                NO SCANS YET
              </p>
              <p className="text-sm text-muted-foreground">
                Run your first analysis and your stats will appear here.
              </p>
            </motion.div>
          )}
        </div>

        {/* ── Career Gap Summary ─────────────────────────────────────── */}
        {careerSummary && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-px"
          >
            <div className="grid gap-px border border-t-0 border-foreground/10 lg:grid-cols-3">
              {/* Narrative + Next Step */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="flex flex-col bg-foreground p-7"
              >
                <p className="label-sm text-white/50 mb-4">CAREER TRAJECTORY</p>
                {careerSummary.careerNarrative && (
                  <p className="text-sm leading-7 text-white/80 flex-1">
                    {careerSummary.careerNarrative}
                  </p>
                )}
                {careerSummary.progressSummary && (
                  <p className="mt-3 text-xs leading-6 text-white/50 border-l-2 border-white/20 pl-3">
                    {careerSummary.progressSummary}
                  </p>
                )}
                {careerSummary.nextStep && (
                  <div className="mt-5 border border-white/20 p-4">
                    <p className="label-sm text-white/40 mb-2">NEXT STEP</p>
                    <p className="text-sm font-semibold text-white leading-6">
                      {careerSummary.nextStep}
                    </p>
                  </div>
                )}
                {careerSummary.targetRoles.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {careerSummary.targetRoles.map((role) => (
                      <span
                        key={role}
                        className="bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Top Skill Gaps */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="flex flex-col bg-surface-lowest p-7"
              >
                <div className="mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="label-sm text-muted-foreground">
                    RECURRING SKILL GAPS
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Skills that keep appearing as missing across your analyses.
                </p>
                <ul className="space-y-2 flex-1">
                  {careerSummary.topSkillGaps.slice(0, 8).map((skill, i) => (
                    <li key={skill} className="flex items-center gap-3">
                      <span className="label-sm w-4 shrink-0 text-muted-foreground/50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="h-px flex-1 bg-surface-highest" />
                      <span className="text-sm font-medium text-foreground">
                        {skill}
                      </span>
                    </li>
                  ))}
                  {careerSummary.topSkillGaps.length === 0 && (
                    <li className="text-xs text-muted-foreground">
                      No persistent gaps detected yet.
                    </li>
                  )}
                </ul>
                <Link
                  href="/app/analyze"
                  className="mt-6 flex items-center gap-1.5 label-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  RUN ANOTHER SCAN <ChevronRight className="h-3 w-3" />
                </Link>
              </motion.div>

              {/* Projects to Build */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.45 }}
                className="flex flex-col bg-surface-lowest p-7"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-muted-foreground" />
                  <p className="label-sm text-muted-foreground">
                    PROJECTS TO BUILD
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Highest-ROI projects to close your skill gaps.
                </p>
                <div className="space-y-4 flex-1">
                  {careerSummary.projectsToStart.slice(0, 3).map((proj) => (
                    <div
                      key={proj.title}
                      className="border-l-2 border-surface-highest pl-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-5">
                          {proj.title}
                        </p>
                        {proj.priority && (
                          <span
                            className={`shrink-0 label-sm px-1.5 py-0.5 ${
                              proj.priority === "high"
                                ? "bg-foreground text-primary-foreground"
                                : proj.priority === "medium"
                                  ? "bg-surface-highest text-foreground"
                                  : "bg-surface-low text-muted-foreground"
                            }`}
                          >
                            {proj.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">
                        {proj.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {proj.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="bg-surface-highest px-1.5 py-0.5 text-[10px] text-foreground"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {careerSummary.projectsToStart.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Run an analysis to get project recommendations.
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
