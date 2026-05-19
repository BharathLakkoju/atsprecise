"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type DragEvent,
  useCallback,
} from "react";

import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Shield, X, CheckCircle2, FileText } from "lucide-react";

import { ProcessingState } from "@/components/site/processing-state";
import { ResultsDashboard } from "@/components/site/results-dashboard";
import { TailoringDashboard } from "@/components/site/tailoring-dashboard";
import type { TailoringResult } from "@/components/site/tailoring-dashboard";
import { ResumeBuilderForm } from "@/components/site/resume-builder-form";
import { ResumeCreatorForm } from "@/components/site/resume-creator-form";
import { AuthGateModal } from "@/components/site/auth-gate-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { clientEvaluationSchema } from "@/lib/validations/evaluation";
import { useEvaluationStore } from "@/store/evaluation-store";

export type ToolMode = "analysis" | "tailoring" | "builder" | "creator";
type FileStatus = "idle" | "selected" | "ready";
type ExportFormat = "pdf" | "docx";

const stageCount = 4;

const TOOL_META: Record<
  ToolMode,
  { eyebrow: string; heading: string; sub: string; submitLabel: string }
> = {
  analysis: {
    eyebrow: "ATS GAP ANALYSIS",
    heading: "Find the gap. Close it.",
    sub: "Get a precise ATS score, skill gaps, what to learn, and what projects to build.",
    submitLabel: "ANALYZE RESUME",
  },
  tailoring: {
    eyebrow: "RESUME TAILORING",
    heading: "Rewrite for the role.",
    sub: "Your resume, rewritten to mirror the JD's exact vocabulary and requirements.",
    submitLabel: "TAILOR RESUME",
  },
  builder: {
    eyebrow: "RESUME BUILDER",
    heading: "Build from your profile.",
    sub: "Generate a JD-matched resume from your saved profile.",
    submitLabel: "BUILD RESUME",
  },
  creator: {
    eyebrow: "RESUME CREATOR",
    heading: "Target a role. Not a JD.",
    sub: "Rewrite your resume for a role category using only your existing experience — stronger bullets, better framing, zero invented skills.",
    submitLabel: "CREATE RESUME",
  },
};

