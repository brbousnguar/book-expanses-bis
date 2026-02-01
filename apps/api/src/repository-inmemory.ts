/**
 * In-memory repository for local dev (no DynamoDB).
 * Same interface as repository-dynamodb; data is lost on restart.
 */

import type { Book, Note, ReadingEvent } from "@book-tracker/types";

const books = new Map<string, Book>();
const notes = new Map<string, Note>();
const events = new Map<string, ReadingEvent>();

const bookKey = (userId: string, bookId: string) => `${userId}#${bookId}`;
const noteKey = (userId: string, bookId: string, noteId: string) => `${userId}#${bookId}#${noteId}`;
const eventKey = (userId: string, bookId: string, eventId: string) => `${userId}#${bookId}#${eventId}`;

export async function putBook(book: Book): Promise<void> {
  books.set(bookKey(book.userId, book.id), { ...book });
}

export async function getBook(userId: string, bookId: string): Promise<Book | null> {
  return books.get(bookKey(userId, bookId)) ?? null;
}

export async function listBooks(
  userId: string,
  options: { status?: string; sort?: string } = {}
): Promise<Book[]> {
  let items = Array.from(books.values()).filter((b) => b.userId === userId);
  if (options.status) items = items.filter((b) => b.status === options.status);
  const asc = options.sort === "updatedAt_asc";
  items.sort((a, b) => {
    const t1 = new Date(a.updatedAt).getTime();
    const t2 = new Date(b.updatedAt).getTime();
    return asc ? t1 - t2 : t2 - t1;
  });
  return items;
}

export async function updateBook(
  userId: string,
  bookId: string,
  updates: Partial<Omit<Book, "id" | "userId" | "createdAt">>
): Promise<Book | null> {
  const existing = await getBook(userId, bookId);
  if (!existing) return null;
  const updated: Book = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await putBook(updated);
  return updated;
}

export async function deleteBook(userId: string, bookId: string): Promise<boolean> {
  const book = await getBook(userId, bookId);
  if (!book) return false;
  books.delete(bookKey(userId, bookId));
  for (const [k, n] of notes.entries()) {
    if (n.userId === userId && n.bookId === bookId) notes.delete(k);
  }
  for (const [k, e] of events.entries()) {
    if (e.userId === userId && e.bookId === bookId) events.delete(k);
  }
  return true;
}

export async function putNote(note: Note): Promise<void> {
  notes.set(noteKey(note.userId, note.bookId, note.id), { ...note });
}

export async function listNotes(userId: string, bookId: string): Promise<Note[]> {
  return Array.from(notes.values()).filter(
    (n) => n.userId === userId && n.bookId === bookId
  );
}

export async function putEvent(event: ReadingEvent): Promise<void> {
  events.set(eventKey(event.userId, event.bookId, event.id), { ...event });
}

export async function listEvents(
  userId: string,
  bookId: string,
  options: { limit?: number; scanIndexForward?: boolean } = {}
): Promise<ReadingEvent[]> {
  let items = Array.from(events.values()).filter(
    (e) => e.userId === userId && e.bookId === bookId
  );
  items.sort((a, b) => {
    const t1 = new Date(a.occurredAt).getTime();
    const t2 = new Date(b.occurredAt).getTime();
    return (options.scanIndexForward ?? true) ? t1 - t2 : t2 - t1;
  });
  const limit = options.limit ?? 50;
  return items.slice(0, limit);
}
