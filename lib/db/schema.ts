import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Tracks anonymous usage per IP address for the 2-free-uses gate.
 * RLS: public INSERT (increment) and SELECT by IP are allowed via Supabase policy.
 * No user data is stored here.
 */
export const ipUsage = pgTable("ip_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  useCount: integer("use_count").notNull().default(1),
  firstUsedAt: timestamp("first_used_at", { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull()
});

/**
 * Stores evaluation metadata per authenticated user.
 * `full_result` holds the complete AI evaluation payload written by /api/evaluate,
 * /api/tailor, and /api/build — this may include generated resume content and contact
 * details. Ensure RLS policies restrict SELECT/INSERT to the owning user only, and
 * review your data-retention policy regarding this PII before going to production.
 * user_id references auth.users(id) — enforced via Supabase RLS, not FK constraint.
 * RLS: users can only SELECT/INSERT their own rows.
 */
export const userEvaluations = pgTable("user_evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  jobTitle: text("job_title"),
  overallScore: integer("overall_score").notNull(),
  breakdown: jsonb("breakdown").notNull(),
  suggestions: jsonb("suggestions").notNull(),
  missingKeywords: text("missing_keywords").array().notNull().default([]),
  matchedSkills: text("matched_skills").array().notNull().default([]),
  resumeGaps: jsonb("resume_gaps").notNull().default([]),
  mandatorySkills: text("mandatory_skills").array().notNull().default([]),
  optionalSkills: text("optional_skills").array().notNull().default([]),
  highValueSkills: text("high_value_skills").array().notNull().default([]),
  projectRecommendations: jsonb("project_recommendations").notNull().default([]),
  careerGapSummary: text("career_gap_summary"),
  aiInsight: text("ai_insight"),
  fullResult: jsonb("full_result"),
  mode: text("mode").notNull().default("analysis"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

/**
 * Aggregated career gap summary per user. One row per user, upserted on every analysis.
 * Stores AI-generated cross-analysis insights: recurring skill gaps, top projects, career trajectory.
 * RLS: users can only SELECT/INSERT/UPDATE their own row.
 */
export const userCareerSummary = pgTable("user_career_summary", {
  userId: uuid("user_id").primaryKey(),
  topSkillGaps: text("top_skill_gaps").array().notNull().default([]),
  projectsToStart: jsonb("projects_to_start").notNull().default([]),
  targetRoles: text("target_roles").array().notNull().default([]),
  careerNarrative: text("career_narrative"),
  nextStep: text("next_step"),
  progressSummary: text("progress_summary"),
  totalAnalyses: integer("total_analyses").notNull().default(0),
  avgScore: integer("avg_score").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

/**
 * Stores a user's complete resume profile (contact, experience, skills, projects, etc.)
 * One row per user. Upserted on save from the Profile page.
 * user_id references auth.users(id) — enforced via Supabase RLS.
 */
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  name: text("name").notNull().default(""),
  email: text("email").default(""),
  phone: text("phone").default(""),
  location: text("location").default(""),
  linkedin: text("linkedin").default(""),
  github: text("github").default(""),
  portfolio: text("portfolio").default(""),
  summary: text("summary").default(""),
  experience: jsonb("experience").notNull().default([]),
  skills: jsonb("skills").notNull().default([]),
  projects: jsonb("projects").notNull().default([]),
  education: jsonb("education").notNull().default([]),
  certifications: text("certifications").array().notNull().default([]),
  awards: text("awards").array().notNull().default([]),
  isComplete: boolean("is_complete").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
