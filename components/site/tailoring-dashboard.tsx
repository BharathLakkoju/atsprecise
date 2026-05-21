"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Types (matching the AI response schema) ─────────────────────────── */

export interface TailoredResume {
  header: {
    name: string;
    title: string;
    contact: {
      phone: string;
      email: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
      location: string;
    };
  };
  professional_summary: string;
  technical_skills: {
    programming_languages?: string[];
    frontend_and_frameworks?: string[];
    backend_and_frameworks?: string[];
    databases?: string[];
    cloud_and_devops?: string[];
    tools_and_platforms?: string[];
    libraries_and_frameworks?: string[];
    soft_skills?: string[];
    other_skills?: string[];
  };
  professional_experience: Array<{
    job_title: string;
    company: string;
    employment_type?: string;
    location?: string;
    duration: { start: string; end?: string };
    responsibilities: string[];
    achievements?: string[];
    technologies_used?: string[];
  }>;
  projects: Array<{
    title: string;
    role?: string;
    duration?: { start?: string; end?: string };
    description?: string;
    highlights?: string[];
    technologies_used?: string[];
    github_url?: string;
    live_demo_url?: string;
  }>;
  education: Array<{
    degree: string;
    field_of_study?: string;
    institution: string;
    location?: string;
    graduation_date?: string;
    gpa?: string;
    percentage?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    issue_date?: string;
    credential_id?: string;
    credential_url?: string;
  }>;
  achievements?: string[];
  publications?: Array<{
    title: string;
    publisher?: string;
    publication_date?: string;
    url?: string;
  }>;
  languages?: Array<{ language: string; proficiency?: string }>;
  interests?: string[];
}

export interface TailoringResult {
  atsScore?: number;
  issues: Array<{ section: string; issue: string; severity: string }>;
  tailoredResume: TailoredResume;
  changesApplied: Array<{
    section: string;
    what: string;
    why: string;
  }>;
  format?: "pdf" | "docx";
  processingMs?: number;
  companyName?: string;
}

type Tab = "preview" | "issues" | "changes";

/* ─────────────────────────────────────────────────────────── helpers ── */

function severityColor(s: string) {
  if (s === "high") return "bg-red-100 text-red-700";
  if (s === "medium") return "bg-amber-100 text-amber-700";
  return "bg-surface-low text-muted-foreground";
}

/* ─────────────────────────────────── download helpers ── */

