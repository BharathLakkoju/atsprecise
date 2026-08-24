"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AtsEvaluationResult, SkillEvidence } from "@/lib/ats/types";

const evidenceDotClass: Record<SkillEvidence["status"], string> = {
  not_found: "bg-foreground/30",
  weakly_implied: "bg-amber-500",
  strongly_demonstrated: "bg-emerald-500",
};

function EvidenceSkillRow({
  skill,
  evidence,
  dotClassName,
}: {
  skill: string;
  evidence?: SkillEvidence;
  /** Fallback dot style used when no evidence entry exists for this skill. */
  dotClassName: string;
}) {
  const [open, setOpen] = useState(false);

  if (!evidence) {
    return (
      <li className="flex items-center gap-3 text-sm text-foreground">
        <span className={`h-1.5 w-1.5 shrink-0 ${dotClassName}`} />
        {skill}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-3 text-left text-sm text-foreground"
      >
        <span className={`h-1.5 w-1.5 shrink-0 ${evidenceDotClass[evidence.status]}`} />
        <span className="flex-1">{skill}</span>
      </button>
      {open && (
        <p className="mt-1 ml-4.5 border-l border-foreground/10 pl-3 text-xs leading-5 text-muted-foreground/70 italic">
          {evidence.evidence ?? "Not found in resume."}
        </p>
      )}
    </li>
  );
}

function EvidenceSkillChip({ skill, evidence }: { skill: string; evidence?: SkillEvidence }) {
  const [open, setOpen] = useState(false);

  if (!evidence) {
    return (
      <span className="inline-flex items-center bg-foreground px-2.5 py-1 text-xs font-medium text-background">
        {skill}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 bg-foreground px-2.5 py-1 text-xs font-medium text-background"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${evidenceDotClass[evidence.status]}`} />
        {skill}
      </button>
      {open && (
        <p className="max-w-[14rem] text-[11px] leading-4 text-muted-foreground/70 italic">
          {evidence.evidence ?? "Not found in resume."}
        </p>
      )}
    </div>
  );
}

const labelMap = {
  keywordMatch: "KEYWORD MATCH",
  semanticMatch: "SEMANTIC RELEVANCE",
  skillsAlignment: "SKILLS ALIGNMENT",
  experienceRelevance: "EXPERIENCE RELEVANCE",
  formattingReadability: "FORMATTING",
} as const;

interface ResultsDashboardProps {
  result: AtsEvaluationResult;
  history: Array<{
    id: string;
    jobTitleHint: string;
    createdAt: string;
    result: AtsEvaluationResult;
  }>;
}

function getScoreLabel(score: number) {
  if (score >= 85) return "OPTIMIZED";
  if (score >= 70) return "STRONG FIT";
  if (score >= 55) return "MODERATE FIT";
  return "NEEDS WORK";
}

function getScoreVerdict(score: number) {
  if (score >= 85)
    return "Top 5% of candidates. Minor refinements can push past final screening.";
  if (score >= 70)
    return "Strong alignment. Close the gaps below to compete for the top slot.";
  if (score >= 55)
    return "Moderate match. Several critical gaps must be closed before applying.";
  return "Significant mismatch. Address every HIGH priority gap before submitting.";
}

export function ResultsDashboard({ result, history }: ResultsDashboardProps) {
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  const evidenceBySkill = useMemo(() => {
    const map = new Map<string, SkillEvidence>();
    for (const e of result.skillEvidence ?? []) {
      map.set(e.skill, e);
    }
    return map;
  }, [result.skillEvidence]);

  const visibleMissing = showAllKeywords
    ? result.missingKeywords
    : result.missingKeywords.slice(0, 5);
  const extraCount = result.missingKeywords.length - 5;

  return (
    <div className="space-y-0 max-lg:mb-10">
      {/* SCORE HEADER */}
      <section className="border border-foreground/10">
        <div className="grid grid-cols-[1fr_auto] border-b border-foreground/10 bg-foreground px-6 py-3">
          <span className="label-sm text-white/60">
            {result.detectedRole
              ? `ANALYSIS / ${result.detectedRole.toUpperCase()}`
              : "ATS ANALYSIS"}
          </span>
          <span className="label-sm text-white/60">SCORE</span>
        </div>
        <div className="grid gap-px md:grid-cols-[1fr_300px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-surface-lowest p-8"
          >
            <p className="label-sm text-muted-foreground">
              OVERALL QUALITY INDEX
            </p>
            <div className="mt-3 flex items-end gap-6">
              <div className="leading-none">
                {getScoreLabel(result.overallScore)
                  .split(" ")
                  .map((word, i, arr) => (
                    <span
                      key={i}
                      className={`block font-display text-5xl font-black leading-tight sm:text-6xl ${
                        i === arr.length - 1
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {word}
                    </span>
                  ))}
              </div>
              <span className="font-display text-[5rem] font-black leading-none text-foreground/10 sm:text-[7rem]">
                {result.overallScore}
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
              {getScoreVerdict(result.overallScore)}
            </p>
            {result.aiInsight && (
              <p className="mt-4 max-w-sm border-l-2 border-surface-highest pl-4 text-sm italic text-muted-foreground/70">
                {result.aiInsight}
              </p>
            )}
            <Button
              variant="default"
              className="mt-6"
              size="sm"
              disabled
              title="Download report is not available yet"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Download Report
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-foreground p-6 text-primary-foreground"
          >
            <p className="label-sm text-white/50">SCORE BREAKDOWN</p>
            <div className="mt-5 space-y-4">
              {Object.entries(result.breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70">
                      {labelMap[key as keyof typeof labelMap]}
                    </span>
                    <span className="font-display text-base font-semibold text-white">
                      {value}
                    </span>
                  </div>
                  <div className="mt-1.5 h-0.5 w-full overflow-hidden bg-white/10">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full bg-white/70"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CAREER GAP ASSESSMENT */}
      {result.careerGapSummary && (
        <section className="mt-px border border-t-0 border-foreground/10 bg-surface-lowest p-8">
          <p className="label-sm text-muted-foreground">
            CAREER GAP ASSESSMENT
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-foreground">
            {result.careerGapSummary}
          </p>
        </section>
      )}

      {/* SKILLS GAP GRID */}
      <section className="mt-px border border-t-0 border-foreground/10">
        <div className="border-b border-foreground/10 bg-foreground px-6 py-3">
          <span className="label-sm text-white/60">SKILLS GAP</span>
        </div>
        <div className="grid gap-px md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-surface-lowest p-6"
          >
            <p className="label-sm text-muted-foreground">MANDATORY</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Missing = screener rejection
            </p>
            <ul className="mt-4 space-y-2">
              {(result.mandatorySkills ?? []).map((skill) => (
                <EvidenceSkillRow
                  key={skill}
                  skill={skill}
                  evidence={evidenceBySkill.get(skill)}
                  dotClassName="bg-foreground/60"
                />
              ))}
              {!result.mandatorySkills?.length && (
                <li className="text-xs text-muted-foreground">
                  All mandatory skills present.
                </li>
              )}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-surface-low p-6"
          >
            <p className="label-sm text-muted-foreground">PREFERRED</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Reduces ranking
            </p>
            <ul className="mt-4 space-y-2">
              {(result.optionalSkills ?? []).map((skill) => (
                <EvidenceSkillRow
                  key={skill}
                  skill={skill}
                  evidence={evidenceBySkill.get(skill)}
                  dotClassName="bg-foreground/40"
                />
              ))}
              {!result.optionalSkills?.length && (
                <li className="text-xs text-muted-foreground">
                  No unmet preferred skills.
                </li>
              )}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-surface-lowest p-6"
          >
            <p className="label-sm text-muted-foreground">HIGH IMPACT</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Differentiates your profile
            </p>
            <ul className="mt-4 space-y-2">
              {(result.highValueSkills ?? []).map((skill) => (
                <EvidenceSkillRow
                  key={skill}
                  skill={skill}
                  evidence={evidenceBySkill.get(skill)}
                  dotClassName="bg-foreground"
                />
              ))}
              {!result.highValueSkills?.length && (
                <li className="text-xs text-muted-foreground">
                  No additional high-impact skills identified.
                </li>
              )}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* KEYWORD GAP */}
      <section className="mt-px border border-t-0 border-foreground/10">
        <div className="border-b border-foreground/10 bg-foreground px-6 py-3">
          <span className="label-sm text-white/60">KEYWORD GAP</span>
        </div>
        <div className="grid gap-px md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-surface-lowest p-6"
          >
            <p className="label-sm text-muted-foreground">MISSING</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleMissing.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {kw}
                </span>
              ))}
              {!showAllKeywords && extraCount > 0 && (
                <button
                  onClick={() => setShowAllKeywords(true)}
                  className="inline-flex items-center gap-1 border border-dashed border-foreground/30 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/60 hover:text-foreground"
                >
                  +{extraCount} more
                </button>
              )}
              {result.missingKeywords.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No missing keywords detected.
                </span>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="bg-surface-low p-6"
          >
            <p className="label-sm text-muted-foreground">MATCHED</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.matchedSkills.map((skill) => (
                <EvidenceSkillChip
                  key={skill}
                  skill={skill}
                  evidence={evidenceBySkill.get(skill)}
                />
              ))}
              {result.matchedSkills.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No matched skills detected.
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* STRUCTURAL DEFICIENCIES */}
      {result.resumeGaps.length > 0 && (
        <section className="mt-px border border-t-0 border-foreground/10">
          <div className="border-b border-foreground/10 bg-foreground px-6 py-3">
            <span className="label-sm text-white/60">STRUCTURAL GAPS</span>
          </div>
          <div className="divide-y divide-foreground/10">
            {result.resumeGaps.map((gap, i) => (
              <motion.div
                key={gap.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className="flex gap-4 bg-surface-lowest p-6"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {gap.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {gap.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* PROJECTS TO BUILD */}
      {result.projectRecommendations &&
        result.projectRecommendations.length > 0 && (
          <section className="mt-px border border-t-0 border-foreground/10">
            <div className="border-b border-foreground/10 bg-foreground px-6 py-3 flex items-center justify-between">
              <span className="label-sm text-white/60">PROJECTS TO BUILD</span>
              <span className="label-sm text-white/30">
                {result.projectRecommendations.length} RECOMMENDED
              </span>
            </div>
            <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
              {result.projectRecommendations.map((proj, i) => (
                <motion.div
                  key={proj.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  className="flex flex-col bg-surface-lowest p-6"
                >
                  {/* Header row: index + priority */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="font-display text-4xl font-black leading-none text-foreground/10 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {proj.priority && (
                      <span
                        className={`label-sm px-2 py-1 shrink-0 ${
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

                  {/* Title */}
                  <p className="font-display font-bold text-foreground leading-snug">
                    {proj.title}
                  </p>

                  {/* Description */}
                  <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
                    {proj.description}
                  </p>

                  {/* Impact */}
                  <div className="mt-4 border-l-2 border-surface-highest pl-3">
                    <p className="label-sm text-muted-foreground mb-1">
                      IMPACT
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {proj.impact}
                    </p>
                  </div>

                  {/* Stack tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {proj.skills.map((s) => (
                      <span
                        key={s}
                        className="bg-surface-highest px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

      {/* PRIORITISED ACTIONS */}
      <section className="mt-px border border-t-0 border-foreground/10">
        <div className="border-b border-foreground/10 bg-foreground px-6 py-3">
          <span className="label-sm text-white/60">PRIORITISED ACTIONS</span>
        </div>
        <div className="divide-y divide-foreground/10">
          {result.suggestions.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * i }}
              className="flex gap-4 bg-surface-lowest p-6"
            >
              <span
                className={`label-sm mt-0.5 w-16 shrink-0 text-center py-1 ${
                  s.priority === "high"
                    ? "bg-foreground text-background"
                    : s.priority === "medium"
                      ? "bg-surface-highest text-foreground"
                      : "bg-surface-low text-muted-foreground"
                }`}
              >
                {s.priority.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold text-foreground">
                  {s.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {s.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SCORE HISTORY */}
      {history.length > 1 && (
        <section className="mt-px border border-t-0 border-foreground/10 bg-surface-lowest p-6">
          <p className="label-sm mb-4 text-muted-foreground">SCORE HISTORY</p>
          <div className="flex items-end gap-2 h-16">
            {history
              .slice(0, 10)
              .reverse()
              .map((entry, i, arr) => (
                <motion.div
                  key={entry.id}
                  initial={{ height: 0 }}
                  animate={{
                    height: `${Math.max(entry.result.overallScore * 0.64, 8)}px`,
                  }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`flex-1 max-w-10 ${
                    i === arr.length - 1
                      ? "bg-foreground"
                      : "bg-surface-highest"
                  }`}
                  title={`${entry.result.overallScore} — ${entry.jobTitleHint}`}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
