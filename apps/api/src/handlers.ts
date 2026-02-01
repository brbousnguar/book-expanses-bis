/**
 * Lambda handlers — one per operationId (docs/openapi.yaml).
 * Handler → parse/validate (Zod) → service → response.
 */

import { ZodError } from "zod";
import {
  bookCreateSchema,
  bookUpdateSchema,
  noteCreateSchema,
  pageUpdateSchema,
} from "@book-tracker/types";
import { getUserId } from "./config.js";
import { errorResponse, jsonResponse, parseBody } from "./errors.js";
import * as services from "./services.js";

function log(level: string, message: string, meta?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, message, ...meta }));
}

function handleZodError(e: ZodError): { code: string; message: string; details: unknown[] } {
  const details = e.errors.map((err) => ({ path: err.path.join("."), message: err.message }));
  return { code: "VALIDATION_ERROR", message: "Validation failed", details };
}

/** Ensures imageUrl and format are always present in JSON (never undefined). */
function withBookFields<T extends Record<string, unknown>>(book: T): T {
  const b = book as { imageUrl?: string | null; format?: string | null };
  return {
    ...book,
    imageUrl: b.imageUrl !== undefined && b.imageUrl !== null ? b.imageUrl : null,
    format: b.format !== undefined && b.format !== null ? b.format : null,
  } as T;
}

export async function createBook(event: { body?: string; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    log("warn", "createBook: unauthorized");
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const body = parseBody<unknown>(event.body);
  const parsed = bookCreateSchema.safeParse(body);
  if (!parsed.success) {
    log("warn", "createBook: validation failed", { errors: parsed.error.errors });
    return jsonResponse(400, handleZodError(parsed.error));
  }
  try {
    const book = await services.createBook(userId, parsed.data);
    log("info", "createBook: created", { bookId: book.id });
    const payload = { ...book, imageUrl: (parsed.data as { imageUrl?: string | null }).imageUrl ?? (book as { imageUrl?: string | null }).imageUrl ?? null, format: (parsed.data as { format?: string | null }).format ?? (book as { format?: string | null }).format ?? null };
    return jsonResponse(201, withBookFields(payload));
  } catch (err) {
    log("error", "createBook: error", { err: String(err) });
    return jsonResponse(500, errorResponse("INTERNAL_ERROR", "Internal server error"));
  }
}

export async function listBooks(event: { queryStringParameters?: Record<string, string> | null; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const status = event.queryStringParameters?.status;
  const sort = event.queryStringParameters?.sort ?? "updatedAt_desc";
  try {
    const result = await services.listBooks(userId, { status, sort });
    const items = result.items.map((b) => withBookFields(b));
    return jsonResponse(200, { items });
  } catch (err) {
    log("error", "listBooks: error", { err: String(err) });
    return jsonResponse(500, errorResponse("INTERNAL_ERROR", "Internal server error"));
  }
}

export async function getBook(event: { pathParameters?: Record<string, string> | null; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const id = event.pathParameters?.id;
  if (!id) {
    return jsonResponse(400, errorResponse("BAD_REQUEST", "Missing book id"));
  }
  const book = await services.getBook(userId, id);
  if (!book) {
    return jsonResponse(404, errorResponse("NOT_FOUND", "Book not found"));
  }
  return jsonResponse(200, withBookFields(book));
}

export async function updateBook(event: { pathParameters?: Record<string, string> | null; body?: string; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const id = event.pathParameters?.id;
  if (!id) {
    return jsonResponse(400, errorResponse("BAD_REQUEST", "Missing book id"));
  }
  const body = parseBody<unknown>(event.body);
  const parsed = body ? bookUpdateSchema.safeParse(body) : { success: true as const, data: {} };
  if (!parsed.success) {
    return jsonResponse(400, handleZodError(parsed.error));
  }
  const book = await services.updateBook(userId, id, parsed.data);
  if (!book) {
    return jsonResponse(404, errorResponse("NOT_FOUND", "Book not found"));
  }
  return jsonResponse(200, withBookFields(book));
}

export async function deleteBook(event: { pathParameters?: Record<string, string> | null; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const id = event.pathParameters?.id;
  if (!id) {
    return jsonResponse(400, errorResponse("BAD_REQUEST", "Missing book id"));
  }
  const deleted = await services.deleteBook(userId, id);
  if (!deleted) {
    return jsonResponse(404, errorResponse("NOT_FOUND", "Book not found"));
  }
  return { statusCode: 204, headers: {}, body: "" };
}

export async function createNote(event: { pathParameters?: Record<string, string> | null; body?: string; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const bookId = event.pathParameters?.id;
  if (!bookId) {
    return jsonResponse(400, errorResponse("BAD_REQUEST", "Missing book id"));
  }
  const body = parseBody<unknown>(event.body);
  const parsed = noteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, handleZodError(parsed.error));
  }
  const note = await services.createNote(userId, bookId, parsed.data);
  if (!note) {
    return jsonResponse(404, errorResponse("NOT_FOUND", "Book not found"));
  }
  return jsonResponse(201, note);
}

export async function listNotes(event: { pathParameters?: Record<string, string> | null; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const bookId = event.pathParameters?.id;
  if (!bookId) {
    return jsonResponse(400, errorResponse("BAD_REQUEST", "Missing book id"));
  }
  const book = await services.getBook(userId, bookId);
  if (!book) {
    return jsonResponse(404, errorResponse("NOT_FOUND", "Book not found"));
  }
  const result = await services.listNotes(userId, bookId);
  return jsonResponse(200, result);
}

export async function recordPage(event: { pathParameters?: Record<string, string> | null; body?: string; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const bookId = event.pathParameters?.id;
  if (!bookId) {
    return jsonResponse(400, errorResponse("BAD_REQUEST", "Missing book id"));
  }
  const body = parseBody<unknown>(event.body);
  const parsed = pageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, handleZodError(parsed.error));
  }
  const result = await services.recordPage(userId, bookId, parsed.data);
  if (!result) {
    return jsonResponse(404, errorResponse("NOT_FOUND", "Book not found"));
  }
  return jsonResponse(201, result.event);
}

export async function listReadingEvents(event: { pathParameters?: Record<string, string> | null; queryStringParameters?: Record<string, string> | null; requestContext?: unknown }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const userId = getUserId(event as Parameters<typeof getUserId>[0]);
  if (!userId) {
    return jsonResponse(401, errorResponse("UNAUTHORIZED", "Missing or invalid token"));
  }
  const bookId = event.pathParameters?.id;
  if (!bookId) {
    return jsonResponse(400, errorResponse("BAD_REQUEST", "Missing book id"));
  }
  const book = await services.getBook(userId, bookId);
  if (!book) {
    return jsonResponse(404, errorResponse("NOT_FOUND", "Book not found"));
  }
  const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : undefined;
  const result = await services.listReadingEvents(userId, bookId, { limit });
  return jsonResponse(200, result);
}
