/**
 * POST /api/parse-words — turn raw text (extracted from a PDF or pasted) into
 * structured German flashcards using the configured LLM.
 *
 * The model classifies each word (noun / verb / other), supplies the gender,
 * plural and verb Stammformen from its own knowledge (even if the source only
 * lists the bare word), an English meaning, an example sentence, and a concrete
 * English `image_query` used client-side to fetch a photo from Openverse.
 *
 * Security: provider keys stay server-side (see lib/llm.js). Input and the number
 * of generated cards are capped to bound cost and latency.
 */
import { complete, parseModelJson } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 12000;
const MAX_CARDS = 60;

const SYSTEM =
  "You are a precise German lexicographer that outputs only valid minified JSON.";

function buildPrompt(text) {
  return `From the following German study text, extract the vocabulary words and turn each into a flashcard.
Use YOUR OWN knowledge to fill in correct grammar even if the source only lists the bare word.
Skip duplicates and non-words. Return at most ${MAX_CARDS} cards.

Output rules (strict):
- Return ONLY a single minified JSON object of the form {"cards": [ ... ]}.
- No prose, no markdown, no code fences, no comments, no trailing commas.

Each element of "cards" has these fields:
- card_type: one of "noun", "verb", "other"
- noun_word: noun without article (nouns only)
- noun_gender: one of "der", "die", "das", "plural" (use "plural" only for plural-only words)
- noun_singular: article + singular, e.g. "der Tisch"
- noun_plural: article + plural, e.g. "die Tische"
- verb_infinitiv: infinitive (verbs only)
- verb_praeteritum: 3rd person singular Präteritum, e.g. "ging"
- verb_partizip: Partizip II, e.g. "gegangen"
- verb_aux: "haben" or "sein"
- answer: for "other" cards ONLY, the German word/phrase exactly as it should be learned, e.g. "alleinerziehend", "trotzdem", "zu Hause". Leave "" for nouns and verbs.
- prompt: concise English meaning/translation
- example: a short natural German example sentence
- image_query: 1-3 word concrete English search term for a photo, or "" if the word is abstract

Leave fields that do not apply to a word as an empty string "".
Every "other" card MUST have a non-empty "answer" (the German term); never leave it blank.

TEXT:
${text}`;
}

/** Coerce/whitelist a model card into our schema. */
function sanitizeCard(c) {
  const type = ["noun", "verb", "other"].includes(c.card_type) ? c.card_type : "other";
  const gender = ["der", "die", "das", "plural"].includes(c.noun_gender) ? c.noun_gender : null;
  const aux = ["haben", "sein"].includes(c.verb_aux) ? c.verb_aux : "haben";
  return {
    card_type: type,
    noun_word: String(c.noun_word || "").slice(0, 120),
    noun_gender: gender,
    noun_singular: String(c.noun_singular || "").slice(0, 120),
    noun_plural: String(c.noun_plural || "").slice(0, 120),
    verb_infinitiv: String(c.verb_infinitiv || "").slice(0, 120),
    verb_praeteritum: String(c.verb_praeteritum || "").slice(0, 120),
    verb_partizip: String(c.verb_partizip || "").slice(0, 120),
    verb_aux: aux,
    prompt: String(c.prompt || "").slice(0, 200),
    answer: String(c.answer || "").slice(0, 200),
    example: String(c.example || "").slice(0, 240),
    image_query: String(c.image_query || "").slice(0, 60),
    image_url: "",
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const text = String(body.text || "").trim().slice(0, MAX_CHARS);
    if (!text) return Response.json({ error: "Kein Text gefunden." }, { status: 400 });

    const raw = await complete({
      provider: body.provider,
      system: SYSTEM,
      prompt: buildPrompt(text),
      maxTokens: 8000, // ~60 detailed cards; 4000 truncated the array and broke JSON
      json: true, // ask OpenAI-compatible providers for a strict JSON object
    });
    const parsed = parseModelJson(raw);
    const list = Array.isArray(parsed) ? parsed : parsed.cards || [];
    const cards = list.slice(0, MAX_CARDS).map(sanitizeCard);
    return Response.json({ cards });
  } catch (e) {
    return Response.json({ error: e.message || "Unbekannter Fehler" }, { status: 500 });
  }
}
