/**
 * POST /api/grade — AI answer-checker.
 *
 * Compares the learner's answers against an answer key they provide, then returns
 * structured feedback: which items are wrong, the module/chapter/page it belongs
 * to, an explanation in German, and a link to an article about the topic.
 *
 * Security model:
 *  - This is a server-only route handler. Provider API keys are read from
 *    environment variables and NEVER exposed to the browser.
 *  - The client only sends the text to grade and the chosen provider name.
 *  - Input size is capped to avoid abuse / runaway cost.
 *
 * Swappable providers (set the matching env var to enable):
 *  - "anthropic"  → ANTHROPIC_API_KEY   (default model: ANTHROPIC_MODEL or claude-haiku-4-5)
 *  - "groq"       → GROQ_API_KEY        (free tier; OpenAI-compatible)
 *  - "openrouter" → OPENROUTER_API_KEY  (free open models; OpenAI-compatible)
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 16000;

/** Instruction shared by all providers. Asks for strict JSON output. */
function buildPrompt({ answers, key, context }) {
  return `You are a meticulous German-language teacher grading a student's exercise.

The student's work and the official answer key are below. Compare them item by item.

${context ? `Course context (book / module hints): ${context}\n` : ""}
=== STUDENT ANSWERS ===
${answers}

=== ANSWER KEY ===
${key}

Return ONLY valid minified JSON (no markdown, no commentary) with this exact shape:
{
  "modul": "string — the module/unit this exercise belongs to, inferred from the key/context, else \\"\\"",
  "kapitel": "string — the chapter, else \\"\\"",
  "page": "string — the page number if determinable from context, else \\"\\"",
  "summary": "string — one or two sentences in German summarising overall performance",
  "results": [
    {
      "nr": "item number or label",
      "your_answer": "what the student wrote",
      "correct_answer": "the key's answer",
      "is_correct": true,
      "explanation_de": "if wrong: a short German explanation of the rule and why; if correct: \\"\\"",
      "topic": "grammar topic, e.g. Akkusativ, Konjunktiv II",
      "article_url": "a URL to a German-language article explaining this topic (prefer mein-deutschbuch.de, deutsch-perfekt.com, or de.wikipedia.org)"
    }
  ]
}`;
}

/** Extract a JSON object from a model response that may be wrapped in code fences. */
function parseModelJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Call Anthropic's Messages API. */
async function callAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

/** Call any OpenAI-compatible chat endpoint (Groq, OpenRouter). */
async function callOpenAICompatible({ url, key, model, prompt }) {
  if (!key) throw new Error("API key for the selected provider is not set on the server.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You output only valid minified JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Provider error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/** Dispatch to the chosen provider. */
async function runProvider(provider, prompt) {
  switch (provider) {
    case "groq":
      return callOpenAICompatible({
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        prompt,
      });
    case "openrouter":
      return callOpenAICompatible({
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
        prompt,
      });
    case "anthropic":
    default:
      return callAnthropic(prompt);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const answers = String(body.answers || "").slice(0, MAX_CHARS);
    const key = String(body.key || "").slice(0, MAX_CHARS);
    const context = String(body.context || "").slice(0, 1000);
    const provider = ["anthropic", "groq", "openrouter"].includes(body.provider)
      ? body.provider
      : "anthropic";

    if (!answers.trim() || !key.trim()) {
      return Response.json({ error: "Bitte Antworten und Lösungsschlüssel angeben." }, { status: 400 });
    }

    const prompt = buildPrompt({ answers, key, context });
    const raw = await runProvider(provider, prompt);
    const result = parseModelJson(raw);
    return Response.json({ result });
  } catch (e) {
    return Response.json({ error: e.message || "Unbekannter Fehler" }, { status: 500 });
  }
}
