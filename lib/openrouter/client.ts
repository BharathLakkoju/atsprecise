export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-preview-05-20";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL ?? "google/gemini-2.0-flash-001";

/** Retry config */
const MAX_RETRIES = 1;     // 2 total attempts max — fail fast
const RETRY_DELAY_MS = 1500;

/**
 * Simple sleep.
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls OpenRouter using streaming to avoid idle-timeout kills.
 * Accumulates all chunks and returns the full content string.
 *
 * The timeout applies to stalls (no data for `stallTimeoutMs`), not total elapsed time.
 * This way, a response that takes 20s but streams continuously will succeed,
 * while a stalled connection is killed quickly.
 *
 * @throws Error if the API key is missing
 * Returns null if all attempts fail.
 */
export async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  model = DEFAULT_MODEL,
  timeoutMs = 30_000,
  maxTokens = 3000
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured. AI analysis cannot proceed.");
  }

  let lastError: Error | null = null;
  const stallTimeoutMs = Math.min(timeoutMs, 15_000); // kill if no data for 15s

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // On retry: wait, then try fallback model
    const currentModel = attempt === 0 ? model : FALLBACK_MODEL;

    if (attempt > 0) {
      const delay = RETRY_DELAY_MS * attempt;
      await sleep(delay);
    }

    const controller = new AbortController();
    // Hard ceiling: abort after timeoutMs regardless of streaming progress
    const hardTimeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.atsprecise.com",
          "X-Title": "atsprecise"
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        lastError = new Error(`HTTP ${response.status}: ${errText}`);

        // Auth errors won't be fixed by switching models -- fail fast.
        if (response.status === 401 || response.status === 403) {
          break;
        }

        continue;
      }

      // ── Stream reading ───────────────────────────────────────
      const body = response.body;
      if (!body) {
        lastError = new Error("No response body");
        continue;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      // Stall timer: abort if no chunk arrives within stallTimeoutMs
      let stallTimer: ReturnType<typeof setTimeout> | null = null;
      const resetStallTimer = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => controller.abort(), stallTimeoutMs);
      };
      resetStallTimer();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          resetStallTimer();
          buffer += decoder.decode(value, { stream: true });

          // Process SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) accumulated += delta;
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }
      } finally {
        if (stallTimer) clearTimeout(stallTimer);
        reader.releaseLock();
      }

      if (!accumulated) {
        lastError = new Error("Empty response from AI model");
        continue;
      }

      return accumulated;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error(`Request timed out for model ${currentModel}`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      continue;
    } finally {
      clearTimeout(hardTimeoutId);
    }
  }

  return null;
}

/**
 * Parses a JSON string from the model's output, handling markdown code fences
 * and common AI output quirks.
 */
export function parseJsonFromModel<T>(raw: string): T | null {
  try {
    // Strip markdown fences, leading/trailing whitespace, and any preamble text before the JSON
    let cleaned = raw.trim();

    // Remove markdown code fences
    cleaned = cleaned.replace(/^```(?:json)?[\s\n]*/i, "").replace(/[\s\n]*```\s*$/i, "");

    // If the response starts with text before JSON, find the first { or [
    const jsonStart = cleaned.search(/[{\[]/);
    if (jsonStart > 0) {
      cleaned = cleaned.slice(jsonStart);
    }

    // Find the last matching } or ]
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const jsonEnd = Math.max(lastBrace, lastBracket);
    if (jsonEnd > 0 && jsonEnd < cleaned.length - 1) {
      cleaned = cleaned.slice(0, jsonEnd + 1);
    }

    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
