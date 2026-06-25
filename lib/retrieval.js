/**
 * Lightweight, dependency-free retrieval to find the answer-key / transcript
 * pages most relevant to a student's exercise excerpt — no embeddings or extra
 * API needed, which keeps the grader free to run.
 *
 * Scoring combines:
 *   - token overlap between the excerpt and each reference page (distinctive
 *     words shared = same exercise), and
 *   - a strong boost when a page contains a page number that also appears in the
 *     excerpt (e.g. the printed "42" visible on the student's scan).
 */

const STOP = new Set(
  "der die das und ist in zu den von mit sich auf für ein eine einen dem des ich du er sie es wir ihr the a an of to and is in for on with you are not".split(" ")
);

/** Tokenise text into distinctive lowercase words (length > 3, non-stopword). */
function tokenize(text) {
  return (text.toLowerCase().match(/[a-zäöüß]{4,}/g) || []).filter((w) => !STOP.has(w));
}

/** Page-number-like integers (2–3 digits) mentioned in the text. */
function pageNumbers(text) {
  return new Set((text.match(/\b\d{1,3}\b/g) || []).filter((n) => +n >= 1 && +n <= 999));
}

/**
 * Rank reference pages by relevance to the excerpt.
 * @param {string} excerpt                     The student's exercise text.
 * @param {{doc_id:string,page:number,content:string}[]} pages  Candidate pages.
 * @param {number} [topK=6]
 * @param {number} [charBudget=9000]           Max total characters to return.
 * @returns {{page:number, content:string, score:number}[]}
 */
export function rankPages(excerpt, pages, topK = 6, charBudget = 9000) {
  const exTokens = new Set(tokenize(excerpt));
  const exNums = pageNumbers(excerpt);

  const scored = pages.map((p) => {
    const toks = tokenize(p.content);
    let overlap = 0;
    for (const t of toks) if (exTokens.has(t)) overlap++;
    const nums = pageNumbers(p.content);
    let numHit = 0;
    for (const n of nums) if (exNums.has(n)) numHit++;
    const score = overlap + numHit * 8; // page-number matches weigh heavily
    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const out = [];
  let budget = charBudget;
  for (const p of scored) {
    if (p.score <= 0 && out.length > 0) break;
    const slice = p.content.slice(0, budget);
    out.push({ page: p.page, content: slice, score: p.score });
    budget -= slice.length;
    if (out.length >= topK || budget <= 0) break;
  }
  return out;
}
