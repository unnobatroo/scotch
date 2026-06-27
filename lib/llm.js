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

/** Remove line and block comments from JSON, ignoring those inside strings. */
function stripJsonComments(s) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === "/" && s[i + 1] === "/") {
      i += 2;
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && s[i + 1] === "*") {
      i += 2;
      while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i += 1; // skip the closing '/'
      continue;
    }
    out += ch;
  }
  return out;
}

/** Drop commas that sit immediately before a `}` or `]` (outside strings). */
function stripTrailingCommas(s) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === ",") {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === "}" || s[j] === "]") continue; // skip the dangling comma
    }
    out += ch;
  }
  return out;
}

/**
 * Recover a JSON container that was cut off mid-output (the model hit its token
 * limit). String-aware scan keeps the position after the last *complete* nested
 * container, then re-closes whatever was still open at that point. Returns the
 * input unchanged if it is already balanced or nothing can be salvaged.
 */
function completeTruncatedJson(s) {
  const stack = [];
  let inStr = false;
  let esc = false;
  let cut = -1;
  let cutStack = null;
  let closedAt = -1; // index after the outermost container fully closes
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      stack.pop();
      cut = i + 1; // safe place to cut: right after a complete element
      cutStack = stack.slice();
      if (stack.length === 0 && closedAt === -1) closedAt = i + 1;
    }
  }
  // Already balanced — trim any prose the model appended after the JSON.
  if (stack.length === 0) return closedAt === -1 ? s : s.slice(0, closedAt);
  if (cut === -1) return s; // nothing complete to keep
  let out = s.slice(0, cut);
  for (let i = cutStack.length - 1; i >= 0; i--) out += cutStack[i] === "{" ? "}" : "]";
  return out;
}

/**
 * Extract a JSON value (object or array) from a model response. Tolerates
 * markdown code fences, surrounding prose, `//` and `/* *\/` comments, trailing
 * commas, and responses truncated by the model's token limit.
 * @param {string} text
 * @returns {any}
 */
export function parseModelJson(text) {
  const raw = String(text ?? "");
  const unfenced = raw.replace(/```[a-zA-Z]*[ \t]*\r?\n?/g, "").replace(/```/g, "");

  // Locate the first JSON container, whether it's an array or an object.
  const firstObj = unfenced.indexOf("{");
  const firstArr = unfenced.indexOf("[");
  let start;
  if (firstArr === -1) start = firstObj;
  else if (firstObj === -1) start = firstArr;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) throw new Error("Model did not return JSON.");

  const slice = unfenced.slice(start);
  const noComments = stripJsonComments(slice);

  // Try progressively more aggressive repairs; the first that parses wins.
  const candidates = [];
  for (const base of [slice, noComments]) {
    const completed = completeTruncatedJson(base);
    candidates.push(base, completed, stripTrailingCommas(base), stripTrailingCommas(completed));
  }
  for (const c of candidates) {
    const t = c.trim();
    if (!t) continue;
    try {
      return JSON.parse(t);
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error("Model returned malformed JSON.");
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
async function callOpenAICompatible({ url, key, model, system, prompt, maxTokens, json }) {
  if (!key) throw new Error("API key for the selected provider is not set on the server.");
  const payload = {
    model,
    max_tokens: maxTokens,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };
  // Constrain the model to emit a single JSON object — eliminates fences/prose
  // and the truncation that bare arrays are prone to. Supported by Groq & OpenRouter.
  if (json) payload.response_format = { type: "json_object" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
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
 * @param {boolean} [opts.json=false] Request a strict JSON object (OpenAI-compatible providers only).
 * @returns {Promise<string>} Raw text response.
 */
export async function complete({ provider, system, prompt, maxTokens = 2000, json = false }) {
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
      json,
    });
  return callOpenAICompatible({
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY,
    model: DEFAULTS.groq.model(),
    system,
    prompt,
    maxTokens,
    json,
  });
}
