import { NextResponse } from "next/server";

import { callOpenRouter, parseJsonFromModel } from "@/lib/openrouter/client";
import { BUILD_SYSTEM_PROMPT, summarizeInputs } from "@/lib/openrouter/prompts";
import { getCurrentUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const FREE_USE_LIMIT = 2;

type UsageClient =
  | NonNullable<ReturnType<typeof getSupabaseServiceClient>>
  | NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

interface ContactInfo {
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  location: string;
}

interface ResumeData {
  name: string;
  contact: ContactInfo;
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    dates: string;
    location: string;
    bullets: string[];
  }>;
  skills: Array<{ category: string; items: string[] }>;
  projects: Array<{
    name: string;
    tech: string;
    link: string;
    website?: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
    gpa: string;
  }>;
  certifications: string[];
  awards?: string[];
}

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
  changesApplied: Array<{ section: string; what: string; why: string }>;
  atsScore?: number;
  companyName?: string;
}

/**
 * Converts structured resume form data into a readable text representation
 * that the AI tailoring prompt can process.
 */
function serializeResumeData(r: ResumeData): string {
  const lines: string[] = [];

  lines.push(`Name: ${r.name}`);
  if (r.contact.email) lines.push(`Email: ${r.contact.email}`);
  if (r.contact.phone) lines.push(`Phone: ${r.contact.phone}`);
  if (r.contact.location) lines.push(`Location: ${r.contact.location}`);
  if (r.contact.linkedin) lines.push(`LinkedIn: ${r.contact.linkedin}`);
  if (r.contact.github) lines.push(`GitHub: ${r.contact.github}`);
  if (r.contact.portfolio) lines.push(`Portfolio: ${r.contact.portfolio}`);

  if (r.summary) {
    lines.push("", "PROFESSIONAL SUMMARY", r.summary);
  }

  if (r.experience.length > 0) {
    lines.push("", "EXPERIENCE");
    for (const exp of r.experience) {
      lines.push(`Company: ${exp.company}`);
      lines.push(`Title: ${exp.title}`);
      if (exp.dates) lines.push(`Dates: ${exp.dates}`);
      if (exp.location) lines.push(`Location: ${exp.location}`);
      if (exp.bullets.length > 0) {
        lines.push("Responsibilities:");
        for (const b of exp.bullets) {
          if (b.trim()) lines.push(`- ${b.trim()}`);
        }
      }
      lines.push("");
    }
  }

  if (r.skills.length > 0) {
    lines.push("SKILLS");
    for (const s of r.skills) {
      if (s.category || s.items.length > 0) {
        lines.push(`${s.category}: ${s.items.join(", ")}`);
      }
    }
  }

  if (r.projects.length > 0) {
    lines.push("", "PROJECTS");
    for (const p of r.projects) {
      lines.push(`Project: ${p.name}`);
      if (p.tech) lines.push(`Tech Stack: ${p.tech}`);
      if (p.link) lines.push(`GitHub: ${p.link}`);
      if (p.website) lines.push(`Website: ${p.website}`);
      if (p.bullets.length > 0) {
        lines.push("Details:");
        for (const b of p.bullets) {
          if (b.trim()) lines.push(`- ${b.trim()}`);
        }
      }
      lines.push("");
    }
  }

  if (r.education.length > 0) {
    lines.push("EDUCATION");
    for (const e of r.education) {
      lines.push(`Institution: ${e.institution}`);
      lines.push(`Degree: ${e.degree}`);
      if (e.year) lines.push(`Year: ${e.year}`);
      if (e.gpa) lines.push(`GPA/CGPA: ${e.gpa}`);
      lines.push("");
    }
  }

  if (r.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    for (const c of r.certifications) {
      if (c.trim()) lines.push(c.trim());
    }
  }

  if ((r.awards ?? []).length > 0) {
    lines.push("", "AWARDS & RECOGNITION");
    for (const a of r.awards ?? []) {
      if (a.trim()) lines.push(`- ${a.trim()}`);
    }
  }

  return lines.join("\n");
}

/**
 * POST /api/build
 *
 * Accepts structured resume form data + job description.
 * Returns a fully tailored resume optimized for ≥95% ATS score.
 */
