// German gender color system
// neuter (das) = green, masculine (der) = blue, feminine (die) = pink-red, plural-only = yellow
export const GENDERS = {
  der: { label: "der", name: "maskulin", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  die: { label: "die", name: "feminin", color: "#db2777", bg: "#fdf2f8", border: "#f9a8d4" },
  das: { label: "das", name: "neutrum", color: "#16a34a", bg: "#f0fdf4", border: "#86efc4" },
  plural: { label: "die (nur Pl.)", name: "nur Plural", color: "#ca8a04", bg: "#fefce8", border: "#fde047" },
};

export function genderStyle(g) {
  return GENDERS[g] || { label: "?", name: "", color: "#475569", bg: "#f8fafc", border: "#cbd5e1" };
}

// Leitner spaced-repetition intervals per box (days)
export const LEITNER_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14, 6: 30 };

export function nextDue(box) {
  const days = LEITNER_DAYS[box] ?? 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  if (days === 0) d.setMinutes(d.getMinutes() + 10); // box 1: review again soon
  return d.toISOString();
}

export const CARD_TYPES = [
  { value: "noun", label: "Nomen" },
  { value: "verb", label: "Verb" },
  { value: "other", label: "Sonstiges" },
];
