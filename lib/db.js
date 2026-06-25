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

/* ------------------------- Reference library ------------------------- */

/** List the user's reference documents (answer keys & transcripts), newest first. */
export async function listReferenceDocs() {
  const { data, error } = await supabase
    .from("reference_docs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Create a reference document record. */
export async function createReferenceDoc(userId, { kind, book, title, page_count }) {
  const { data, error } = await supabase
    .from("reference_docs")
    .insert({ user_id: userId, kind, book, title, page_count })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Bulk-insert the page rows of a reference document. */
export async function insertReferencePages(rows) {
  if (!rows.length) return;
  const { error } = await supabase.from("reference_pages").insert(rows);
  if (error) throw error;
}

/** Delete a reference document (cascades to its pages). */
export async function deleteReferenceDoc(id) {
  const { error } = await supabase.from("reference_docs").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Fetch all reference pages for a given book and kind, used as the candidate set
 * for retrieval at grading time.
 * @param {string} book  arbeitsbuch | lehrbuch | other
 * @param {string} kind  answer_key | transcript
 * @returns {Promise<{doc_id:string, page:number, content:string}[]>}
 */
export async function getReferencePages(book, kind) {
  const { data: docs, error: e1 } = await supabase
    .from("reference_docs")
    .select("id")
    .eq("book", book)
    .eq("kind", kind);
  if (e1) throw e1;
  const ids = docs.map((d) => d.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("reference_pages")
    .select("doc_id, page, content")
    .in("doc_id", ids);
  if (error) throw error;
  return data;
}
