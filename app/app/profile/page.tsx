"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  Award,
  Trophy,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvaluationStore } from "@/store/evaluation-store";
import { useProfileStore } from "@/store/profile-store";
import type { ProfileData } from "@/app/api/profile/route";

const SETTINGS_STORAGE_KEY = "ats-precision-settings";

/* ─── Types ────────────────────────────────────────────────────────────── */

interface ExpEntry {
  id: string;
  company: string;
  title: string;
  dates: string;
  location: string;
  bullets: string;
}

interface SkillEntry {
  id: string;
  category: string;
  items: string;
}

interface ProjectEntry {
  id: string;
  name: string;
  tech: string;
  link: string;
  website: string;
  bullets: string;
}

interface EduEntry {
  id: string;
  institution: string;
  degree: string;
  year: string;
  gpa: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ─── Sub-components ───────────────────────────────────────────────────── */

function SectionHeader({
  sectionId,
  title,
  icon: Icon,
  count,
  open,
  onToggle,
}: {
  sectionId: string;
  title: string;
  icon: typeof User;
  count?: number;
  open: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(sectionId)}
      className="flex w-full items-center justify-between bg-neutral-300 px-4 py-3 text-left transition-all duration-200 ease-out hover:bg-neutral-400"
    >
      <span className="label-sm flex items-center gap-2 text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
        {count != null && (
          <span className="bg-surface-highest px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {count}
          </span>
        )}
      </span>
      {open ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="label-sm text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-0 bg-surface-low ring-1 ring-surface-highest focus-visible:ring-foreground/30 text-sm"
      />
    </div>
  );
}

function TextareaField({
  label,
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="label-sm text-muted-foreground">
        {label}
        {hint && (
          <span className="ml-1.5 text-muted-foreground/50 normal-case font-normal">
            {hint}
          </span>
        )}
      </Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none bg-surface-highest p-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-out focus:outline-none focus:ring-1 focus:ring-foreground/30"
      />
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-surface-highest py-3 text-sm text-muted-foreground transition-all duration-200 ease-out hover:border-foreground/30 hover:text-foreground"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

function ImportSaveNoticeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="profile-import-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="profile-import-modal"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-background p-6 shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground"
              aria-label="Close import notice"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="label-sm text-muted-foreground">PROFILE IMPORTED</p>
            <h2 className="mt-4 font-display text-2xl font-semibold text-foreground sm:text-3xl">
              Save your profile to keep the imported resume data
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Your resume details were added to the profile form locally. Review
              and edit anything you want, then use Save Profile to persist the
              imported data to your account.
            </p>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={onClose}>
                Review Profile
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const localHistory = useEvaluationStore((state) => state.history);
  const setProfileDraft = useProfileStore((state) => state.setDraft);
  /** Prevents the sync effect from writing empty initial state to the store. */
  const hasLoadedRef = useRef(false);
  /** Skips the first sync pass after hydration to avoid writing untouched form defaults. */
  const hasSkippedInitialSyncRef = useRef(false);
  /** Snapshot of the store draft captured once; read by loadProfile on mount without subscribing to store updates. */
  const initialDraftRef = useRef(useProfileStore.getState().draft);
  const importInputRef = useRef<HTMLInputElement>(null);

  /* ── Contact ── */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [contactLocation, setContactLocation] = useState("");
  const [summary, setSummary] = useState("");

  /* ── Dynamic sections ── */
  const [experiences, setExperiences] = useState<ExpEntry[]>([
    { id: uid(), company: "", title: "", dates: "", location: "", bullets: "" },
  ]);
  const [skills, setSkills] = useState<SkillEntry[]>([
    { id: uid(), category: "Programming Languages", items: "" },
    { id: uid(), category: "Frameworks & Libraries", items: "" },
    { id: uid(), category: "Tools & Platforms", items: "" },
  ]);
  const [projects, setProjects] = useState<ProjectEntry[]>([
    { id: uid(), name: "", tech: "", link: "", website: "", bullets: "" },
  ]);
  const [education, setEducation] = useState<EduEntry[]>([
    { id: uid(), institution: "", degree: "", year: "", gpa: "" },
  ]);
  const [certifications, setCertifications] = useState("");
  const [awards, setAwards] = useState("");

  /* ── UI state ── */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [exportStatus, setExportStatus] = useState<"idle" | "done" | "error">(
    "idle",
  );
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [isImportingResume, setIsImportingResume] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedResumeName, setImportedResumeName] = useState<string | null>(
    null,
  );
  const [showImportSaveNotice, setShowImportSaveNotice] = useState(false);

  const mapImportError = (message?: string) => {
    if (message === "FREE_LIMIT_REACHED") {
      return "You have reached the free resume import limit. Sign in to continue importing resumes.";
    }

    return message ?? "AI parsing failed. Please try again.";
  };

  const getLocalSettingsSnapshot = () => {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const buildCurrentProfileSnapshot = () => ({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    location: contactLocation.trim(),
    linkedin: linkedin.trim(),
    github: github.trim(),
    portfolio: portfolio.trim(),
    summary: summary.trim(),
    experience: experiences
      .filter((e) => e.company.trim() || e.title.trim())
      .map((e) => ({
        company: e.company.trim(),
        title: e.title.trim(),
        dates: e.dates.trim(),
        location: e.location.trim(),
        bullets: e.bullets
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
      })),
    skills: skills
      .filter((s) => s.category.trim() || s.items.trim())
      .map((s) => ({
        category: s.category.trim(),
        items: s.items
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
      })),
    projects: projects
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        tech: p.tech.trim(),
        link: p.link.trim(),
        website: p.website.trim(),
        bullets: p.bullets
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
      })),
    education: education
      .filter((e) => e.institution.trim() || e.degree.trim())
      .map((e) => ({
        institution: e.institution.trim(),
        degree: e.degree.trim(),
        year: e.year.trim(),
        gpa: e.gpa.trim(),
      })),
    certifications: certifications
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean),
    awards: awards
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean),
  });
  const applyImportedProfile = useCallback((draft: ProfileData) => {
    const experience = draft.experience ?? [];
    const skills = draft.skills ?? [];
    const projects = draft.projects ?? [];
    const education = draft.education ?? [];
    const certifications = draft.certifications ?? [];
    const awards = draft.awards ?? [];

    setName(draft.name ?? "");
    setEmail(draft.email ?? "");
    setPhone(draft.phone ?? "");
    setContactLocation(draft.location ?? "");
    setLinkedin(draft.linkedin ?? "");
    setGithub(draft.github ?? "");
    setPortfolio(
      (draft as typeof draft & { portfolio?: string }).portfolio ?? "",
    );
    setSummary(draft.summary ?? "");

    setExperiences(
      experience.map((entry) => ({
        id: uid(),
        company: entry.company,
        title: entry.title,
        dates: entry.dates,
        location: entry.location,
        bullets: entry.bullets.join("\n"),
      })),
    );

    setSkills(
      skills.map((entry) => ({
        id: uid(),
        category: entry.category,
        items: entry.items.join(", "),
      })),
    );

    setProjects(
      projects.map((entry) => ({
        id: uid(),
        name: entry.name,
        tech: entry.tech,
        link: entry.link,
        website: entry.website,
        bullets: entry.bullets.join("\n"),
      })),
    );

    setEducation(
      education.map((entry) => ({
        id: uid(),
        institution: entry.institution,
        degree: entry.degree,
        year: entry.year,
        gpa: entry.gpa,
      })),
    );

    setCertifications(certifications.join("\n"));
    setAwards(awards.join("\n"));

    setOpenSections(
      new Set(
        [
          "contact",
          draft.summary && "summary",
          experience.length && "experience",
          skills.length && "skills",
          projects.length && "projects",
          education.length && "education",
          certifications.length && "certifications",
          awards.length && "awards",
        ].filter(Boolean) as string[],
      ),
    );
  }, []);

  const handleImportResume = useCallback(
    async (file: File | null) => {
      if (!file) return;

      const lowerName = file.name.toLowerCase();
      if (!(lowerName.endsWith(".pdf") || lowerName.endsWith(".docx"))) {
        setImportError("Please upload a PDF or DOCX resume.");
        if (importInputRef.current) importInputRef.current.value = "";
        return;
      }

      setIsImportingResume(true);
      setImportError(null);

      try {
        const formData = new FormData();
        formData.append("resume", file);

        const res = await fetch("/api/profile/parse-resume", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as {
          profile?: ProfileData;
          error?: string;
        };

        if (!res.ok || !data.profile) {
          throw new Error(mapImportError(data.error));
        }

        applyImportedProfile(data.profile);
        setImportedResumeName(file.name);
        setShowImportSaveNotice(true);
      } catch (error) {
        setImportError(
          error instanceof Error
            ? error.message
            : "Failed to parse the uploaded resume.",
        );
      } finally {
        setIsImportingResume(false);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    },
    [applyImportedProfile],
  );

  async function handleExport() {
    setExporting(true);
    setExportStatus("idle");

    try {
      const currentProfile = buildCurrentProfileSnapshot();
      const res = await fetch("/api/profile/export", {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      let cloudData: Record<string, unknown>;

      if (res.ok) {
        cloudData = await res.json();
      } else {
        let errorMessage = "Cloud export unavailable";

        try {
          const errorBody = await res.json();
          if (typeof errorBody?.error === "string") {
            errorMessage = errorBody.error;
          }
        } catch {
          // Ignore non-JSON error responses and continue with local export.
        }

        cloudData = {
          exportVersion: 1,
          exportedAt: new Date().toISOString(),
          user: null,
          counts: {
            evaluations: 0,
            hasProfile: false,
          },
          profile: null,
          evaluations: [],
          warnings: [errorMessage],
        };
      }

      const exportPayload = {
        ...cloudData,
        localData: {
          exportedAt: new Date().toISOString(),
          settings: getLocalSettingsSnapshot(),
          currentProfile,
          sessionHistory: localHistory,
        },
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = (name.trim() || "profile")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      link.href = url;
      link.download = `${safeName || "profile"}-atsprecise-export.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportStatus("done");
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch (err) {
      void err;
      setExportStatus("error");
      setTimeout(() => setExportStatus("idle"), 4000);
    } finally {
      setExporting(false);
    }
  }

  /* ── Load profile on mount ── */
  const loadProfile = useCallback(async () => {
    const restoreFromStoreDraft = () => {
      const storeDraft = initialDraftRef.current;
      if (!storeDraft) return false;

      setName(storeDraft.name);
      setEmail(storeDraft.email);
      setPhone(storeDraft.phone);
      setContactLocation(storeDraft.location);
      setLinkedin(storeDraft.linkedin);
      setGithub(storeDraft.github);
      setPortfolio(
        (storeDraft as typeof storeDraft & { portfolio?: string }).portfolio ??
          "",
      );
      setSummary(storeDraft.summary);
      if (storeDraft.experiences.length)
        setExperiences(
          storeDraft.experiences.map((e) => ({ ...e, id: uid() })),
        );
      if (storeDraft.skills.length)
        setSkills(storeDraft.skills.map((s) => ({ ...s, id: uid() })));
      if (storeDraft.projects.length)
        setProjects(storeDraft.projects.map((p) => ({ ...p, id: uid() })));
      if (storeDraft.education.length)
        setEducation(storeDraft.education.map((e) => ({ ...e, id: uid() })));
      if (storeDraft.certifications)
        setCertifications(storeDraft.certifications);
      if (storeDraft.awards) setAwards(storeDraft.awards);

      // Open sections that have restored data so the user sees them immediately.
      setOpenSections(() => {
        const s = new Set<string>(["contact"]);
        if (storeDraft.summary) s.add("summary");
        if (storeDraft.experiences.length) s.add("experience");
        if (storeDraft.skills.length) s.add("skills");
        if (storeDraft.projects.length) s.add("projects");
        if (storeDraft.education.length) s.add("education");
        if (storeDraft.certifications) s.add("certifications");
        if (storeDraft.awards) s.add("awards");
        return s;
      });

      return true;
    };

    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        restoreFromStoreDraft();
        return;
      }

      const { profile } = await res.json();
      if (!profile) {
        restoreFromStoreDraft();
        return;
      }

      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setPhone(profile.phone ?? "");
      setContactLocation(profile.location ?? "");
      setLinkedin(profile.linkedin ?? "");
      setGithub(profile.github ?? "");
      setPortfolio(profile.portfolio ?? "");
      setSummary(profile.summary ?? "");

      if (profile.experience?.length) {
        setExperiences(
          profile.experience.map(
            (e: {
              company?: string;
              title?: string;
              dates?: string;
              location?: string;
              bullets?: string[] | string;
            }) => ({
              id: uid(),
              company: e.company ?? "",
              title: e.title ?? "",
              dates: e.dates ?? "",
              location: e.location ?? "",
              bullets: Array.isArray(e.bullets)
                ? e.bullets.join("\n")
                : (e.bullets ?? ""),
            }),
          ),
        );
      }

      if (profile.skills?.length) {
        setSkills(
          profile.skills.map(
            (s: { category?: string; items?: string[] | string }) => ({
              id: uid(),
              category: s.category ?? "",
              items: Array.isArray(s.items)
                ? s.items.join(", ")
                : (s.items ?? ""),
            }),
          ),
        );
      }

      if (profile.projects?.length) {
        setProjects(
          profile.projects.map(
            (p: {
              name?: string;
              tech?: string;
              link?: string;
              website?: string;
              bullets?: string[] | string;
            }) => ({
              id: uid(),
              name: p.name ?? "",
              tech: p.tech ?? "",
              link: p.link ?? "",
              website: p.website ?? "",
              bullets: Array.isArray(p.bullets)
                ? p.bullets.join("\n")
                : (p.bullets ?? ""),
            }),
          ),
        );
      }

      if (profile.education?.length) {
        setEducation(
          profile.education.map(
            (e: {
              institution?: string;
              degree?: string;
              year?: string;
              gpa?: string;
            }) => ({
              id: uid(),
              institution: e.institution ?? "",
              degree: e.degree ?? "",
              year: e.year ?? "",
              gpa: e.gpa ?? "",
            }),
          ),
        );
      }

      if (profile.certifications?.length) {
        setCertifications(profile.certifications.join("\n"));
      }

      if (profile.awards?.length) {
        setAwards(profile.awards.join("\n"));
      }
    } catch (err) {
      void err;
      restoreFromStoreDraft();
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ── Sync form state → session store ── */
  /* Runs after every change so unsaved data survives navigation within the session. */
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!hasSkippedInitialSyncRef.current) {
      hasSkippedInitialSyncRef.current = true;
      return;
    }

    setProfileDraft({
      name,
      email,
      phone,
      location: contactLocation,
      linkedin,
      github,
      portfolio,
      summary,
      experiences: experiences.map(
        ({ company, title, dates, location, bullets }) => ({
          company,
          title,
          dates,
          location,
          bullets,
        }),
      ),
      skills: skills.map(({ category, items }) => ({ category, items })),
      projects: projects.map(({ name: n, tech, link, website, bullets }) => ({
        name: n,
        tech,
        link,
        website,
        bullets,
      })),
      education: education.map(({ institution, degree, year, gpa }) => ({
        institution,
        degree,
        year,
        gpa,
      })),
      certifications,
      awards,
    });
  }, [
    name,
    email,
    phone,
    contactLocation,
    linkedin,
    github,
    portfolio,
    summary,
    experiences,
    skills,
    projects,
    education,
    certifications,
    awards,
    setProfileDraft,
  ]);

  /* ── Section toggling ── */
  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Array updaters ── */
  const updateExp = (id: string, field: keyof ExpEntry, val: string) =>
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)),
    );
  const removeExp = (id: string) =>
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  const addExp = () =>
    setExperiences((prev) => [
      ...prev,
      {
        id: uid(),
        company: "",
        title: "",
        dates: "",
        location: "",
        bullets: "",
      },
    ]);

  const updateSkill = (id: string, field: keyof SkillEntry, val: string) =>
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
    );
  const removeSkill = (id: string) =>
    setSkills((prev) => prev.filter((s) => s.id !== id));
  const addSkill = () =>
    setSkills((prev) => [...prev, { id: uid(), category: "", items: "" }]);

  const updateProject = (id: string, field: keyof ProjectEntry, val: string) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    );
  const removeProject = (id: string) =>
    setProjects((prev) => prev.filter((p) => p.id !== id));
  const addProject = () =>
    setProjects((prev) => [
      ...prev,
      { id: uid(), name: "", tech: "", link: "", website: "", bullets: "" },
    ]);

  const updateEdu = (id: string, field: keyof EduEntry, val: string) =>
    setEducation((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)),
    );
  const removeEdu = (id: string) =>
    setEducation((prev) => prev.filter((e) => e.id !== id));
  const addEdu = () =>
    setEducation((prev) => [
      ...prev,
      { id: uid(), institution: "", degree: "", year: "", gpa: "" },
    ]);

  /* ── Save profile ── */
  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");

    const hasProjectMissingRepoLink = projects.some(
      (p) => p.name.trim() && !p.link.trim(),
    );
    if (hasProjectMissingRepoLink) {
      setSaveStatus("error");
      setSaving(false);
      return;
    }

    const profile = buildCurrentProfileSnapshot();

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (!res.ok) throw new Error("Save failed");

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    } finally {
      setSaving(false);
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl"
      >
        <p className="label-sm text-muted-foreground">PROFILE</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your Resume Profile
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Save your complete resume details here. When you use the Builder tab,
          just paste a job description and the AI will create a tailored resume
          from your saved profile.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-surface-low p-4">
          <p className="text-sm text-muted-foreground">
            Download your saved profile, synced evaluations, and browser-stored
            app data in one JSON export.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="min-w-44"
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting…
              </span>
            ) : exportStatus === "done" ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Downloaded
              </span>
            ) : exportStatus === "error" ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Export Failed
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </span>
            )}
          </Button>
        </div>

        <div className="mt-4 bg-surface-low p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label-sm text-muted-foreground">RESUME IMPORT</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
                Import profile details from your current resume
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Upload a PDF or DOCX resume. Our AI will read every section and
                automatically fill all profile fields — contact info, summary,
                experience, skills, projects, education, and more. Review the
                imported data, then save your profile to persist it.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <input
                ref={importInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) =>
                  void handleImportResume(event.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => importInputRef.current?.click()}
                disabled={isImportingResume}
                className="min-w-56"
              >
                {isImportingResume ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing with AI…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileUp className="h-4 w-4" />
                    Upload Resume to Import
                  </span>
                )}
              </Button>
              {importedResumeName && !importError && (
                <p className="text-xs text-muted-foreground">
                  Imported from {importedResumeName}
                </p>
              )}
            </div>
          </div>
          {importError && (
            <p className="mt-3 text-sm font-medium text-destructive">
              {importError}
            </p>
          )}
        </div>

        <div className="mt-10 space-y-4">
          {/* Contact Information */}
          <SectionHeader
            sectionId="contact"
            title="CONTACT INFORMATION"
            icon={User}
            open={openSections.has("contact")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("contact") && (
              <motion.div
                key="contact"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-low p-5 space-y-4">
                  <Field
                    label="Full Name"
                    id="p-name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Arjun Sharma"
                    required
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Email"
                      id="p-email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="arjun@example.com"
                    />
                    <Field
                      label="Phone"
                      id="p-phone"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Location"
                      id="p-location"
                      value={contactLocation}
                      onChange={setContactLocation}
                      placeholder="Bangalore, India"
                    />
                    <Field
                      label="LinkedIn"
                      id="p-linkedin"
                      value={linkedin}
                      onChange={setLinkedin}
                      placeholder="linkedin.com/in/arjun"
                    />
                  </div>
                  <Field
                    label="GitHub"
                    id="p-github"
                    value={github}
                    onChange={setGithub}
                    placeholder="github.com/arjun"
                  />
                  <Field
                    label="Portfolio"
                    id="p-portfolio"
                    value={portfolio}
                    onChange={setPortfolio}
                    placeholder="arjun.dev or yourportfolio.com"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Professional Summary */}
          <SectionHeader
            sectionId="summary"
            title="PROFESSIONAL SUMMARY"
            icon={Briefcase}
            open={openSections.has("summary")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("summary") && (
              <motion.div
                key="summary"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-low p-5">
                  <TextareaField
                    label="Summary"
                    id="p-summary"
                    value={summary}
                    onChange={setSummary}
                    placeholder="A 2-3 sentence professional summary. The AI will customize this per job description when building."
                    rows={4}
                    hint="(AI will tailor per JD)"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Experience */}
          <SectionHeader
            sectionId="experience"
            title="EXPERIENCE"
            icon={Briefcase}
            count={
              experiences.filter((e) => e.company.trim() || e.title.trim())
                .length
            }
            open={openSections.has("experience")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("experience") && (
              <motion.div
                key="experience"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-3"
              >
                {experiences.map((exp, idx) => (
                  <div key={exp.id} className="bg-surface-low p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="label-sm text-muted-foreground">
                        EXPERIENCE {idx + 1}
                      </p>
                      {experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExp(exp.id)}
                          className="p-1.5 text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-highest hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Company"
                        id={`p-exp-co-${exp.id}`}
                        value={exp.company}
                        onChange={(v) => updateExp(exp.id, "company", v)}
                        placeholder="Acme Corp"
                      />
                      <Field
                        label="Job Title"
                        id={`p-exp-title-${exp.id}`}
                        value={exp.title}
                        onChange={(v) => updateExp(exp.id, "title", v)}
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Dates"
                        id={`p-exp-dates-${exp.id}`}
                        value={exp.dates}
                        onChange={(v) => updateExp(exp.id, "dates", v)}
                        placeholder="Jan 2022 – Present"
                      />
                      <Field
                        label="Location"
                        id={`p-exp-loc-${exp.id}`}
                        value={exp.location}
                        onChange={(v) => updateExp(exp.id, "location", v)}
                        placeholder="Bangalore, India"
                      />
                    </div>
                    <TextareaField
                      label="Responsibilities"
                      id={`p-exp-bullets-${exp.id}`}
                      value={exp.bullets}
                      onChange={(v) => updateExp(exp.id, "bullets", v)}
                      placeholder={
                        "Built REST APIs with Node.js and PostgreSQL\nReduced page load time by optimising frontend bundles\nLed migration from monolith to microservices"
                      }
                      rows={4}
                      hint="(one point per line)"
                    />
                  </div>
                ))}
                <AddButton label="Add Experience" onClick={addExp} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skills */}
          <SectionHeader
            sectionId="skills"
            title="SKILLS"
            icon={Code2}
            count={
              skills.filter((s) => s.category.trim() || s.items.trim()).length
            }
            open={openSections.has("skills")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("skills") && (
              <motion.div
                key="skills"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-low p-5 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Comma-separated skills per category. AI will highlight
                    relevant ones per JD.
                  </p>
                  {skills.map((s) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="flex-1 grid gap-3 sm:grid-cols-5">
                        <div className="sm:col-span-2">
                          <Input
                            value={s.category}
                            onChange={(e) =>
                              updateSkill(s.id, "category", e.target.value)
                            }
                            placeholder="e.g. Languages"
                            className="border-0 bg-surface-highest ring-1 ring-surface-highest focus-visible:ring-foreground/30 text-sm"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <Input
                            value={s.items}
                            onChange={(e) =>
                              updateSkill(s.id, "items", e.target.value)
                            }
                            placeholder="Java, Go, Python, TypeScript"
                            className="border-0 bg-surface-highest ring-1 ring-surface-highest focus-visible:ring-foreground/30 text-sm"
                          />
                        </div>
                      </div>
                      {skills.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSkill(s.id)}
                          className="p-1.5 text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-highest hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSkill}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-highest hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Category
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Projects */}
          <SectionHeader
            sectionId="projects"
            title="PROJECTS"
            icon={FolderGit2}
            count={projects.filter((p) => p.name.trim()).length}
            open={openSections.has("projects")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("projects") && (
              <motion.div
                key="projects"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-3"
              >
                {projects.map((p, idx) => (
                  <div key={p.id} className="bg-surface-low p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="label-sm text-muted-foreground">
                        PROJECT {idx + 1}
                      </p>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProject(p.id)}
                          className="p-1.5 text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-highest hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Project Name"
                        id={`p-proj-name-${p.id}`}
                        value={p.name}
                        onChange={(v) => updateProject(p.id, "name", v)}
                        placeholder="E-Commerce Platform"
                      />
                      <Field
                        label="Tech Stack"
                        id={`p-proj-tech-${p.id}`}
                        value={p.tech}
                        onChange={(v) => updateProject(p.id, "tech", v)}
                        placeholder="React, Node.js, PostgreSQL"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="GitHub / Repo URL"
                        id={`p-proj-link-${p.id}`}
                        value={p.link}
                        onChange={(v) => updateProject(p.id, "link", v)}
                        placeholder="github.com/username/project"
                        required
                      />
                      <Field
                        label="Live Demo / Website"
                        id={`p-proj-website-${p.id}`}
                        value={p.website}
                        onChange={(v) => updateProject(p.id, "website", v)}
                        placeholder="yourproject.vercel.app"
                      />
                    </div>
                    <TextareaField
                      label="What You Built"
                      id={`p-proj-bullets-${p.id}`}
                      value={p.bullets}
                      onChange={(v) => updateProject(p.id, "bullets", v)}
                      placeholder={
                        "Built a cart system with Redis for session management\nDeployed on AWS with auto-scaling and CI/CD pipeline"
                      }
                      rows={3}
                      hint="(one point per line)"
                    />
                  </div>
                ))}
                <AddButton label="Add Project" onClick={addProject} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Education */}
          <SectionHeader
            sectionId="education"
            title="EDUCATION"
            icon={GraduationCap}
            count={
              education.filter((e) => e.institution.trim() || e.degree.trim())
                .length
            }
            open={openSections.has("education")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("education") && (
              <motion.div
                key="education"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-3"
              >
                {education.map((e, idx) => (
                  <div key={e.id} className="bg-surface-low p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="label-sm text-muted-foreground">
                        EDUCATION {idx + 1}
                      </p>
                      {education.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEdu(e.id)}
                          className="p-1.5 text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-highest hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Institution"
                        id={`p-edu-inst-${e.id}`}
                        value={e.institution}
                        onChange={(v) => updateEdu(e.id, "institution", v)}
                        placeholder="IIT Bombay"
                      />
                      <Field
                        label="Degree"
                        id={`p-edu-deg-${e.id}`}
                        value={e.degree}
                        onChange={(v) => updateEdu(e.id, "degree", v)}
                        placeholder="B.Tech Computer Science"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Graduation Year"
                        id={`p-edu-yr-${e.id}`}
                        value={e.year}
                        onChange={(v) => updateEdu(e.id, "year", v)}
                        placeholder="2022"
                      />
                      <Field
                        label="GPA / CGPA (optional)"
                        id={`p-edu-gpa-${e.id}`}
                        value={e.gpa}
                        onChange={(v) => updateEdu(e.id, "gpa", v)}
                        placeholder="8.5 / 10"
                      />
                    </div>
                  </div>
                ))}
                <AddButton label="Add Education" onClick={addEdu} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Certifications */}
          <SectionHeader
            sectionId="certifications"
            title="CERTIFICATIONS"
            icon={Award}
            open={openSections.has("certifications")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("certifications") && (
              <motion.div
                key="certifications"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-low p-5">
                  <TextareaField
                    label="Certifications"
                    id="p-certs"
                    value={certifications}
                    onChange={setCertifications}
                    placeholder={
                      "AWS Certified Developer – Associate\nGoogle Cloud Professional Data Engineer"
                    }
                    rows={3}
                    hint="(one per line)"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Awards & Recognition */}
          <SectionHeader
            sectionId="awards"
            title="AWARDS & RECOGNITION"
            icon={Trophy}
            open={openSections.has("awards")}
            onToggle={toggleSection}
          />
          <AnimatePresence initial={false}>
            {openSections.has("awards") && (
              <motion.div
                key="awards"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-low p-5">
                  <TextareaField
                    label="Awards & Recognition"
                    id="p-awards"
                    value={awards}
                    onChange={setAwards}
                    placeholder={
                      "Best Paper Award – IEEE Conference 2023\nHackathon Winner – TechFest 2022"
                    }
                    rows={3}
                    hint="(one per line)"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save button — sticky at bottom */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-surface-high bg-background/95 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSave}
              size="default"
              className="min-w-36"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : saveStatus === "saved" ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Profile Saved
                </span>
              ) : saveStatus === "error" ? (
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Save Failed
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Profile
                </span>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Your profile is used by the Resume Builder to create tailored
              resumes instantly.
            </p>
          </div>
        </div>
      </motion.div>
      <ImportSaveNoticeModal
        isOpen={showImportSaveNotice}
        onClose={() => setShowImportSaveNotice(false)}
      />
    </div>
  );
}
