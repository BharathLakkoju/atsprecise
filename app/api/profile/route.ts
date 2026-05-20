import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/auth-helpers";

export const maxDuration = 10;

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
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
    website: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
    gpa: string;
  }>;
  certifications: string[];
  awards: string[];
}

/*
 * Required Supabase RLS policies for user_profiles table:
 *
 *   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "Users can view own profile"
 *     ON user_profiles FOR SELECT
 *     USING (auth.uid() = user_id);
 *
 *   CREATE POLICY "Users can insert own profile"
 *     ON user_profiles FOR INSERT
 *     WITH CHECK (auth.uid() = user_id);
 *
 *   CREATE POLICY "Users can update own profile"
 *     ON user_profiles FOR UPDATE
 *     USING (auth.uid() = user_id);
 */

/**
 * GET /api/profile
 * Returns the authenticated user's saved profile, or null if none exists.
 * Uses the authenticated user's server client (RLS-based) — no service role key needed.
 */
export async function GET() {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ profile: null });
  }

  const profile: ProfileData = {
    name: data.name ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    location: data.location ?? "",
    linkedin: data.linkedin ?? "",
    github: data.github ?? "",
    portfolio: data.portfolio ?? "",
    summary: data.summary ?? "",
    experience: (data.experience as ProfileData["experience"]) ?? [],
    skills: (data.skills as ProfileData["skills"]) ?? [],
    projects: (data.projects as ProfileData["projects"]) ?? [],
    education: (data.education as ProfileData["education"]) ?? [],
    certifications: (data.certifications as string[]) ?? [],
    awards: (data.awards as string[]) ?? [],
  };

  return NextResponse.json({ profile });
}

/**
 * PUT /api/profile
 * Upserts the authenticated user's profile.
 * Uses the authenticated user's server client (RLS-based) — no service role key needed.
 */
export async function PUT(request: Request) {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;

  let body: { profile?: ProfileData };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const p = body.profile;
  if (!p) {
    return NextResponse.json({ error: "Profile data is required" }, { status: 400 });
  }

  const hasProjectMissingRepoLink = (p.projects ?? []).some(
    (project) =>
      Boolean(
        project.name?.trim() ||
          project.tech?.trim() ||
          project.website?.trim() ||
          (project.bullets?.length ?? 0) > 0
      ) && !project.link?.trim()
  );
  if (hasProjectMissingRepoLink) {
    return NextResponse.json(
      { error: "GitHub / Repo URL is required for each project." },
      { status: 400 }
    );
  }

  // Determine whether profile is "complete enough" for builder use
  const isComplete =
    Boolean(p.name?.trim()) &&
    ((p.experience?.length ?? 0) > 0 || (p.projects?.length ?? 0) > 0) &&
    (p.skills?.length ?? 0) > 0;

  const row = {
    user_id: user.id,
    name: p.name?.trim() ?? "",
    email: p.email?.trim() ?? "",
    phone: p.phone?.trim() ?? "",
    location: p.location?.trim() ?? "",
    linkedin: p.linkedin?.trim() ?? "",
    github: p.github?.trim() ?? "",
    portfolio: p.portfolio?.trim() ?? "",
    summary: p.summary?.trim() ?? "",
    experience: p.experience ?? [],
    skills: p.skills ?? [],
    projects: p.projects ?? [],
    education: p.education ?? [],
    certifications: (p.certifications ?? []).filter((c: string) => c.trim()),
    awards: (p.awards ?? []).filter((a: string) => a.trim()),
    is_complete: isComplete,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_profiles")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true, isComplete });
}