export function ToolForm({ mode }: { mode: ToolMode }) {
  const meta = TOOL_META[mode];
  const [jdText, setJdText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [tailoringResult, setTailoringResult] =
    useState<TailoringResult | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    latestResult,
    history,
    setLatestResult,
    lastTailoringResult,
    lastBuilderResult,
    setLastTailoringResult,
    setLastBuilderResult,
    lastCreatorResult,
    setLastCreatorResult,
  } = useEvaluationStore();

  useEffect(() => {
    if (!isSubmitting) return;
    const timer = window.setInterval(() => {
      setActiveStage((current) =>
        current < stageCount - 1 ? current + 1 : current,
      );
    }, 520);
    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  // Rehydrate last result from store on mount so navigating back shows previous result
  useEffect(() => {
    if (mode === "analysis" && latestResult) {
      setShowResults(true);
    } else if (mode === "tailoring" && lastTailoringResult) {
      setTailoringResult(lastTailoringResult);
      setShowResults(true);
    } else if (mode === "builder" && lastBuilderResult) {
      setTailoringResult(lastBuilderResult);
      setShowResults(true);
    } else if (mode === "creator" && lastCreatorResult) {
      setTailoringResult(lastCreatorResult);
      setShowResults(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const files = event.clipboardData?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".docx")) {
        setResumeFile(file);
        setFileStatus("selected");
        setTimeout(() => setFileStatus("ready"), 900);
        event.preventDefault();
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setResumeFile(file);
      setFileStatus("selected");
      setTimeout(() => setFileStatus("ready"), 900);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      setResumeFile(file);
      setFileStatus("selected");
      setTimeout(() => setFileStatus("ready"), 900);
    }
  }

  function clearResume() {
    setResumeFile(null);
    setFileStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setShowResults(false);
    setTailoringResult(null);

    if (!resumeFile) {
      setError("Upload a resume before starting the evaluation.");
      return;
    }

    if (mode === "analysis") {
      const parsed = clientEvaluationSchema.safeParse({
        jdText,
        resumeFileName: resumeFile.name,
        resumeFileSize: resumeFile.size,
      });
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ??
            "Please correct the inputs and try again.",
        );
        return;
      }
    } else {
      if (jdText.trim().length < 120) {
        setError(
          "Paste the full job description to tailor your resume (min 120 characters).",
        );
        return;
      }
    }

    setIsSubmitting(true);
    setActiveStage(0);

    try {
      if (mode === "analysis") {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        formData.append("jdText", jdText);

        const response = await fetch("/api/evaluate", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();

        if (response.status === 403 && payload.error === "FREE_LIMIT_REACHED") {
          setShowAuthGate(true);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Evaluation failed.");
        }

        setLatestResult(payload.detectedRole ?? "ATS evaluation", payload);
        setActiveStage(stageCount - 1);
        setShowResults(true);
      } else {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        formData.append("jdText", jdText);
        formData.append("format", exportFormat);

        const response = await fetch("/api/tailor", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();

        if (response.status === 403 && payload.error === "FREE_LIMIT_REACHED") {
          setShowAuthGate(true);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Tailoring failed.");
        }

        setTailoringResult(payload);
        setLastTailoringResult(payload);
        setActiveStage(stageCount - 1);
        setShowResults(true);
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      window.setTimeout(() => setIsSubmitting(false), 300);
    }
  }

  /* ── Processing state ─────────────────────────────────────────────── */
  if (isSubmitting) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <motion.div
          key="processing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          <ProcessingState
            activeStage={activeStage}
            mode={mode === "builder" || mode === "creator" ? "tailoring" : mode}
          />
        </motion.div>
      </div>
    );
  }

  /* ── Analysis result ──────────────────────────────────────────────── */
  if (showResults && mode === "analysis" && latestResult) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowResults(false);
                setTailoringResult(null);
              }}
            >
              ← New Analysis
            </Button>
          </div>
          <ResultsDashboard result={latestResult} history={history} />
        </motion.div>
      </div>
    );
  }

  /* ── Tailoring result ─────────────────────────────────────────────── */
  if (showResults && mode === "tailoring" && tailoringResult) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <motion.div
          key="tailor-result"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowResults(false);
                setTailoringResult(null);
              }}
            >
              ← New Tailoring
            </Button>
          </div>
          <TailoringDashboard result={tailoringResult} />
        </motion.div>
      </div>
    );
  }

  /* ── Builder result ──────────────────────────────────────────────── */
  if (showResults && mode === "builder" && tailoringResult) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <motion.div
          key="builder-result"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowResults(false);
                setTailoringResult(null);
              }}
            >
              ← New Build
            </Button>
          </div>
          <TailoringDashboard result={tailoringResult} />
        </motion.div>
      </div>
    );
  }

  /* ── Builder mode ─────────────────────────────────────────────────── */
  if (mode === "builder") {
    return (
      <>
        <AuthGateModal
          isOpen={showAuthGate}
          onClose={() => setShowAuthGate(false)}
        />
        <div className="p-4 sm:p-6 lg:p-10 max-lg:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="label-sm text-muted-foreground">{meta.eyebrow}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {meta.heading}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{meta.sub}</p>
            <div className="mt-6">
              <ResumeBuilderForm
                onResult={(result: TailoringResult) => {
                  setTailoringResult(result);
                  setLastBuilderResult(result);
                  setShowResults(true);
                }}
                onAuthGate={() => setShowAuthGate(true)}
              />
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  /* ── Creator result ───────────────────────────────────────────────── */
  if (showResults && mode === "creator" && tailoringResult) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <motion.div
          key="creator-result"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowResults(false);
                setTailoringResult(null);
              }}
            >
              ← New Creation
            </Button>
          </div>
          <TailoringDashboard result={tailoringResult} />
        </motion.div>
      </div>
    );
  }

  /* ── Creator mode ─────────────────────────────────────────────────── */
  if (mode === "creator") {
    return (
      <>
        <AuthGateModal
          isOpen={showAuthGate}
          onClose={() => setShowAuthGate(false)}
        />
        <div className="p-4 sm:p-6 lg:p-10 max-lg:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="label-sm text-muted-foreground">{meta.eyebrow}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {meta.heading}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{meta.sub}</p>
            <div className="mt-6">
              <ResumeCreatorForm
                onResult={(result: TailoringResult) => {
                  setTailoringResult(result);
                  setLastCreatorResult(result);
                  setShowResults(true);
                }}
                onAuthGate={() => setShowAuthGate(true)}
              />
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  /* ── Analysis / Tailoring form ────────────────────────────────────── */
  return (
    <>
      <AuthGateModal
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
      />
      <div className="p-4 sm:p-6 lg:p-10 max-lg:mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="label-sm text-muted-foreground">{meta.eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {meta.heading}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.sub}</p>

          <form onSubmit={onSubmit} className="mt-8">
            {/* Bento grid */}
            <div className="grid gap-px border border-foreground/10 lg:grid-cols-3">
              {/* ── Upload cell ───────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="flex flex-col bg-surface-lowest p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Label className="label-sm flex items-center gap-2 text-foreground">
                    <FileUp className="h-4 w-4" />
                    RESUME UPLOAD
                  </Label>
                  <span className="label-sm text-muted-foreground">
                    PDF, DOCX
                  </span>
                </div>

                <label
                  htmlFor="resume-upload"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-8 transition-all duration-300 ${
                    fileStatus === "ready"
                      ? "border-foreground/40 bg-surface-low"
                      : fileStatus === "selected"
                        ? "border-foreground/20 bg-surface-low"
                        : isDragging
                          ? "border-foreground bg-surface-highest"
                          : "border-surface-highest bg-surface-base hover:border-muted-foreground"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {fileStatus === "idle" && (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className="flex h-12 w-12 items-center justify-center bg-foreground text-white">
                          <FileUp className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <p className="font-display font-semibold text-foreground">
                            {isDragging
                              ? "Release to upload"
                              : "Drop resume here"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            or tap to browse
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {fileStatus === "selected" && (
                      <motion.div
                        key="selected"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: "easeInOut",
                          }}
                          className="flex h-12 w-12 items-center justify-center bg-surface-highest"
                        >
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </motion.div>
                        <div className="text-center">
                          <p className="font-display font-semibold text-foreground">
                            {resumeFile?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Reading file…
                          </p>
                        </div>
                        <div className="h-1 w-36 overflow-hidden bg-surface-highest">
                          <motion.div
                            className="h-full bg-foreground"
                            initial={{ width: "0%" }}
                            animate={{ width: "80%" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {fileStatus === "ready" && resumeFile && (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="flex h-12 w-12 items-center justify-center bg-foreground text-white"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </motion.div>
                        <div className="text-center">
                          <p className="font-display font-semibold text-foreground">
                            {resumeFile.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB ·
                            Ready
                          </p>
                        </div>
                        <div className="h-1 w-36 overflow-hidden bg-surface-highest">
                          <motion.div
                            className="h-full bg-foreground"
                            initial={{ width: "80%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            clearResume();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-highest hover:text-foreground"
                        >
                          <X className="h-3 w-3" /> Remove
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>

                <Input
                  ref={fileInputRef}
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.docx"
                  className="sr-only"
                  onChange={handleFileChange}
                />

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-surface-highest" />
                  <span className="label-sm text-muted-foreground">
                    {fileStatus === "ready"
                      ? "FILE READY"
                      : fileStatus === "selected"
                        ? "READING…"
                        : "MAX 5MB"}
                  </span>
                </div>
              </motion.div>

              {/* ── JD cell ───────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex flex-col bg-surface-lowest p-6 lg:col-span-2"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Label className="label-sm flex items-center gap-2 text-foreground">
                    <FileUp className="h-4 w-4" />
                    TARGET ROLE DESCRIPTION
                  </Label>
                  <span className="label-sm text-muted-foreground">
                    {jdText.length} / 10000
                  </span>
                </div>

                <div className="relative flex-1 min-h-64 bg-surface-base ring-1 ring-surface-highest focus-within:ring-foreground/30 transition-shadow">
                  <textarea
                    value={jdText}
                    maxLength={10000}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the job description, required skills, or responsibilities here..."
                    className="absolute inset-0 w-full h-full resize-none overflow-y-auto bg-transparent p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5">
                    <span className="label-sm text-muted-foreground/60">
                      PRECISION MODE
                    </span>
                    <span className="h-1.5 w-1.5 bg-foreground/60" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-surface-highest" />
                  <span className="label-sm text-muted-foreground">
                    {mode === "analysis" ? "ATS MODE" : "TAILORING MODE"}
                  </span>
                </div>
              </motion.div>

              {/* ── Action strip ──────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="flex flex-col gap-4 bg-foreground p-6 sm:flex-row sm:items-center sm:justify-between lg:col-span-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                  {/* Export format (tailoring only) */}
                  {mode === "tailoring" && (
                    <div className="flex items-center gap-2">
                      <span className="label-sm text-white/50 shrink-0">
                        FORMAT
                      </span>
                      <div className="flex gap-1">
                        {(["pdf", "docx"] as ExportFormat[]).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setExportFormat(fmt)}
                            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ease-out ${
                              exportFormat === fmt
                                ? "bg-white text-foreground"
                                : "text-white/50 hover:text-white"
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                  type="submit"
                  size="lg"
                  className="shrink-0 bg-white text-foreground hover:bg-white/90"
                  disabled={isSubmitting}
                >
                  <span className="flex items-center gap-2">
                    {isSubmitting ? "PROCESSING..." : meta.submitLabel}
                    <BarChartIcon />
                  </span>
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

function BarChartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}