async function downloadPDF(r: TailoredResume, companyName?: string) {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y = margin;

  // Blue accent: #1565C0
  const BLUE: [number, number, number] = [21, 101, 192];
  const GRAY: [number, number, number] = [100, 100, 100];
  const BLACK: [number, number, number] = [0, 0, 0];

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const setColor = (rgb: [number, number, number]) =>
    pdf.setTextColor(rgb[0], rgb[1], rgb[2]);

  // Section heading: centered UPPERCASE blue text flanked by horizontal lines
  const addSection = (title: string) => {
    ensureSpace(12);
    y += 3;
    const label = title.toUpperCase();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    setColor(BLUE);
    const textW = pdf.getTextWidth(label);
    const textX = (pageW - textW) / 2;
    pdf.text(label, textX, y);
    // flanking lines at same y
    pdf.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
    pdf.setLineWidth(0.3);
    const lineY = y - 1.2;
    pdf.line(margin, lineY, textX - 3, lineY);
    pdf.line(textX + textW + 3, lineY, pageW - margin, lineY);
    setColor(BLACK);
    y += 4;
  };

  // ── Header: Name ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  setColor(BLACK);
  const name = (r.header?.name ?? "").toUpperCase();
  const nameW = pdf.getTextWidth(name);
  pdf.text(name, (pageW - nameW) / 2, y);
  y += 7;

  // ── Job Title ──
  if (r.header?.title) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    setColor(GRAY);
    const titleW = pdf.getTextWidth(r.header.title);
    pdf.text(r.header.title, (pageW - titleW) / 2, y);
    y += 5.5;
  }

  // ── Contact (pipe-separated, centered) ──
  const c = r.header?.contact;
  const contactParts = [
    c?.email,
    c?.phone,
    c?.location,
    c?.linkedin,
    c?.github,
    c?.portfolio,
  ].filter(Boolean) as string[];
  if (contactParts.length > 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    setColor(GRAY);
    const contactStr = contactParts.join("  |  ");
    const cLines = pdf.splitTextToSize(contactStr, contentW);
    cLines.forEach((line: string) => {
      const lw = pdf.getTextWidth(line);
      pdf.text(line, (pageW - lw) / 2, y);
      y += 4.5;
    });
    setColor(BLACK);
    y += 1;
  }

  // ── Summary ──
  if (r.professional_summary) {
    addSection("Professional Summary");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    setColor(BLACK);
    const summaryLines = pdf.splitTextToSize(r.professional_summary, contentW);
    summaryLines.forEach((line: string) => {
      ensureSpace(5);
      pdf.text(line, margin, y);
      y += 4.5;
    });
    y += 1;
  }

  // ── Technical Skills ──
  const SKILL_LABELS: Record<string, string> = {
    programming_languages: "Programming Languages",
    frontend_and_frameworks: "Frontend & Frameworks",
    backend_and_frameworks: "Backend & Frameworks",
    databases: "Databases",
    cloud_and_devops: "Cloud & DevOps",
    tools_and_platforms: "Tools & Platforms",
    libraries_and_frameworks: "Libraries & Frameworks",
    soft_skills: "Soft Skills",
    other_skills: "Other Skills",
  };
  const ts = r.technical_skills ?? {};
  const skillEntries = Object.entries(SKILL_LABELS)
    .map(([key, label]) => ({
      label,
      items: (ts as Record<string, string[]>)[key] ?? [],
    }))
    .filter((e) => e.items.length > 0);

  if (skillEntries.length > 0) {
    addSection("Technical Skills");
    for (const { label, items } of skillEntries) {
      ensureSpace(6);
      const boldLabel = `${label}: `;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      setColor(BLACK);
      const labelW = pdf.getTextWidth(boldLabel);
      pdf.text(boldLabel, margin, y);
      pdf.setFont("helvetica", "normal");
      const itemStr = items.join(", ");
      const itemLines = pdf.splitTextToSize(itemStr, contentW - labelW);
      itemLines.forEach((line: string, i: number) => {
        ensureSpace(5);
        if (i === 0) {
          pdf.text(line, margin + labelW, y);
          y += 4.5;
        } else {
          pdf.text(line, margin + labelW, y);
          y += 4.5;
        }
      });
    }
    y += 1;
  }

  // ── Professional Experience ──
  if ((r.professional_experience ?? []).length > 0) {
    addSection("Professional Experience");
    for (const exp of r.professional_experience ?? []) {
      ensureSpace(14);
      const rowY = y;
      const dates = [exp.duration?.start, exp.duration?.end]
        .filter(Boolean)
        .join(" – ");

      // Line 1: Job Title (bold left) + Dates (gray right)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      setColor(BLACK);
      pdf.text(exp.job_title ?? "", margin, rowY);
      if (dates) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        setColor(GRAY);
        const dw = pdf.getTextWidth(dates);
        pdf.text(dates, pageW - margin - dw, rowY);
      }
      y = rowY + 5;

      // Line 2: Company (blue bold left) + Location (right)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      setColor(BLUE);
      pdf.text(exp.company ?? "", margin, y);
      if (exp.location) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        setColor(GRAY);
        const lw = pdf.getTextWidth(exp.location);
        pdf.text(exp.location, pageW - margin - lw, y);
      }
      y += 5;
      setColor(BLACK);

      // Responsibilities (bullets)
      for (const bullet of exp.responsibilities ?? []) {
        const bulletLines = pdf.splitTextToSize(bullet, contentW - 5);
        bulletLines.forEach((line: string, i: number) => {
          ensureSpace(5);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          setColor(BLACK);
          if (i === 0) pdf.text("•", margin, y);
          pdf.text(line, margin + 4, y);
          y += 4.5;
        });
      }

      // Achievements (bullets, within experience)
      for (const ach of exp.achievements ?? []) {
        const achLines = pdf.splitTextToSize(ach, contentW - 5);
        achLines.forEach((line: string, i: number) => {
          ensureSpace(5);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          setColor(BLACK);
          if (i === 0) pdf.text("•", margin, y);
          pdf.text(line, margin + 4, y);
          y += 4.5;
        });
      }

      // Technologies Used (italic gray, bottom of entry)
      if ((exp.technologies_used ?? []).filter(Boolean).length > 0) {
        ensureSpace(5);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        setColor(GRAY);
        const techStr = `Technologies Used: ${exp.technologies_used!.filter(Boolean).join(", ")}`;
        const techLines = pdf.splitTextToSize(techStr, contentW);
        techLines.forEach((line: string) => {
          ensureSpace(5);
          pdf.text(line, margin, y);
          y += 4;
        });
        setColor(BLACK);
      }
      y += 2;
    }
  }

  // ── Projects ──
  if ((r.projects ?? []).length > 0) {
    addSection("Projects");
    for (const p of r.projects ?? []) {
      ensureSpace(12);
      const rowY = y;
      const pdates = [p.duration?.start, p.duration?.end]
        .filter(Boolean)
        .join(" – ");

      // Line 1: Project Name (bold left) + GitHub · Live Demo links + Dates (right)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      setColor(BLACK);
      pdf.text(p.title ?? "", margin, rowY);
      const titleW = pdf.getTextWidth(p.title ?? "");
      // Append URL links inline after the title
      let urlX = margin + titleW + 3;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      if (p.github_url) {
        setColor(BLUE);
        const sep = "  ·  GitHub";
        pdf.text(sep, urlX, rowY);
        urlX += pdf.getTextWidth(sep);
      }
      if (p.live_demo_url) {
        setColor(BLUE);
        const sep = "  ·  Live Demo";
        pdf.text(sep, urlX, rowY);
      }
      if (pdates) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        setColor(GRAY);
        const dw = pdf.getTextWidth(pdates);
        pdf.text(pdates, pageW - margin - dw, rowY);
      }
      y = rowY + 5;
      setColor(BLACK);

      // Role (italic gray)
      if (p.role) {
        ensureSpace(5);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        setColor(GRAY);
        pdf.text(p.role, margin, y);
        y += 4.5;
        setColor(BLACK);
      }

      // Description
      if (p.description) {
        const descLines = pdf.splitTextToSize(p.description, contentW);
        descLines.forEach((line: string) => {
          ensureSpace(5);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          setColor(BLACK);
          pdf.text(line, margin, y);
          y += 4.5;
        });
      }

      // Tech (italic gray)
      if ((p.technologies_used ?? []).filter(Boolean).length > 0) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        setColor(GRAY);
        const techStr = p.technologies_used!.filter(Boolean).join(", ");
        const techLines = pdf.splitTextToSize(techStr, contentW);
        techLines.forEach((line: string) => {
          ensureSpace(5);
          pdf.text(line, margin, y);
          y += 4;
        });
        setColor(BLACK);
      }

      // Highlights (bullets)
      for (const h of p.highlights ?? []) {
        const hLines = pdf.splitTextToSize(h, contentW - 5);
        hLines.forEach((line: string, i: number) => {
          ensureSpace(5);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          setColor(BLACK);
          if (i === 0) pdf.text("•", margin, y);
          pdf.text(line, margin + 4, y);
          y += 4.5;
        });
      }
      y += 2;
    }
  }

  // ── Education ──
  if ((r.education ?? []).length > 0) {
    addSection("Education");
    for (const e of r.education ?? []) {
      ensureSpace(7);
      const parts = [
        e.degree + (e.field_of_study ? `, ${e.field_of_study}` : ""),
        e.graduation_date,
        e.institution,
        e.gpa ? `GPA: ${e.gpa}` : "",
        e.percentage || "",
      ].filter(Boolean);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      setColor(BLACK);
      const line = parts.join("  |  ");
      const eLines = pdf.splitTextToSize(line, contentW);
      eLines.forEach((l: string) => {
        ensureSpace(5);
        pdf.text(l, margin, y);
        y += 4.5;
      });
      y += 1;
    }
  }

  // ── Certifications ──
  if ((r.certifications ?? []).length > 0) {
    addSection("Certifications");
    for (const cert of r.certifications ?? []) {
      const certParts = [cert.name, cert.issuer, cert.issue_date]
        .filter(Boolean)
        .join("  |  ");
      const certLines = pdf.splitTextToSize(certParts, contentW - 5);
      certLines.forEach((line: string, i: number) => {
        ensureSpace(5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        setColor(BLACK);
        if (i === 0) pdf.text("•", margin, y);
        pdf.text(line, margin + 4, y);
        y += 4.5;
      });
    }
  }

  // ── Achievements ──
  if ((r.achievements ?? []).filter(Boolean).length > 0) {
    addSection("Achievements");
    for (const a of r.achievements ?? []) {
      const aLines = pdf.splitTextToSize(a, contentW - 5);
      aLines.forEach((line: string, i: number) => {
        ensureSpace(5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        setColor(BLACK);
        if (i === 0) pdf.text("•", margin, y);
        pdf.text(line, margin + 4, y);
        y += 4.5;
      });
    }
  }

  // ── Publications ──
  if ((r.publications ?? []).filter((p) => p.title).length > 0) {
    addSection("Publications");
    for (const pub of r.publications ?? []) {
      const pubParts = [pub.title, pub.publisher, pub.publication_date]
        .filter(Boolean)
        .join("  |  ");
      const pubLines = pdf.splitTextToSize(pubParts, contentW - 5);
      pubLines.forEach((line: string, i: number) => {
        ensureSpace(5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        setColor(BLACK);
        if (i === 0) pdf.text("•", margin, y);
        pdf.text(line, margin + 4, y);
        y += 4.5;
      });
    }
  }

  // ── Languages ──
  if ((r.languages ?? []).filter((l) => l.language).length > 0) {
    addSection("Languages");
    ensureSpace(6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    setColor(BLACK);
    const langStr = (r.languages ?? [])
      .map((l) =>
        l.proficiency ? `${l.language} (${l.proficiency})` : l.language,
      )
      .join("  |  ");
    const langLines = pdf.splitTextToSize(langStr, contentW);
    langLines.forEach((l: string) => {
      ensureSpace(5);
      pdf.text(l, margin, y);
      y += 4.5;
    });
  }

  // ── Interests ──
  if ((r.interests ?? []).filter(Boolean).length > 0) {
    addSection("Interests");
    ensureSpace(6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    setColor(BLACK);
    const intStr = (r.interests ?? []).join("  |  ");
    const intLines = pdf.splitTextToSize(intStr, contentW);
    intLines.forEach((l: string) => {
      ensureSpace(5);
      pdf.text(l, margin, y);
      y += 4.5;
    });
  }

  const safeName = (r.header?.name ?? "Resume").replace(/\s+/g, "_");
  const safeCompany = companyName
    ? "_" + companyName.replace(/[\s/\\:*?"<>|]+/g, "_")
    : "";
  pdf.save(`${safeName}${safeCompany}.pdf`);
}

async function downloadDOCX(r: TailoredResume, companyName?: string) {
  const {
    Document,
    Paragraph,
    TextRun,
    AlignmentType,
    Packer,
    TabStopType,
    LeaderType,
  } = await import("docx");

  const BLUE = "1565C0";
  const GRAY = "646464";
  const children: InstanceType<typeof Paragraph>[] = [];

  const sectionHeading = (text: string) =>
    new Paragraph({
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 20,
          color: BLUE,
        }),
      ],
      alignment: AlignmentType.CENTER,
      border: {
        top: { color: BLUE, size: 6, space: 4, style: "single" },
        bottom: { color: BLUE, size: 6, space: 4, style: "single" },
      },
      spacing: { before: 240, after: 80 },
    });

  // ── Name ──
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: (r.header?.name ?? "").toUpperCase(),
          bold: true,
          size: 36,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  );

  // ── Title ──
  if (r.header?.title) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: r.header.title, size: 22, color: GRAY }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
  }

  // ── Contact ──
  const c = r.header?.contact;
  const contactParts = [
    c?.email,
    c?.phone,
    c?.location,
    c?.linkedin,
    c?.github,
    c?.portfolio,
  ].filter(Boolean) as string[];
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: 18,
            color: GRAY,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
      }),
    );
  }

  // ── Summary ──
  if (r.professional_summary) {
    children.push(sectionHeading("Professional Summary"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: r.professional_summary, size: 20 })],
        spacing: { after: 100 },
      }),
    );
  }

  // ── Technical Skills ──
  const SKILL_LABELS: Record<string, string> = {
    programming_languages: "Programming Languages",
    frontend_and_frameworks: "Frontend & Frameworks",
    backend_and_frameworks: "Backend & Frameworks",
    databases: "Databases",
    cloud_and_devops: "Cloud & DevOps",
    tools_and_platforms: "Tools & Platforms",
    libraries_and_frameworks: "Libraries & Frameworks",
    soft_skills: "Soft Skills",
    other_skills: "Other Skills",
  };
  const ts = r.technical_skills ?? {};
  const skillEntries = Object.entries(SKILL_LABELS)
    .map(([key, label]) => ({
      label,
      items: (ts as Record<string, string[]>)[key] ?? [],
    }))
    .filter((e) => e.items.length > 0);
  if (skillEntries.length > 0) {
    children.push(sectionHeading("Technical Skills"));
    for (const { label, items } of skillEntries) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 20 }),
            new TextRun({ text: items.join(", "), size: 20 }),
          ],
          spacing: { after: 60 },
        }),
      );
    }
  }

  // ── Experience ──
  if ((r.professional_experience ?? []).length > 0) {
    children.push(sectionHeading("Professional Experience"));
    for (const exp of r.professional_experience ?? []) {
      const dates = [exp.duration?.start, exp.duration?.end]
        .filter(Boolean)
        .join(" \u2013 ");
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.job_title ?? "", bold: true, size: 22 }),
            new TextRun({ text: `\t${dates}`, size: 18, color: GRAY }),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 9360,
              leader: LeaderType.NONE,
            },
          ],
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.company ?? "",
              bold: true,
              size: 20,
              color: BLUE,
            }),
            exp.location
              ? new TextRun({
                  text: `\t${exp.location}`,
                  size: 18,
                  color: GRAY,
                })
              : new TextRun(""),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 9360,
              leader: LeaderType.NONE,
            },
          ],
          spacing: { after: 60 },
        }),
      );
      for (const resp of exp.responsibilities ?? []) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: resp, size: 20 })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          }),
        );
      }
      if ((exp.achievements ?? []).filter(Boolean).length > 0) {
        for (const ach of exp.achievements ?? []) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: ach, size: 20 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            }),
          );
        }
      }
      if ((exp.technologies_used ?? []).filter(Boolean).length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Technologies Used: ${exp.technologies_used!.filter(Boolean).join(", ")}`,
                size: 18,
                italics: true,
                color: GRAY,
              }),
            ],
            spacing: { after: 80 },
          }),
        );
      }
    }
  }

  // ── Projects ──
  if ((r.projects ?? []).length > 0) {
    children.push(sectionHeading("Projects"));
    for (const p of r.projects ?? []) {
      const pdates = [p.duration?.start, p.duration?.end]
        .filter(Boolean)
        .join(" \u2013 ");
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: p.title ?? "", bold: true, size: 22 }),
            ...(p.github_url
              ? [new TextRun({ text: "  ·  GitHub", size: 18, color: BLUE })]
              : []),
            ...(p.live_demo_url
              ? [new TextRun({ text: "  ·  Live Demo", size: 18, color: BLUE })]
              : []),
            pdates
              ? new TextRun({ text: `\t${pdates}`, size: 18, color: GRAY })
              : new TextRun(""),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 9360,
              leader: LeaderType.NONE,
            },
          ],
        }),
      );
      if (p.role) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: p.role,
                size: 18,
                italics: true,
                color: GRAY,
              }),
            ],
            spacing: { after: 40 },
          }),
        );
      }
      if (p.description) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: p.description, size: 20 })],
            spacing: { after: 60 },
          }),
        );
      }
      if ((p.technologies_used ?? []).filter(Boolean).length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: p.technologies_used!.filter(Boolean).join(", "),
                size: 18,
                italics: true,
                color: GRAY,
              }),
            ],
            spacing: { after: 60 },
          }),
        );
      }
      for (const h of p.highlights ?? []) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: h, size: 20 })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          }),
        );
      }
    }
  }

  // ── Education ──
  if ((r.education ?? []).length > 0) {
    children.push(sectionHeading("Education"));
    for (const e of r.education ?? []) {
      const parts = [
        e.degree + (e.field_of_study ? `, ${e.field_of_study}` : ""),
        e.graduation_date,
        e.institution,
        e.gpa ? `GPA: ${e.gpa}` : "",
        e.percentage || "",
      ].filter(Boolean);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: parts.join("  |  "), size: 20 })],
          spacing: { after: 80 },
        }),
      );
    }
  }

  // ── Certifications ──
  if ((r.certifications ?? []).length > 0) {
    children.push(sectionHeading("Certifications"));
    for (const cert of r.certifications ?? []) {
      const certParts = [cert.name, cert.issuer, cert.issue_date]
        .filter(Boolean)
        .join("  |  ");
      children.push(
        new Paragraph({
          children: [new TextRun({ text: certParts, size: 20 })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }),
      );
    }
  }

  // ── Achievements ──
  if ((r.achievements ?? []).filter(Boolean).length > 0) {
    children.push(sectionHeading("Achievements"));
    for (const a of r.achievements ?? []) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: a, size: 20 })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }),
      );
    }
  }

  // ── Publications ──
  if ((r.publications ?? []).filter((p) => p.title).length > 0) {
    children.push(sectionHeading("Publications"));
    for (const pub of r.publications ?? []) {
      const pubParts = [pub.title, pub.publisher, pub.publication_date]
        .filter(Boolean)
        .join("  |  ");
      children.push(
        new Paragraph({
          children: [new TextRun({ text: pubParts, size: 20 })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }),
      );
    }
  }

  // ── Languages ──
  if ((r.languages ?? []).filter((l) => l.language).length > 0) {
    children.push(sectionHeading("Languages"));
    const langStr = (r.languages ?? [])
      .map((l) =>
        l.proficiency ? `${l.language} (${l.proficiency})` : l.language,
      )
      .join("  |  ");
    children.push(
      new Paragraph({
        children: [new TextRun({ text: langStr, size: 20 })],
        spacing: { after: 80 },
      }),
    );
  }

  // ── Interests ──
  if ((r.interests ?? []).filter(Boolean).length > 0) {
    children.push(sectionHeading("Interests"));
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: (r.interests ?? []).join("  |  "), size: 20 }),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (r.header?.name ?? "resume").replace(/\s+/g, "_");
  const safeCompany = companyName
    ? "_" + companyName.replace(/[\s/\\:*?"<>|]+/g, "_")
    : "";
  a.download = `${safeName}${safeCompany}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────── main component ── */

export function TailoringDashboard({ result }: { result: TailoringResult }) {
  const [tab, setTab] = useState<Tab>("preview");
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const resume = result.tailoredResume ?? ({} as TailoredResume);
  const issues = result.issues ?? [];
  const changes = result.changesApplied ?? [];

  const highCount = issues.filter((i) => i.severity === "high").length;

  const tabs: { id: Tab; label: string }[] = [
    { id: "preview", label: "Tailored Resume" },
    { id: "issues", label: `Issues Found (${issues.length})` },
    { id: "changes", label: `Changes Made (${changes.length})` },
  ];

  return (
    <div className="border border-foreground/10">
      {/* ── Breadcrumb bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_auto] items-center border-b border-foreground/10 bg-foreground px-6 py-3">
        <span className="label-sm text-white/60">
          {result.companyName
            ? `TAILORING / ${result.companyName.toUpperCase()}`
            : "RESUME TAILORING COMPLETE"}
        </span>
        {result.atsScore != null && (
          <span className="label-sm text-white/60">
            ATS MATCH · {result.atsScore}%
          </span>
        )}
      </div>

      {/* ── Info row ────────────────────────────────────────────────── */}
      <div className="grid gap-px md:grid-cols-[1fr_220px]">
        {/* Name cell */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-surface-lowest p-6 sm:p-8"
        >
          <p className="label-sm text-muted-foreground">CANDIDATE</p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {resume.header?.name ?? "Your Resume"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {highCount > 0
              ? `${highCount} critical issue${highCount > 1 ? "s" : ""} fixed · ready to download`
              : `${changes.length} improvements applied · ready to download`}
          </p>
        </motion.div>

        {/* Score + download cell */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col justify-between gap-6 bg-foreground p-6 text-primary-foreground"
        >
          {result.atsScore != null ? (
            <div>
              <p className="label-sm text-white/50">ATS MATCH</p>
              <p className="mt-1 font-display text-5xl font-black leading-none text-white">
                {result.atsScore}
                <span className="text-2xl text-white/40">%</span>
              </p>
            </div>
          ) : (
            <div>
              <p className="label-sm text-white/50">OPTIMIZED</p>
              <p className="mt-1 font-display text-2xl font-black text-white">
                Ready
              </p>
            </div>
          )}
          <div>
            {result.format === "docx" ? (
              <Button
                size="sm"
                className="w-full gap-2 border-0 bg-white/10 text-white hover:bg-white/20"
                disabled={isDownloadingDocx}
                onClick={async () => {
                  setIsDownloadingDocx(true);
                  try {
                    await downloadDOCX(resume, result.companyName);
                  } finally {
                    setIsDownloadingDocx(false);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                {isDownloadingDocx ? "Building…" : "Download DOCX"}
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full gap-2 border-0 bg-white/10 text-white hover:bg-white/20"
                disabled={isDownloadingPdf}
                onClick={async () => {
                  setIsDownloadingPdf(true);
                  try {
                    await downloadPDF(resume, result.companyName);
                  } finally {
                    setIsDownloadingPdf(false);
                  }
                }}
              >
                <FileText className="h-4 w-4" />
                {isDownloadingPdf ? "Building…" : "Download PDF"}
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Tabs bar ────────────────────────────────────────────────── */}
      <div className="flex border-y border-foreground/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 border-r border-foreground/10 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ease-out last:border-r-0",
              tab === t.id
                ? "bg-foreground text-primary-foreground"
                : "bg-surface-low text-muted-foreground hover:bg-surface-highest hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* Preview */}
        {tab === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="lg:max-h-[70vh] lg:overflow-y-auto"
          >
            <ResumePreview resume={resume} />
          </motion.div>
        )}

        {/* Issues */}
        {tab === "issues" && (
          <motion.div
            key="issues"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {issues.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No issues recorded.
              </p>
            ) : (
              <div className="grid gap-px">
                {issues.map((issue, i) => (
                  <div key={i} className="bg-surface-lowest p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          issue.severity === "high"
                            ? "text-red-500"
                            : issue.severity === "medium"
                              ? "text-amber-500"
                              : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {issue.section}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              severityColor(issue.severity),
                            )}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {issue.issue}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setExpandedIssues((prev) => {
                            const next = new Set(prev);
                            next.has(i) ? next.delete(i) : next.add(i);
                            return next;
                          });
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedIssues.has(i) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {expandedIssues.has(i) && (
                      <div className="ml-7 mt-3 bg-surface-low p-3">
                        <p className="text-xs text-muted-foreground">
                          This issue has been fixed in the tailored resume in
                          the <strong>Tailored Resume</strong> tab.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Changes */}
        {tab === "changes" && (
          <motion.div
            key="changes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {changes.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No changes recorded.
              </p>
            ) : (
              <div className="grid gap-px">
                {changes.map((change, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="bg-surface-lowest p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-foreground text-primary-foreground">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {change.section}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {change.what}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {change.why}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────── ResumePreview sub-component ── */

function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function ResumePreview({ resume }: { resume: TailoredResume }) {
  const c = resume.header?.contact;

  const SKILL_LABELS: Record<string, string> = {
    programming_languages: "Programming Languages",
    frontend_and_frameworks: "Frontend & Frameworks",
    backend_and_frameworks: "Backend & Frameworks",
    databases: "Databases",
    cloud_and_devops: "Cloud & DevOps",
    tools_and_platforms: "Tools & Platforms",
    libraries_and_frameworks: "Libraries & Frameworks",
    soft_skills: "Soft Skills",
    other_skills: "Other Skills",
  };
  const ts = resume.technical_skills ?? {};
  const skillEntries = Object.entries(SKILL_LABELS)
    .map(([key, label]) => ({
      label,
      items: (ts as Record<string, string[]>)[key] ?? [],
    }))
    .filter((e) => e.items.length > 0);

  return (
    <div className="bg-surface-lowest p-6 sm:p-10">
      {/* Header */}
      <div className="pb-5 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
          {resume.header?.name}
        </h1>
        {resume.header?.title && (
          <p className="mt-1 text-sm text-muted-foreground">
            {resume.header.title}
          </p>
        )}
        {(c?.phone ||
          c?.email ||
          c?.location ||
          c?.linkedin ||
          c?.github ||
          c?.portfolio) && (
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {c?.phone && <span>{c.phone}</span>}
            {c?.email && (
              <a
                href={`mailto:${c.email}`}
                className="text-blue-600 underline hover:text-blue-800"
                target="_blank"
                rel="noreferrer"
              >
                {c.email}
              </a>
            )}
            {c?.location && <span>{c.location}</span>}
            {c?.linkedin && (
              <a
                href={ensureHttps(c.linkedin)}
                className="text-blue-600 underline hover:text-blue-800"
                target="_blank"
                rel="noreferrer"
              >
                {c.linkedin}
              </a>
            )}
            {c?.github && (
              <a
                href={ensureHttps(c.github)}
                className="text-blue-600 underline hover:text-blue-800"
                target="_blank"
                rel="noreferrer"
              >
                {c.github}
              </a>
            )}
            {c?.portfolio && (
              <a
                href={ensureHttps(c.portfolio)}
                className="text-blue-600 underline hover:text-blue-800"
                target="_blank"
                rel="noreferrer"
              >
                {c.portfolio}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {resume.professional_summary && (
        <ResumeSection title="Professional Summary">
          <p className="text-sm leading-7 text-foreground/80">
            {resume.professional_summary}
          </p>
        </ResumeSection>
      )}

      {/* Technical Skills */}
      {skillEntries.length > 0 && (
        <ResumeSection title="Technical Skills">
          <div className="space-y-1.5">
            {skillEntries.map(({ label, items }, i) => (
              <div key={i} className="flex flex-wrap gap-x-1 text-sm">
                <span className="font-semibold text-foreground">{label}:</span>
                <span className="text-foreground/80">{items.join(", ")}</span>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {/* Experience */}
      {(resume.professional_experience ?? []).length > 0 && (
        <ResumeSection title="Professional Experience">
          <div className="space-y-5">
            {(resume.professional_experience ?? []).map((exp, i) => {
              const dates = [exp.duration?.start, exp.duration?.end]
                .filter(Boolean)
                .join(" – ");
              return (
                <div key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-semibold text-foreground">
                      {exp.job_title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dates}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-sm font-medium text-blue-700">
                      {exp.company}
                    </span>
                    {exp.location && (
                      <span className="text-xs text-muted-foreground">
                        {exp.location}
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1.5 pl-4">
                    {(exp.responsibilities ?? []).map((r, j) => (
                      <li
                        key={j}
                        className="list-disc text-sm leading-6 text-foreground/80"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                  {(exp.technologies_used ?? []).filter(Boolean).length > 0 && (
                    <p className="mt-1.5 text-xs italic text-muted-foreground">
                      Technologies Used:{" "}
                      {exp.technologies_used!.filter(Boolean).join(", ")}
                    </p>
                  )}
                  {(exp.achievements ?? []).filter(Boolean).length > 0 && (
                    <ul className="mt-1.5 space-y-1 pl-4">
                      {(exp.achievements ?? []).map((a, j) => (
                        <li
                          key={j}
                          className="list-disc text-sm leading-6 text-foreground/80"
                        >
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </ResumeSection>
      )}

      {/* Projects */}
      {(resume.projects ?? []).length > 0 && (
        <ResumeSection title="Projects">
          <div className="space-y-4">
            {(resume.projects ?? []).map((p, i) => {
              const pdates = [p.duration?.start, p.duration?.end]
                .filter(Boolean)
                .join(" – ");
              return (
                <div key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-foreground">
                        {p.title}
                      </span>
                      {p.github_url && (
                        <a
                          href={ensureHttps(p.github_url)}
                          className="text-xs text-blue-600 underline hover:text-blue-800"
                          target="_blank"
                          rel="noreferrer"
                        >
                          GitHub
                        </a>
                      )}
                      {p.live_demo_url && (
                        <a
                          href={ensureHttps(p.live_demo_url)}
                          className="text-xs text-blue-600 underline hover:text-blue-800"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Live Demo
                        </a>
                      )}
                    </div>
                    {pdates && (
                      <span className="text-xs text-muted-foreground">
                        {pdates}
                      </span>
                    )}
                  </div>
                  {p.role && (
                    <p className="text-xs italic text-muted-foreground">
                      {p.role}
                    </p>
                  )}
                  {p.description && (
                    <p className="mt-1 text-sm leading-6 text-foreground/80">
                      {p.description}
                    </p>
                  )}
                  {(p.technologies_used ?? []).filter(Boolean).length > 0 && (
                    <p className="text-xs italic text-muted-foreground">
                      {p.technologies_used!.filter(Boolean).join(", ")}
                    </p>
                  )}
                  <ul className="mt-1.5 space-y-1.5 pl-4">
                    {(p.highlights ?? []).map((h, j) => (
                      <li
                        key={j}
                        className="list-disc text-sm leading-6 text-foreground/80"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </ResumeSection>
      )}

      {/* Education */}
      {(resume.education ?? []).length > 0 && (
        <ResumeSection title="Education">
          <div className="space-y-2">
            {(resume.education ?? []).map((e, i) => {
              const parts = [
                e.degree + (e.field_of_study ? `, ${e.field_of_study}` : ""),
                e.graduation_date,
                e.institution,
                e.gpa ? `GPA: ${e.gpa}` : "",
                e.percentage || "",
              ].filter(Boolean);
              return (
                <p key={i} className="text-sm text-foreground/80">
                  {parts.join("  |  ")}
                </p>
              );
            })}
          </div>
        </ResumeSection>
      )}

      {/* Certifications */}
      {(resume.certifications ?? []).length > 0 && (
        <ResumeSection title="Certifications">
          <ul className="space-y-1 pl-4">
            {(resume.certifications ?? []).map((cert, i) => (
              <li key={i} className="list-disc text-sm text-foreground/80">
                {[cert.name, cert.issuer, cert.issue_date]
                  .filter(Boolean)
                  .join("  |  ")}
              </li>
            ))}
          </ul>
        </ResumeSection>
      )}

      {/* Achievements */}
      {(resume.achievements ?? []).filter(Boolean).length > 0 && (
        <ResumeSection title="Achievements">
          <ul className="space-y-1.5 pl-4">
            {(resume.achievements ?? []).map((a, i) => (
              <li
                key={i}
                className="list-disc text-sm leading-6 text-foreground/80"
              >
                {a}
              </li>
            ))}
          </ul>
        </ResumeSection>
      )}

      {/* Publications */}
      {(resume.publications ?? []).filter((p) => p.title).length > 0 && (
        <ResumeSection title="Publications">
          <ul className="space-y-1.5 pl-4">
            {(resume.publications ?? []).map((pub, i) => (
              <li
                key={i}
                className="list-disc text-sm leading-6 text-foreground/80"
              >
                {[pub.title, pub.publisher, pub.publication_date]
                  .filter(Boolean)
                  .join("  |  ")}
                {pub.url && (
                  <a
                    href={pub.url}
                    className="ml-2 text-xs text-blue-600 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    link
                  </a>
                )}
              </li>
            ))}
          </ul>
        </ResumeSection>
      )}

      {/* Languages */}
      {(resume.languages ?? []).filter((l) => l.language).length > 0 && (
        <ResumeSection title="Languages">
          <p className="text-sm text-foreground/80">
            {(resume.languages ?? [])
              .map((l) =>
                l.proficiency ? `${l.language} (${l.proficiency})` : l.language,
              )
              .join("  |  ")}
          </p>
        </ResumeSection>
      )}

      {/* Interests */}
      {(resume.interests ?? []).filter(Boolean).length > 0 && (
        <ResumeSection title="Interests">
          <p className="text-sm text-foreground/80">
            {(resume.interests ?? []).join("  |  ")}
          </p>
        </ResumeSection>
      )}

      {/* Download CTA at bottom of preview */}
      <div className="mt-8 flex flex-col items-center gap-3 border-t border-surface-highest pt-6 sm:flex-row sm:justify-center">
        <CheckCircle2 className="h-4 w-4 text-foreground" />
        <span className="text-sm text-muted-foreground">
          Use the <strong>PDF</strong> or <strong>DOCX</strong> buttons above to
          download this resume.
        </span>
      </div>
    </div>
  );
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1 border-t border-[#1565C0]/40" />
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#1565C0]">
          {title}
        </h2>
        <div className="flex-1 border-t border-[#1565C0]/40" />
      </div>
      {children}
    </div>
  );
}
