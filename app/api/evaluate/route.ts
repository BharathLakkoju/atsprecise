import { NextResponse } from "next/server";

import { parseResumeFile } from "@/lib/ats/parser";
import type { AtsEvaluationResult, CareerSummary, EvidenceStatus, ScoreBreakdown } from "@/lib/ats/types";
import { callOpenRouter, parseJsonFromModel } from "@/lib/openrouter/client";
import { ANALYSIS_SYSTEM_PROMPT, summarizeInputs } from "@/lib/openrouter/prompts";
import { serverEvaluationSchema } from "@/lib/validations/evaluation";
import { getAuthenticatedClient } from "@/lib/supabase/auth-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const FREE_USE_LIMIT = 2;

type UsageClient =
  | NonNullable<ReturnType<typeof getSupabaseServiceClient>>
  | NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

/**
 * POST /api/evaluate
 *
 * Accepts a resume file + job description text.
 * Sends both to OpenRouter for a COMPLETE AI-driven ATS evaluation.
 * Returns { analysis, careerSummary } from a single AI call to minimise token costs.
 * No local scoring engine — the AI is the sole source of truth.
 */
export async function POST(request: Request) {
  const start = Date.now();
  let anonymousUsageContext: {
    ip: string;
    currentCount: number;
    client: UsageClient;
  } | null = null;

  try {
    /* ── 1. Parse multipart form ──────────────────────────────── */
    const formData = await request.formData();
    const resumeFile = formData.get("resume") as File | null;
    const rawJd = formData.get("jdText") as string | null;

    if (!resumeFile || !rawJd) {
      return NextResponse.json(
        { error: "Resume file and job description are required." },
        { status: 400 }
      );
    }

    /* ── 2. Validate JD ──────────────────────────────────────── */
    const parsed = serverEvaluationSchema.safeParse({ jdText: rawJd });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid job description." },
        { status: 400 }
      );
    }
    const jdText = parsed.data.jdText;

    /* ── 3. Auth + rate-limit gate ────────────────────────────── */
    const authResult = await getAuthenticatedClient();
    const user = authResult?.user ?? null;
    const userSupabase = authResult?.supabase ?? null;

    if (!user) {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "unknown";
      const usageClient =
        getSupabaseServiceClient() ?? (await getSupabaseServerClient());

      if (usageClient) {
        const { data: row } = await usageClient
          .from("ip_usage")
          .select("use_count")
          .eq("ip_address", ip)
          .maybeSingle();

        if (row && row.use_count >= FREE_USE_LIMIT) {
          return NextResponse.json(
            { error: "FREE_LIMIT_REACHED", usesLeft: 0 },
            { status: 403 }
          );
        }

        anonymousUsageContext = {
          ip,
          currentCount: row?.use_count ?? 0,
          client: usageClient,
        };
      }
    }

    /* ── 4. Parse resume to text ──────────────────────────────── */
    let resumeText: string;
    try {
      resumeText = await parseResumeFile(resumeFile);
    } catch (parseError) {
      return NextResponse.json(
        {
          error:
            parseError instanceof Error
              ? parseError.message
              : "Failed to parse resume file."
        },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the resume. Ensure the PDF contains selectable text (not a scanned image)." },
        { status: 400 }
      );
    }

    /* ── 4b. Fetch past analyses for context (authenticated) ──── */
    let pastAnalysesContext = "";
    if (user) {
      const dbClient = getSupabaseServiceClient() ?? userSupabase;
      if (dbClient) {
        const { data: pastRows } = await dbClient
          .from("user_evaluations")
          .select("job_title, overall_score, mandatory_skills, missing_keywords, created_at")
          .eq("user_id", user.id)
          .eq("mode", "analysis")
          .order("created_at", { ascending: false })
          .limit(8);

        if (pastRows && pastRows.length > 0) {
          const lines = pastRows.map((r, i) =>
            `${i + 1}. Role: ${r.job_title ?? "Unknown"} | Score: ${r.overall_score} | Date: ${r.created_at?.slice(0, 10)} | Missing: ${(r.missing_keywords as string[] ?? []).slice(0, 5).join(", ")}`
          );
          pastAnalysesContext = `\n\n---\n\n## PAST ANALYSES (${pastRows.length} scans)\n${lines.join("\n")}`;
        }
      }
    }

    /* ── 5. Call AI for COMPLETE evaluation ───────────────────── */
    const { resume: trimmedResume, jd: trimmedJd } = summarizeInputs(resumeText, jdText);
    const userMessage = `## RESUME\n\n${trimmedResume}\n\n---\n\n## JOB DESCRIPTION\n\n${trimmedJd}${pastAnalysesContext}`;

    let aiRawResponse: string | null;
    try {
      aiRawResponse = await callOpenRouter(
        ANALYSIS_SYSTEM_PROMPT,
        userMessage,
        undefined, // use default model
        30_000,    // 30s timeout — streaming handles the rest
        5000       // increased for dual-JSON response (analysis + careerSummary)
      );
    } catch (configError) {
      // API key not configured
      return NextResponse.json(
        { error: "AI service is not configured. Please set OPENROUTER_API_KEY." },
        { status: 503 }
      );
    }

    if (!aiRawResponse) {
      return NextResponse.json(
        {
          error: "AI analysis is temporarily unavailable. Our servers are processing high demand — please try again in a moment.",
          retryable: true
        },
        { status: 503 }
      );
    }

    if (anonymousUsageContext) {
      await anonymousUsageContext.client.from("ip_usage").upsert(
        {
          ip_address: anonymousUsageContext.ip,
          use_count: anonymousUsageContext.currentCount + 1,
          last_used_at: new Date().toISOString()
        },
        { onConflict: "ip_address" }
      );
    }

    /* ── 6. Parse and validate AI response ───────────────────── */
    interface AiEvaluationInner {
      overallScore: number;
      breakdown: ScoreBreakdown;
      missingKeywords: string[];
      resumeGaps: Array<{ label: string; detail: string }>;
      suggestions: Array<{ title: string; detail: string; priority: string }>;
      matchedSkills: string[];
      unmatchedSkills: string[];
      detectedRole: string | null;
      aiInsight: string | null;
      mandatorySkills: string[];
      optionalSkills: string[];
      highValueSkills: string[];
      projectRecommendations: Array<{ title: string; description: string; skills: string[]; impact: string; priority?: string }>;
      careerGapSummary: string | null;
      skillEvidence: Array<{ skill: string; status: string; evidence: string | null }>;
    }

    interface AiCareerSummaryInner {
      topSkillGaps: string[];
      projectsToStart: Array<{ title: string; description: string; skills: string[]; impact: string; priority?: string }>;
      targetRoles: string[];
      careerNarrative: string;
      nextStep: string;
      progressSummary: string | null;
    }

    interface AiWrappedResponse {
      analysis: AiEvaluationInner;
      careerSummary: AiCareerSummaryInner;
    }

    const aiWrapped = parseJsonFromModel<AiWrappedResponse>(aiRawResponse);

    // The AI must return the wrapper. If it didn't, the response is unusable.
    const aiResult = aiWrapped?.analysis;
    const aiCareer = aiWrapped?.careerSummary;

    if (!aiResult || typeof aiResult.overallScore !== "number" || !aiResult.breakdown) {
      return NextResponse.json(
        {
          error: "AI returned an unexpected response format. Please try again.",
          retryable: true
        },
        { status: 502 }
      );
    }

    /* ── 7. Build final result ───────────────────────────────── */
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

    const result: AtsEvaluationResult = {
      overallScore: clamp(aiResult.overallScore),
      breakdown: {
        keywordMatch: clamp(aiResult.breakdown.keywordMatch ?? 0),
        semanticMatch: clamp(aiResult.breakdown.semanticMatch ?? 0),
        skillsAlignment: clamp(aiResult.breakdown.skillsAlignment ?? 0),
        experienceRelevance: clamp(aiResult.breakdown.experienceRelevance ?? 0),
        formattingReadability: clamp(aiResult.breakdown.formattingReadability ?? 0)
      },
      missingKeywords: Array.isArray(aiResult.missingKeywords) ? aiResult.missingKeywords : [],
      resumeGaps: Array.isArray(aiResult.resumeGaps) ? aiResult.resumeGaps : [],
      suggestions: Array.isArray(aiResult.suggestions)
        ? aiResult.suggestions.map((s) => ({
            title: s.title || "Suggestion",
            detail: s.detail || "",
            priority: (["high", "medium", "low"].includes(s.priority) ? s.priority : "medium") as "high" | "medium" | "low"
          }))
        : [],
      matchedSkills: Array.isArray(aiResult.matchedSkills) ? aiResult.matchedSkills : [],
      unmatchedSkills: Array.isArray(aiResult.unmatchedSkills) ? aiResult.unmatchedSkills : [],
      detectedRole: aiResult.detectedRole ?? null,
      aiInsight: aiResult.aiInsight ?? null,
      mandatorySkills: Array.isArray(aiResult.mandatorySkills) ? aiResult.mandatorySkills : [],
      optionalSkills: Array.isArray(aiResult.optionalSkills) ? aiResult.optionalSkills : [],
      highValueSkills: Array.isArray(aiResult.highValueSkills) ? aiResult.highValueSkills : [],
      projectRecommendations: Array.isArray(aiResult.projectRecommendations)
        ? aiResult.projectRecommendations.map((p) => ({
            title: p.title || "",
            description: p.description || "",
            skills: Array.isArray(p.skills) ? p.skills : [],
            impact: p.impact || "",
            priority: (["high", "medium", "low"].includes(p.priority ?? "") ? p.priority : "medium") as "high" | "medium" | "low"
          }))
        : [],
      careerGapSummary: aiResult.careerGapSummary ?? null,
      skillEvidence: Array.isArray(aiResult.skillEvidence)
        ? aiResult.skillEvidence
            .filter((e) => e && typeof e.skill === "string")
            .map((e) => ({
              skill: e.skill,
              status: (["not_found", "weakly_implied", "strongly_demonstrated"].includes(e.status)
                ? e.status
                : "not_found") as EvidenceStatus,
              evidence: e.evidence ?? null
            }))
        : [],
      generatedAt: new Date().toISOString(),
      processingMs: Date.now() - start
    };

    const careerSummary: CareerSummary | null = aiCareer
      ? {
          topSkillGaps: Array.isArray(aiCareer.topSkillGaps) ? aiCareer.topSkillGaps : [],
          projectsToStart: Array.isArray(aiCareer.projectsToStart)
            ? aiCareer.projectsToStart.map((p) => ({
                title: p.title || "",
                description: p.description || "",
                skills: Array.isArray(p.skills) ? p.skills : [],
                impact: p.impact || "",
                priority: (["high", "medium", "low"].includes(p.priority ?? "") ? p.priority : "medium") as "high" | "medium" | "low"
              }))
            : [],
          targetRoles: Array.isArray(aiCareer.targetRoles) ? aiCareer.targetRoles : [],
          careerNarrative: aiCareer.careerNarrative ?? "",
          nextStep: aiCareer.nextStep ?? "",
          progressSummary: aiCareer.progressSummary ?? null
        }
      : null;

    /* ── 8. Save metadata for authenticated users ─────────────── */
    if (user) {
      // Prefer the service-role client (bypasses RLS). Fall back to the user's own session client.
      const dbClient = getSupabaseServiceClient() ?? userSupabase;
      if (dbClient) {
        const evalInsert = dbClient
          .from("user_evaluations")
          .insert({
            user_id: user.id,
            job_title: result.detectedRole,
            overall_score: result.overallScore,
            breakdown: result.breakdown,
            suggestions: result.suggestions,
            missing_keywords: result.missingKeywords,
            matched_skills: result.matchedSkills,
            resume_gaps: result.resumeGaps,
            mandatory_skills: result.mandatorySkills,
            optional_skills: result.optionalSkills,
            high_value_skills: result.highValueSkills,
            project_recommendations: result.projectRecommendations,
            career_gap_summary: result.careerGapSummary,
            ai_insight: result.aiInsight,
            full_result: result,
            mode: "analysis"
          });

        // Upsert career summary into its own table
        const summaryUpsert = careerSummary
          ? dbClient.from("user_career_summary").upsert({
              user_id: user.id,
              top_skill_gaps: careerSummary.topSkillGaps,
              projects_to_start: careerSummary.projectsToStart,
              target_roles: careerSummary.targetRoles,
              career_narrative: careerSummary.careerNarrative,
              next_step: careerSummary.nextStep,
              progress_summary: careerSummary.progressSummary,
              // Compute aggregate stats across all analyses (including this one)
              total_analyses: 0, // will be overwritten below
              avg_score: 0,
              best_score: 0,
              updated_at: new Date().toISOString()
            }, { onConflict: "user_id" })
          : null;

        // Run inserts; compute aggregate stats for the career summary row
        const [evalResult] = await Promise.all([
          evalInsert.then(({ error }) => { if (error) console.error("[evaluate] eval insert error:", error.message); }),
          summaryUpsert?.then(({ error }) => { if (error) console.error("[evaluate] career summary upsert error:", error.message); })
        ]);
        void evalResult;

        // After insert, compute correct aggregate stats from analysis-mode rows only
        if (careerSummary) {
          const { data: allScores } = await dbClient
            .from("user_evaluations")
            .select("overall_score")
            .eq("user_id", user.id)
            .eq("mode", "analysis");

          if (allScores && allScores.length > 0) {
            const scores = allScores.map((r) => r.overall_score as number);
            const total = scores.length;
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / total);
            const best = Math.max(...scores);

            await dbClient.from("user_career_summary").upsert(
              { user_id: user.id, total_analyses: total, avg_score: avg, best_score: best },
              { onConflict: "user_id" }
            ).then(({ error }) => { if (error) console.error("[evaluate] stats upsert error:", error.message); });
          }
        }
      }
    }

    return NextResponse.json({ ...result, careerSummary });
  } catch (err) {
    void err;
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", retryable: true },
      { status: 500 }
    );
  }
}
