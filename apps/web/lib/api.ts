/**
 * API client — calls backend with Bearer token (docs/openapi.yaml).
 * Base URL from NEXT_PUBLIC_API_URL.
 */

import type { Book, Note, ReadingEvent } from "@book-tracker/types";

function getBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (env) return env;
  if (typeof window !== "undefined" && window.location?.hostname === "localhost") {
    return "http://localhost:3001";
  }
  return "";
}

const BASE = getBaseUrl();

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token: string | null }
): Promise<{ data?: T; status: number; error?: { code: string; message: string } }> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await res.text();
  let data: T | undefined;
  let error: { code: string; message: string } | undefined;
  if (text) {
    try {
      const json = JSON.parse(text);
      if (res.ok) data = json as T;
      else error = { code: json.code ?? "ERROR", message: json.message ?? text };
    } catch {
      if (!res.ok) error = { code: "ERROR", message: text };
    }
  }
  return { data, status: res.status, error };
}

export async function createBook(
  token: string | null,
  body: { title: string; status: string; description?: string; rating?: number; currentPage?: number; totalPages?: number; price?: number; currency?: string; store?: string; purchaseDate?: string; boughtAt?: string }
): Promise<{ data?: Book; status: number; error?: { code: string; message: string } }> {
  return request<Book>("/books", { method: "POST", body, token });
}

export async function listBooks(
  token: string | null,
  params?: { status?: string; sort?: string }
): Promise<{ data?: { items: Book[] }; status: number; error?: { code: string; message: string } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.sort) q.set("sort", params.sort);
  const query = q.toString();
  return request<{ items: Book[] }>(`/books${query ? `?${query}` : ""}`, { token });
}

export async function getBook(
  token: string | null,
  id: string
): Promise<{ data?: Book; status: number; error?: { code: string; message: string } }> {
  return request<Book>(`/books/${id}`, { token });
}

export async function updateBook(
  token: string | null,
  id: string,
  body: Partial<{ title: string; status: string; description: string; rating: number; currentPage: number; totalPages: number; price: number; currency: string; store: string; purchaseDate: string; boughtAt: string }>
): Promise<{ data?: Book; status: number; error?: { code: string; message: string } }> {
  return request<Book>(`/books/${id}`, { method: "PATCH", body, token });
}

export async function deleteBook(
  token: string | null,
  id: string
): Promise<{ status: number; error?: { code: string; message: string } }> {
  const r = await request<unknown>(`/books/${id}`, { method: "DELETE", token });
  return { status: r.status, error: r.error };
}

export async function createNote(
  token: string | null,
  bookId: string,
  body: { content: string }
): Promise<{ data?: Note; status: number; error?: { code: string; message: string } }> {
  return request<Note>(`/books/${bookId}/notes`, { method: "POST", body, token });
}

export async function listNotes(
  token: string | null,
  bookId: string
): Promise<{ data?: { items: Note[] }; status: number; error?: { code: string; message: string } }> {
  return request<{ items: Note[] }>(`/books/${bookId}/notes`, { token });
}

export async function recordPage(
  token: string | null,
  bookId: string,
  body: { page: number }
): Promise<{ data?: ReadingEvent; status: number; error?: { code: string; message: string } }> {
  return request<ReadingEvent>(`/books/${bookId}/page`, { method: "POST", body, token });
}

export async function listEvents(
  token: string | null,
  bookId: string,
  params?: { limit?: number }
): Promise<{ data?: { items: ReadingEvent[] }; status: number; error?: { code: string; message: string } }> {
  const q = params?.limit ? `?limit=${params.limit}` : "";
  return request<{ items: ReadingEvent[] }>(`/books/${bookId}/events${q}`, { token });
}
