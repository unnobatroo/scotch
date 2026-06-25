"use client";

/**
 * Fetch a representative image for a word from the Openverse API.
 *
 * Openverse is free, requires no API key, and returns openly-licensed images.
 * We use its server-hosted `thumbnail` URL, which is reliable to hot-link. All
 * failures are swallowed and return null — images are a nice-to-have, never a
 * blocker for creating a card.
 *
 * @param {string} query  A concrete English search term (e.g. "apple").
 * @returns {Promise<string|null>} A thumbnail URL or null.
 */
export async function fetchImage(query) {
  const q = (query || "").trim();
  if (!q) return null;
  try {
    const url =
      "https://api.openverse.org/v1/images/?" +
      new URLSearchParams({ q, page_size: "1", license_type: "commercial", mature: "false" });
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data.results?.[0];
    return hit?.thumbnail || hit?.url || null;
  } catch {
    return null;
  }
}
