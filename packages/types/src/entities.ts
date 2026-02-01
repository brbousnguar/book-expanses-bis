/**
 * Entity types (align with docs/spec.md and docs/openapi.yaml).
 */

import type { BookStatus } from "./schemas.js";

export interface Book {
  id: string;
  title: string;
  description: string | null;
  status: BookStatus;
  rating: number | null;
  currentPage: number | null;
  totalPages: number | null;
  price: number | null;
  currency: string | null;
  store: string | null;
  purchaseDate: string | null;
  boughtAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Note {
  id: string;
  bookId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ReadingEvent {
  id: string;
  bookId: string;
  page: number;
  occurredAt: string;
  userId: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown[];
}