export async function POST(request: Request) {
  const start = Date.now();
  let anonymousUsageContext: {
    ip: string;
    currentCount: number;
    client: UsageClient;
  } | null = null;

  try {
    /* ── 1. Parse JSON body ──────────────────────────────────── */
    let body: { resumeData?: unknown; jdText?: unknown; format?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { resumeData, jdText, format = "pdf" } = body;

    if (!resumeData || typeof jdText !== "string") {
      return NextResponse.json(
        { error: "Resume data and job description are required." },
        { status: 400 }
      );
    }

    const rd = resumeData as ResumeData;

    if (!rd.name?.trim()) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (jdText.trim().length < 120) {
      return NextResponse.json(
        { error: "Paste a fuller job description for accurate tailoring (min 120 characters)." },
        { status: 400 }
      );
    }

    /* ── 2. Rate-limit gate ──────────────────────────────────── */
    const user = await getCurrentUser();
    if (!user) {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
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

        // Defer usage increment until a successful builder response is produced.
        anonymousUsageContext = {
          ip,
          currentCount: row?.use_count ?? 0,
          client: usageClient,
        };
      }
    }

    /* ── 3. Serialize resume data to text ────────────────────── */
    const resumeText = serializeResumeData(rd);
    const { resume: trimmedResume, jd: trimmedJd } = summarizeInputs(resumeText, jdText);
    const userMessage = `## RESUME (entered via structured builder form)\n\n${trimmedResume}\n\n---\n\n## JOB DESCRIPTION\n\n${trimmedJd}`;

    /* ── 4. Call AI ──────────────────────────────────────────── */
    let aiRawResponse: string | null;
    try {
      aiRawResponse = await callOpenRouter(
        BUILD_SYSTEM_PROMPT,
        userMessage,
        undefined,
        45_000,
        6500
      );
    } catch {
      return NextResponse.json(
        { error: "AI service is not configured. Please set OPENROUTER_API_KEY." },
        { status: 503 }
      );
    }

    if (!aiRawResponse) {
      return NextResponse.json(
        { error: "AI service is temporarily unavailable. Please try again.", retryable: true },
        { status: 503 }
      );
    }

    if (anonymousUsageContext) {
      await anonymousUsageContext.client.from("ip_usage").upsert(
        {
          ip_address: anonymousUsageContext.ip,
          use_count: anonymousUsageContext.currentCount + 1,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "ip_address" }
      );
    }

    /* ── 5. Parse AI response ────────────────────────────────── */
    const aiResult = parseJsonFromModel<TailoringResult>(aiRawResponse);

    if (!aiResult || !aiResult.tailoredResume) {
      return NextResponse.json(
        { error: "AI returned an unexpected response format. Please try again.", retryable: true },
        { status: 502 }
      );
    }

    /* ── 5a. Restore project URLs the AI may have dropped ───────── */
    if (aiResult.tailoredResume.projects && rd.projects?.length) {
      for (const proj of aiResult.tailoredResume.projects) {
        const src = rd.projects.find(
          (p) => proj.title?.toLowerCase().includes(p.name.toLowerCase()) ||
                 p.name.toLowerCase().includes(proj.title?.toLowerCase() ?? "")
        );
        if (src) {
          if (!proj.github_url && src.link) proj.github_url = src.link;
          if (!proj.live_demo_url && src.website) proj.live_demo_url = src.website;
        }
      }
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
              ? `${aiResult.tailoredResume.header?.title ?? aiResult.tailoredResume.professional_experience?.[0]?.job_title ?? "Build"} @ ${aiResult.companyName}`
              : (aiResult.tailoredResume.header?.title ?? aiResult.tailoredResume.professional_experience?.[0]?.job_title ?? "Built Resume"),
            overall_score: aiResult.atsScore ?? 0,
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
            mode: "builder",
          })
          .then(({ error }) => {
            if (error) void error;
          });
      }
    }

    return NextResponse.json({
      ...aiResult,
      format,
      processingMs: Date.now() - start,
    });
  } catch (err) {
    void err;
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
