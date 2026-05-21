import { NextResponse } from "next/server";

import { parseResumeFile } from "@/lib/ats/parser";
import { callOpenRouter, parseJsonFromModel } from "@/lib/openrouter/client";
import { TAILORING_SYSTEM_PROMPT, summarizeInputs } from "@/lib/openrouter/prompts";
import { getCurrentUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const FREE_USE_LIMIT = 2;

type UsageClient =
  | NonNullable<ReturnType<typeof getSupabaseServiceClient>>
  | NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

/** Shape of the AI tailoring response (must match TAILORING_SYSTEM_PROMPT output schema) */
interface TailoringResult {
  issues: Array<{ section: string; issue: string; severity: string }>;
  tailoredResume: {
    header: {
      name: string;
      title: string;
      contact: { phone: string; email: string; linkedin?: string; github?: string; portfolio?: string; location: string };
    };
    professional_summary: string;
    technical_skills: Record<string, string[]>;
    professional_experience: Array<{
      job_title: string; company: string; employment_type?: string; location?: string;
      duration: { start: string; end?: string };
      responsibilities: string[]; achievements?: string[]; technologies_used?: string[];
    }>;
    projects: Array<{
      title: string; role?: string; duration?: { start?: string; end?: string };
      description?: string; highlights?: string[]; technologies_used?: string[];
      github_url?: string; live_demo_url?: string;
    }>;
    education: Array<{ degree: string; field_of_study?: string; institution: string; location?: string; graduation_date?: string; gpa?: string; percentage?: string }>;
    certifications?: Array<{ name: string; issuer?: string; issue_date?: string; credential_id?: string; credential_url?: string }>;
    achievements?: string[];
    publications?: Array<{ title: string; publisher?: string; publication_date?: string; url?: string }>;
    languages?: Array<{ language: string; proficiency?: string }>;
    interests?: string[];
  };
  changesApplied: Array<{
    section: string;
    what: string;
    why: string;
  }>;
  companyName?: string;
}

/**
 * POST /api/tailor
 *
 * Accepts a resume file + job description text + format preference.
 * Returns the complete tailored resume from AI — no local analysis.
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
    const format = (formData.get("format") as string | null) ?? "pdf";

    if (!resumeFile || !rawJd) {
      return NextResponse.json(
        { error: "Resume file and job description are required." },
        { status: 400 }
      );
    }

    if (rawJd.trim().length < 120) {
      return NextResponse.json(
        { error: "Paste a fuller job description for accurate tailoring." },
        { status: 400 }
      );
    }

    /* ── 2. Rate-limit gate ──────────────────────────────────── */
    const user = await getCurrentUser();
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

        // Defer usage increment until tailoring completes successfully.
        anonymousUsageContext = {
          ip,
          currentCount: row?.use_count ?? 0,
          client: usageClient,
        };
      }
    }

    /* ── 3. Parse resume to text ─────────────────────────────── */
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
        { error: "Could not extract enough text from the resume. Ensure the PDF contains selectable text." },
        { status: 400 }
      );
    }

    /* ── 4. Call AI for tailoring ─────────────────────────────── */
    const { resume: trimmedResume, jd: trimmedJd } = summarizeInputs(resumeText, rawJd);
    const userMessage = `## RESUME\n\n${trimmedResume}\n\n---\n\n## JOB DESCRIPTION\n\n${trimmedJd}`;

    let aiRawResponse: string | null;
    try {
      aiRawResponse = await callOpenRouter(
        TAILORING_SYSTEM_PROMPT,
        userMessage,
        undefined,
        45_000,
        8000
      );
    } catch (configError) {
      return NextResponse.json(
        { error: "AI service is not configured. Please set OPENROUTER_API_KEY." },
        { status: 503 }
      );
    }

    if (!aiRawResponse) {
      return NextResponse.json(
        {
          error: "AI tailoring is temporarily unavailable. Please try again in a moment.",
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

    /* ── 5. Parse AI response ────────────────────────────────── */
    const aiResult = parseJsonFromModel<TailoringResult>(aiRawResponse);

    if (!aiResult || !aiResult.tailoredResume) {
      return NextResponse.json(
        {
          error: "AI returned an unexpected response format. Please try again.",
          retryable: true
        },
        { status: 502 }
      );
    }

    /* ── 6. Save metadata for authenticated users ─────────────── */
    if (user) {
      const service = getSupabaseServiceClient();
      if (service) {
        await service
          .from("user_evaluations")
          .insert({
            user_id: user.id,
            job_title: aiResult.companyName
              ? `${aiResult.tailoredResume.header?.title ?? aiResult.tailoredResume.professional_experience?.[0]?.job_title ?? "Tailoring"} @ ${aiResult.companyName}`
              : (aiResult.tailoredResume.header?.title ?? aiResult.tailoredResume.professional_experience?.[0]?.job_title ?? "Tailored Resume"),
            overall_score: (aiResult as { atsScore?: number }).atsScore ?? 0,
            breakdown: {},
            suggestions: aiResult.changesApplied ?? [],
            missing_keywords: [],
            matched_skills: [],
            resume_gaps: aiResult.issues ?? [],
            mandatory_skills: [],
            optional_skills: [],
            high_value_skills: [],
            project_recommendations: [],
            full_result: aiResult,
            mode: "tailoring"
          })
          .then(({ error }) => {
            if (error) void error;
          });
      }
    }

    const processingMs = Date.now() - start;

    return NextResponse.json({
      ...aiResult,
      format,         // echo back the user's chosen format
      processingMs
    });
  } catch (err) {
    void err;
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", retryable: true },
      { status: 500 }
    );
  }
}
