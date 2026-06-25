/**
 * POST /api/grade — AI answer-checker.
 *
 * Compares the learner's answers against an answer key they provide and returns
 * structured feedback: which items are wrong, the module/chapter/page it belongs
 * to, an explanation in German, and a link to an article about the topic.
 *
 * Provider keys stay server-side (see lib/llm.js). Input size is capped.
 */
import { complete, parseModelJson } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 16000;

const SYSTEM = "You are a meticulous German teacher that outputs only valid minified JSON.";

function buildPrompt({ answers, key, context }) {
  return `Grade the student's German exercise by comparing it to the official answer key, item by item.
${context ? `Course context (book / module hints): ${context}\n` : ""}
=== STUDENT ANSWERS ===
${answers}

=== ANSWER KEY ===
${key}

Return ONLY valid minified JSON with this exact shape:
{
  "modul": "module/unit inferred from key/context, else \\"\\"",
  "kapitel": "chapter, else \\"\\"",
  "page": "page number if determinable, else \\"\\"",
  "summary": "one or two sentences in German summarising performance",
  "results": [
    {
      "nr": "item number or label",
      "your_answer": "what the student wrote",
      "correct_answer": "the key's answer",
      "is_correct": true,
      "explanation_de": "if wrong: short German explanation of the rule and why; if correct: \\"\\"",
      "topic": "grammar topic, e.g. Akkusativ, Konjunktiv II",
      "article_url": "URL to a German article explaining this topic (prefer mein-deutschbuch.de, deutsch-perfekt.com or de.wikipedia.org)"
    }
  ]
}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const answers = String(body.answers || "").slice(0, MAX_CHARS);
    const key = String(body.key || "").slice(0, MAX_CHARS);
    const context = String(body.context || "").slice(0, 1000);

    if (!answers.trim() || !key.trim()) {
      return Response.json({ error: "Bitte Antworten und Lösungsschlüssel angeben." }, { status: 400 });
    }

    const raw = await complete({
      provider: body.provider,
      system: SYSTEM,
      prompt: buildPrompt({ answers, key, context }),
      maxTokens: 3000,
    });
    const result = parseModelJson(raw);
    return Response.json({ result });
  } catch (e) {
    return Response.json({ error: e.message || "Unbekannter Fehler" }, { status: 500 });
  }
}
