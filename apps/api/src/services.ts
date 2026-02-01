/**
 * Business logic layer: handler → service → repository.
 * operationIds from docs/openapi.yaml: createBook, listBooks, getBook, updateBook, deleteBook, createNote, listNotes, recordPage, listReadingEvents.
 */

import { v4 as uuidv4 } from "uuid";
import type { Book, Note, ReadingEvent } from "@book-tracker/types";
import type { BookCreateInput, BookUpdateInput, NoteCreateInput, PageUpdateInput } from "@book-tracker/types";
import * as repo from "./repository.js";

export async function createBook(userId: string, input: BookCreateInput): Promise<Book> {
  const now = new Date().toISOString();
  const book: Book = {
    id: uuidv4(),
    userId,
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    rating: input.rating ?? null,
    currentPage: input.currentPage ?? null,
    totalPages: input.totalPages ?? null,
    price: input.price ?? null,
    currency: input.currency ?? null,
    store: input.store ?? null,
    purchaseDate: input.purchaseDate ?? null,
    boughtAt: input.boughtAt ?? null,
    imageUrl: input.imageUrl ?? null,
    format: input.format ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await repo.putBook(book);
  return book;
}

export async function listBooks(
  userId: string,
  params: { status?: string; sort?: string }
): Promise<{ items: Book[] }> {
  const items = await repo.listBooks(userId, { status: params.status, sort: params.sort });
  return { items };
}

export async function getBook(userId: string, bookId: string): Promise<Book | null> {
  return repo.getBook(userId, bookId);
}

export async function updateBook(
  userId: string,
  bookId: string,
  input: BookUpdateInput
): Promise<Book | null> {
  const updates: Partial<Book> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.rating !== undefined) updates.rating = input.rating;
  if (input.currentPage !== undefined) updates.currentPage = input.currentPage;
  if (input.totalPages !== undefined) updates.totalPages = input.totalPages;
  if (input.price !== undefined) updates.price = input.price;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.store !== undefined) updates.store = input.store;
  if (input.purchaseDate !== undefined) updates.purchaseDate = input.purchaseDate;
  if (input.boughtAt !== undefined) updates.boughtAt = input.boughtAt;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
  if (input.format !== undefined) updates.format = input.format;
  if (Object.keys(updates).length === 0) return repo.getBook(userId, bookId);
  return repo.updateBook(userId, bookId, updates);
}

export async function deleteBook(userId: string, bookId: string): Promise<boolean> {
  return repo.deleteBook(userId, bookId);
}

export async function createNote(
  userId: string,
  bookId: string,
  input: NoteCreateInput
): Promise<Note | null> {
  const book = await repo.getBook(userId, bookId);
  if (!book) return null;
  const now = new Date().toISOString();
  const note: Note = {
    id: uuidv4(),
    bookId,
    userId,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
  await repo.putNote(note);
  return note;
}

export async function listNotes(userId: string, bookId: string): Promise<{ items: Note[] }> {
  const book = await repo.getBook(userId, bookId);
  if (!book) return { items: [] };
  const items = await repo.listNotes(userId, bookId);
  return { items };
}

export async function recordPage(
  userId: string,
  bookId: string,
  input: PageUpdateInput
): Promise<{ event: ReadingEvent; book: Book } | null> {
  const book = await repo.getBook(userId, bookId);
  if (!book) return null;
  const now = new Date().toISOString();
  const event: ReadingEvent = {
    id: uuidv4(),
    bookId,
    userId,
    page: input.page,
    occurredAt: now,
  };
  await repo.putEvent(event);
  const updated = await repo.updateBook(userId, bookId, {
    currentPage: input.page,
    updatedAt: now,
  });
  return updated ? { event, book: updated } : null;
}

export async function listReadingEvents(
  userId: string,
  bookId: string,
  params: { limit?: number } = {}
): Promise<{ items: ReadingEvent[] }> {
  const book = await repo.getBook(userId, bookId);
  if (!book) return { items: [] };
  const items = await repo.listEvents(userId, bookId, {
    limit: params.limit ?? 50,
    scanIndexForward: false,
  });
  return { items };
}
