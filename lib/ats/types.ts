/**
 * ATS evaluation types.
 *
 * All scoring is done by the AI (OpenRouter). No local scoring engine exists.
 * These types define the structured schemas the AI must return.
 */

export type ScoreKey =
  | "keywordMatch"
  | "semanticMatch"
  | "skillsAlignment"
  | "experienceRelevance"
  | "formattingReadability";

export type ScoreBreakdown = Record<ScoreKey, number>;

export interface AtsSuggestion {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface AtsGap {
  label: string;
  detail: string;
}

export type EvidenceStatus = "not_found" | "weakly_implied" | "strongly_demonstrated";

export interface SkillEvidence {
  skill: string;
  status: EvidenceStatus;
  /** Quoted or paraphrased resume line that justifies the status; null when not_found. */
  evidence: string | null;
}

export interface ProjectRecommendation {
  title: string;
  description: string;
  skills: string[];
  impact: string;
  priority?: "high" | "medium" | "low";
}

export interface CareerSummary {
  topSkillGaps: string[];
  projectsToStart: ProjectRecommendation[];
  targetRoles: string[];
  careerNarrative: string;
  nextStep: string;
  progressSummary: string | null;
  pinnedTargetRole?: string | null;
}

export interface AtsEvaluationResult {
  overallScore: number;
  breakdown: ScoreBreakdown;
  missingKeywords: string[];
  resumeGaps: AtsGap[];
  suggestions: AtsSuggestion[];
  matchedSkills: string[];
  unmatchedSkills: string[];
  detectedRole: string | null;
  aiInsight: string | null;
  // Enhanced gap analysis fields
  mandatorySkills: string[];
  optionalSkills: string[];
  highValueSkills: string[];
  projectRecommendations: ProjectRecommendation[];
  careerGapSummary: string | null;
  /** Per-skill citation for matched/mandatory/optional/highValue skills. Empty on older stored rows. */
  skillEvidence: SkillEvidence[];
  generatedAt: string;
  processingMs: number;
  // Populated by the API when the user is authenticated; persisted in user_career_summary
  careerSummary?: CareerSummary;
}
