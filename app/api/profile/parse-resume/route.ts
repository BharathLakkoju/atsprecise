import { NextResponse } from "next/server";

import { parseResumeFile } from "@/lib/ats/parser";
import { callOpenRouter, parseJsonFromModel } from "@/lib/openrouter/client";
import { PROFILE_PARSE_SYSTEM_PROMPT, summarizeInputs } from "@/lib/openrouter/prompts";
import { getCurrentUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileData } from "@/app/api/profile/route";

export const maxDuration = 45;

const FREE_USE_LIMIT = 2;
const MAX_RESUME_INPUT_CHARS = 40_000;

type UsageClient =
  | NonNullable<ReturnType<typeof getSupabaseServiceClient>>
  | NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

function getClientIp(request: Request): string | null {
  const candidates = [
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("true-client-ip"),
    request.headers.get("x-client-ip"),
  ];

  for (const headerValue of candidates) {
    if (!headerValue) continue;
    const ip = headerValue.split(",")[0]?.trim();
    if (ip && ip.toLowerCase() !== "unknown") {
      return ip;
    }
  }

  return null;
}

/**
 * POST /api/profile/parse-resume
 *
 * Accepts a multipart form with a single "resume" file (PDF or DOCX).
 * Parses the file to raw text, then calls OpenRouter to extract a fully
 * structured ProfileData JSON object.
 *
 * No authentication required — the extraction itself contains no user data
 * beyond what the user uploaded in that request.
 */
export async function POST(request: Request) {
  let anonymousUsageContext: {
    ip: string;
    currentCount: number;
    client: UsageClient;
  } | null = null;

  /* ── 1. Read multipart form ── */
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 },
    );
  }

  const resumeFile = formData.get("resume");
  if (!(resumeFile instanceof File)) {
    return NextResponse.json(
      { error: "A resume file is required." },
      { status: 400 },
    );
  }

  const lowerName = resumeFile.name.toLowerCase();
  if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx")) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are supported." },
      { status: 400 },
    );
  }

  /* ── 2. Parse resume to raw text ── */
  let resumeText: string;
  try {
    resumeText = await parseResumeFile(resumeFile);
  } catch (parseError) {
    return NextResponse.json(
      {
        error:
          parseError instanceof Error
            ? parseError.message
            : "Failed to read the resume file.",
      },
      { status: 422 },
    );
  }

  if (!resumeText.trim()) {
    return NextResponse.json(
      { error: "The uploaded file appears to be empty or unreadable." },
      { status: 422 },
    );
  }

  /* ── 2b. Rate-limit gate (IP-based for anonymous users) ── */
  const user = await getCurrentUser();
  if (!user) {
    const ip = getClientIp(request);
    const usageClient =
      getSupabaseServiceClient() ?? (await getSupabaseServerClient());

    if (usageClient && ip) {
      const { data: row } = await usageClient
        .from("ip_usage")
        .select("use_count")
        .eq("ip_address", ip)
        .maybeSingle();

      if (row && row.use_count >= FREE_USE_LIMIT) {
        return NextResponse.json(
          { error: "FREE_LIMIT_REACHED", usesLeft: 0 },
          { status: 403 },
        );
      }

      anonymousUsageContext = {
        ip,
        currentCount: row?.use_count ?? 0,
        client: usageClient,
      };
    }
  }

  /* ── 3. Call OpenRouter to extract structured profile data ── */
  const { resume: structuredResumeText } = summarizeInputs(resumeText, "");
  const modelResumeInput = structuredResumeText.trim().slice(0, MAX_RESUME_INPUT_CHARS);

  let rawAiResponse: string | null;
  try {
    rawAiResponse = await callOpenRouter(
      PROFILE_PARSE_SYSTEM_PROMPT,
      `Extract all profile information from this resume:\n\n${modelResumeInput}`,
      undefined, // use default model
      45_000,    // 45 s timeout — resume parsing can be verbose
      4000,      // up to 4k tokens for a full resume
    );
  } catch (aiError) {
    return NextResponse.json(
      {
        error:
          aiError instanceof Error
            ? aiError.message
            : "AI parsing service unavailable.",
      },
      { status: 503 },
    );
  }

  if (!rawAiResponse) {
    return NextResponse.json(
      { error: "AI parsing returned an empty response. Please try again." },
      { status: 503 },
    );
  }

  /* ── 4. Parse and validate the JSON returned by the AI ── */
  const parsed = parseJsonFromModel<ProfileData>(rawAiResponse);
  if (!parsed) {
    return NextResponse.json(
      { error: "Failed to parse AI response. Please try again." },
      { status: 500 },
    );
  }

  if (anonymousUsageContext) {
    await anonymousUsageContext.client.from("ip_usage").upsert(
      {
        ip_address: anonymousUsageContext.ip,
        use_count: anonymousUsageContext.currentCount + 1,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "ip_address" },
    );
  }

  /* ── 5. Normalise: ensure all required fields exist and arrays are clean ── */
  const profile: ProfileData = {
    name: String(parsed.name ?? "").trim(),
    email: String(parsed.email ?? "").trim(),
    phone: String(parsed.phone ?? "").trim(),
    location: String(parsed.location ?? "").trim(),
    linkedin: String(parsed.linkedin ?? "").trim(),
    github: String(parsed.github ?? "").trim(),
    portfolio: String(parsed.portfolio ?? "").trim(),
    summary: String(parsed.summary ?? "").trim(),
    experience: (Array.isArray(parsed.experience) ? parsed.experience : []).map((e) => ({
      company: String(e.company ?? "").trim(),
      title: String(e.title ?? "").trim(),
      dates: String(e.dates ?? "").trim(),
      location: String(e.location ?? "").trim(),
      bullets: (Array.isArray(e.bullets) ? e.bullets : [])
        .map((b) => String(b).trim())
        .filter(Boolean),
    })).filter((e) => e.company || e.title || e.dates || e.location || e.bullets.length),
    skills: (Array.isArray(parsed.skills) ? parsed.skills : []).map((s) => ({
      category: String(s.category ?? "").trim(),
      items: (Array.isArray(s.items) ? s.items : [])
        .map((i) => String(i).trim())
        .filter(Boolean),
    })).filter((s) => s.category || s.items.length),
    projects: (Array.isArray(parsed.projects) ? parsed.projects : []).map((p) => ({
      name: String(p.name ?? "").trim(),
      tech: String(p.tech ?? "").trim(),
      link: String(p.link ?? "").trim(),
      website: String(p.website ?? "").trim(),
      bullets: (Array.isArray(p.bullets) ? p.bullets : [])
        .map((b) => String(b).trim())
        .filter(Boolean),
    })).filter((p) => p.name || p.bullets.length),
    education: (Array.isArray(parsed.education) ? parsed.education : []).map((e) => ({
      institution: String(e.institution ?? "").trim(),
      degree: String(e.degree ?? "").trim(),
      year: String(e.year ?? "").trim(),
      gpa: String(e.gpa ?? "").trim(),
    })).filter((e) => e.institution || e.degree),
    certifications: (Array.isArray(parsed.certifications) ? parsed.certifications : [])
      .map((c) => String(c).trim())
      .filter(Boolean),
    awards: (Array.isArray(parsed.awards) ? parsed.awards : [])
      .map((a) => String(a).trim())
      .filter(Boolean),
  };

  return NextResponse.json({ profile });
}
