"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Shield, UserCheck, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ProcessingState } from "@/components/site/processing-state";
import type { TailoringResult } from "@/components/site/tailoring-dashboard";

/* ─── Main component ───────────────────────────────────────────────────── */

export function ResumeCreatorForm({
  onResult,
  onAuthGate,
}: {
  onResult: (result: TailoringResult) => void;
  onAuthGate: () => void;
}) {
  const [targetRole, setTargetRole] = useState("");
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ── Check if profile exists ── */
  const checkProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const { profile } = await res.json();
      if (profile?.name) setProfileName(profile.name);
    } catch {
      // silent
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  useEffect(() => {
    if (!isSubmitting) return;
    const timer = window.setInterval(() => {
      setActiveStage((s) => (s < 3 ? s + 1 : s));
    }, 520);
    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  /* ── Submit ── */
  async function handleSubmit() {
    setError(null);

    if (!profileName) {
      setError("Save your resume details in the Profile tab first.");
      return;
    }

    if (targetRole.trim().length < 3) {
      setError(
        "Enter a target role (e.g. 'Frontend Developer', 'Data Scientist').",
      );
      return;
    }

    setIsSubmitting(true);
    setActiveStage(0);

    try {
      /* Fetch full profile */
      const profileRes = await fetch("/api/profile");
      if (!profileRes.ok) throw new Error("Could not load your profile.");
      const { profile } = await profileRes.json();
      if (!profile?.name)
        throw new Error("Profile is empty. Fill it in the Profile tab.");

      const resumeData = {
        name: profile.name ?? "",
        contact: {
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          linkedin: profile.linkedin ?? "",
          github: profile.github ?? "",
          portfolio: profile.portfolio ?? "",
          location: profile.location ?? "",
        },
        summary: profile.summary ?? "",
        experience: (profile.experience ?? []).map(
          (e: {
            company?: string;
            title?: string;
            dates?: string;
            location?: string;
            bullets?: string[] | string;
          }) => ({
            company: e.company ?? "",
            title: e.title ?? "",
            dates: e.dates ?? "",
            location: e.location ?? "",
            bullets: Array.isArray(e.bullets)
              ? e.bullets
              : (e.bullets ?? "").split("\n").filter(Boolean),
          }),
        ),
        skills: (profile.skills ?? []).map(
          (s: { category?: string; items?: string[] | string }) => ({
            category: s.category ?? "",
            items: Array.isArray(s.items)
              ? s.items
              : (s.items ?? "")
                  .split(",")
                  .map((i: string) => i.trim())
                  .filter(Boolean),
          }),
        ),
        projects: (profile.projects ?? []).map(
          (p: {
            name?: string;
            tech?: string;
            link?: string;
            website?: string;
            bullets?: string[] | string;
          }) => ({
            name: p.name ?? "",
            tech: p.tech ?? "",
            link: p.link ?? "",
            website: p.website ?? "",
            bullets: Array.isArray(p.bullets)
              ? p.bullets
              : (p.bullets ?? "").split("\n").filter(Boolean),
          }),
        ),
        education: (profile.education ?? []).map(
          (e: {
            institution?: string;
            degree?: string;
            year?: string;
            gpa?: string;
          }) => ({
            institution: e.institution ?? "",
            degree: e.degree ?? "",
            year: e.year ?? "",
            gpa: e.gpa ?? "",
          }),
        ),
        certifications: Array.isArray(profile.certifications)
          ? profile.certifications
          : [],
        awards: Array.isArray(profile.awards) ? profile.awards : [],
      };

      const response = await fetch("/api/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData,
          targetRole: targetRole.trim(),
          format,
        }),
      });

      const payload = await response.json();

      if (response.status === 403 && payload.error === "FREE_LIMIT_REACHED") {
        onAuthGate();
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create resume.");
      }

      setActiveStage(3);
      onResult(payload as TailoringResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  }

  /* ── Processing overlay ── */
  if (isSubmitting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <ProcessingState activeStage={activeStage} mode="tailoring" />
      </div>
    );
  }

  /* ── Loading check ── */
  if (profileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="grid gap-px border border-foreground/10 lg:grid-cols-3">
      {/* ── Profile status cell ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col justify-between p-6 ${
          profileName
            ? "bg-foreground text-primary-foreground"
            : "bg-surface-low"
        }`}
      >
        <div>
          <p
            className={`label-sm ${
              profileName ? "text-white/50" : "text-muted-foreground"
            }`}
          >
            CREATING AS
          </p>
          {profileName ? (
            <>
              <p className="mt-3 font-display text-2xl font-black tracking-tight text-white">
                {profileName}
              </p>
              <p className="mt-1 text-xs text-white/50">
                Details loaded from saved profile
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 font-display text-lg font-bold text-foreground">
                No profile saved
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your resume details in Profile first
              </p>
              <Link
                href="/app/profile"
                className="mt-4 inline-flex items-center gap-1.5 label-sm text-foreground underline-offset-2 hover:underline"
              >
                Go to Profile →
              </Link>
            </>
          )}
        </div>
        {profileName && (
          <div className="mt-6 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-white/60" />
            <span className="label-sm text-white/60">PROFILE LOADED</span>
          </div>
        )}
      </motion.div>

      {/* ── Target Role cell ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col bg-surface-lowest p-6 lg:col-span-2"
      >
        <div className="mb-4 flex items-center justify-between">
          <Label
            htmlFor="target-role"
            className="label-sm flex items-center gap-2 text-foreground"
          >
            <Sparkles className="h-4 w-4" />
            TARGET ROLE
            <span className="text-destructive">*</span>
          </Label>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            id="target-role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Frontend Developer, Data Scientist, Backend Engineer…"
            className="h-12 bg-surface-base text-sm ring-1 ring-surface-highest focus-visible:ring-foreground/30 rounded-none border-0"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground leading-5">
            The AI will rewrite your resume to be universally strong for this
            role — improving bullet points, highlighting relevant skills, and
            selecting your best projects.{" "}
            <span className="font-medium text-foreground">
              No new skills are added.
            </span>
          </p>

          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              "Frontend Developer",
              "Backend Engineer",
              "Full Stack Developer",
              "Data Scientist",
              "DevOps Engineer",
              "Product Manager",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTargetRole(suggestion)}
                className={`px-3 py-2 text-xs font-medium text-left transition-all duration-200 ease-out border ${
                  targetRole === suggestion
                    ? "border-foreground bg-surface-low text-foreground"
                    : "border-surface-highest text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-highest" />
          <span className="label-sm text-muted-foreground">CREATOR MODE</span>
        </div>
      </motion.div>

      {/* ── Action strip ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex flex-col gap-4 bg-foreground p-6 sm:flex-row sm:items-center sm:justify-between lg:col-span-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="label-sm text-white/50 shrink-0">FORMAT</span>
            <div className="flex gap-1">
              {(["pdf", "docx"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ease-out ${
                    format === fmt
                      ? "bg-white text-foreground"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-red-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="flex items-center gap-1.5 label-sm text-white/40">
            <Shield className="h-3.5 w-3.5" />
            DATA PROCESSED SECURELY
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          className="shrink-0 bg-white text-foreground hover:bg-white/90 gap-2"
          onClick={handleSubmit}
          disabled={isSubmitting || !profileName}
        >
          <Sparkles className="h-4 w-4" />
          CREATE RESUME
        </Button>
      </motion.div>
    </div>
  );
}
