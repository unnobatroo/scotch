/**
 * Server-only LLM helper. Shared by the grading and PDF-parsing API routes.
 *
 * Provider API keys are read from environment variables and never leave the
 * server. Supported providers (set the matching env var to enable):
 *   - "groq"       → GROQ_API_KEY        (default; free tier, OpenAI-compatible)
 *   - "openrouter" → OPENROUTER_API_KEY  (free open models, OpenAI-compatible)
 *   - "anthropic"  → ANTHROPIC_API_KEY   (Claude; ANTHROPIC_MODEL to override)
 *
 * IMPORTANT: do not import this from client components — it would expose nothing
 * (keys are read at call time on the server) but the bundler should keep it server-side.
 */

const DEFAULTS = {
  groq: { model: () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile" },
  openrouter: { model: () => process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free" },
  anthropic: { model: () => process.env.ANTHROPIC_MODEL || "claude-haiku-4-5" },
};

/** Normalise an arbitrary provider string to a supported one (defaults to groq). */
export function normalizeProvider(p) {
  return ["groq", "openrouter", "anthropic"].includes(p) ? p : "groq";
}

/**
 * Extract the first JSON value (object or array) from a model response that may
 * be wrapped in markdown code fences or surrounded by prose.
 * @param {string} text
 * @returns {any}
 */
export function parseModelJson(text) {
  const cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  // Find the outermost JSON container, whether it's an array or an object.
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  let start;
  if (firstArr === -1) start = firstObj;
  else if (firstObj === -1) start = firstArr;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) throw new Error("Model did not return JSON.");
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(close);
  if (end === -1) throw new Error("Model returned malformed JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Call Anthropic's Messages API. */
async function callAnthropic({ system, prompt, maxTokens }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULTS.anthropic.model(),
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

/** Call any OpenAI-compatible chat endpoint (Groq, OpenRouter). */
async function callOpenAICompatible({ url, key, model, system, prompt, maxTokens }) {
  if (!key) throw new Error("API key for the selected provider is not set on the server.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Provider error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Run a completion against the chosen provider.
 * @param {object} opts
 * @param {string} opts.provider
 * @param {string} opts.system   System instruction.
 * @param {string} opts.prompt   User prompt.
 * @param {number} [opts.maxTokens=2000]
 * @returns {Promise<string>} Raw text response.
 */
export async function complete({ provider, system, prompt, maxTokens = 2000 }) {
  const p = normalizeProvider(provider);
  if (p === "anthropic") return callAnthropic({ system, prompt, maxTokens });
  if (p === "openrouter")
    return callOpenAICompatible({
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: DEFAULTS.openrouter.model(),
      system,
      prompt,
      maxTokens,
    });
  return callOpenAICompatible({
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY,
    model: DEFAULTS.groq.model(),
    system,
    prompt,
    maxTokens,
  });
}
