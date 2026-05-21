import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("builder and creator pass project live demo URLs from profile data", () => {
  const builderForm = read("components/site/resume-builder-form.tsx");
  const creatorForm = read("components/site/resume-creator-form.tsx");

  assert.match(builderForm, /website:\s*p\.website\s*\?\?\s*""/);
  assert.match(creatorForm, /website:\s*p\.website\s*\?\?\s*""/);
});

test("resume project links render actual ATS-readable URLs, not only labels", () => {
  const dashboard = read("components/site/tailoring-dashboard.tsx");

  assert.match(dashboard, /GitHub:\s*\{p\.github_url\}/);
  assert.match(dashboard, /Live Demo:\s*\{p\.live_demo_url\}/);
  assert.match(dashboard, /`GitHub:\s*\$\{p\.github_url\}`/);
  assert.match(dashboard, /`Live Demo:\s*\$\{p\.live_demo_url\}`/);
});

test("generation prompts require exactly three projects", () => {
  const prompts = read("lib/openrouter/prompts.ts");
  const resumePrompts = Object.fromEntries(
    [
    "TAILORING_SYSTEM_PROMPT",
    "BUILD_SYSTEM_PROMPT",
    "CREATOR_SYSTEM_PROMPT",
  ]
      .map((name) => {
      const match = prompts.match(
        new RegExp(`export const ${name} = \`([\\s\\S]*?)\`;`),
      );
      assert.ok(match, `${name} should exist`);
      return [name, match[1]];
      }),
  );

  assert.match(resumePrompts.TAILORING_SYSTEM_PROMPT, /PROJECTS:\s*exactly 3/i);
  assert.match(resumePrompts.BUILD_SYSTEM_PROMPT, /Exactly 3 projects maximum/i);
  assert.match(resumePrompts.CREATOR_SYSTEM_PROMPT, /Exactly 3 projects/i);
});
