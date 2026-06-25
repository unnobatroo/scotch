/**
 * Data-access layer for Scotch.
 *
 * Thin, documented wrappers around Supabase queries so UI components stay clean.
 * Every table enforces row-level security (`user_id = auth.uid()`), so these
 * helpers never need to filter by user for reads — the database does it. We still
 * set `user_id` explicitly on insert to satisfy the RLS `with check` policy.
 */
import { supabase } from "./supabase";
import { nextDue } from "./german";

/* ----------------------------- Decks ----------------------------- */

/** List the current user's decks, newest first. */
export async function listDecks() {
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Create a deck owned by the given user. */
export async function createDeck(userId, name, description = "") {
  const { data, error } = await supabase
    .from("decks")
    .insert({ user_id: userId, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a deck (cascades to its cards). */
export async function deleteDeck(id) {
  const { error } = await supabase.from("decks").delete().eq("id", id);
  if (error) throw error;
}

/** Count of cards per deck, returned as a map { deckId: count }. */
export async function deckCounts() {
  const { data, error } = await supabase.from("cards").select("deck_id");
  if (error) throw error;
  const map = {};
  for (const row of data) map[row.deck_id] = (map[row.deck_id] || 0) + 1;
  return map;
}

/* ----------------------------- Cards ----------------------------- */

/** List all cards in a deck, newest first. */
export async function listCards(deckId) {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Create a card. `payload` must include user_id and deck_id. */
export async function createCard(payload) {
  const { data, error } = await supabase.from("cards").insert(payload).select().single();
  if (error) throw error;
  return data;
}

/** Patch a card by id. */
export async function updateCard(id, patch) {
  const { data, error } = await supabase.from("cards").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/** Delete a card by id. */
export async function deleteCard(id) {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Cards that are due for review (due_at <= now). Optionally scope to one deck.
 * Ordered by due date so the most overdue cards come first.
 */
export async function dueCards(deckId = null) {
  let q = supabase
    .from("cards")
    .select("*")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });
  if (deckId) q = q.eq("deck_id", deckId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/**
 * Record a Leitner review. Correct → advance one box (max 6). Wrong → back to box 1.
 * Updates the next due date accordingly.
 * @param {object} card The card being reviewed.
 * @param {boolean} correct Whether the answer was correct.
 */
export async function reviewCard(card, correct) {
  const box = correct ? Math.min((card.box || 1) + 1, 6) : 1;
  return updateCard(card.id, {
    box,
    due_at: nextDue(box),
    last_reviewed: new Date().toISOString(),
  });
}

/* -------------------------- Image upload -------------------------- */

/**
 * Upload an image to the public `card-images` bucket and return its public URL.
 * Files are namespaced per user to satisfy the storage RLS policy.
 */
export async function uploadCardImage(userId, file) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("card-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("card-images").getPublicUrl(path);
  return data.publicUrl;
}

/* ----------------------------- Notes ----------------------------- */

/** List the user's note groups, alphabetically. */
export async function listGroups() {
  const { data, error } = await supabase
    .from("note_groups")
    .select("*")
    .order("sort", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

/** Create a note group. */
export async function createGroup(userId, name) {
  const { data, error } = await supabase
    .from("note_groups")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a note group (notes inside are kept but ungrouped). */
export async function deleteGroup(id) {
  const { error } = await supabase.from("note_groups").delete().eq("id", id);
  if (error) throw error;
}

/** List the user's notes, most recently updated first. */
export async function listNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Create a note. */
export async function createNote(userId, { title = "Untitled", content = "", group_id = null } = {}) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: userId, title, content, group_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Patch a note and bump its updated_at timestamp. */
export async function updateNote(id, patch) {
  const { data, error } = await supabase
    .from("notes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a note. */
export async function deleteNote(id) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
