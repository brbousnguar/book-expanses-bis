/**
 * Zod schemas for API validation.
 * Aligns with docs/openapi.yaml (BookCreate, BookUpdate, NoteCreate, PageUpdate).
 */

import { z } from "zod";

const bookStatusEnum = z.enum(["SHELF", "READING", "READ"]);
const bookFormatEnum = z.enum(["PHYSICAL", "ELECTRONIC"]);

export const bookCreateSchema = z.object({
  title: z.string().min(1, "title is required").max(500),
  description: z.string().max(10000).optional().nullable(),
  status: bookStatusEnum,
  rating: z.number().min(1).max(5).optional().nullable(),
  currentPage: z.number().int().min(0).optional().nullable(),
  totalPages: z.number().int().min(0).optional().nullable(),
  price: z.number().optional().nullable(),
  currency: z.string().max(3).optional().nullable(),
  store: z.string().max(200).optional().nullable(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  boughtAt: z.string().max(200).optional().nullable(),
  // Full URL (external) or path like /book-covers/xxx.jpg (local upload)
  imageUrl: z.string().max(2000).optional().nullable(),
  format: bookFormatEnum.optional().nullable(),
});

export const bookUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: bookStatusEnum.optional(),
  rating: z.number().min(1).max(5).optional().nullable(),
  currentPage: z.number().int().min(0).optional().nullable(),
  totalPages: z.number().int().min(0).optional().nullable(),
  price: z.number().optional().nullable(),
  currency: z.string().max(3).optional().nullable(),
  store: z.string().max(200).optional().nullable(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  boughtAt: z.string().max(200).optional().nullable(),
  // Full URL (external) or path like /book-covers/xxx.jpg (local upload)
  imageUrl: z.string().max(2000).optional().nullable(),
  format: bookFormatEnum.optional().nullable(),
});

export const noteCreateSchema = z.object({
  content: z.string().min(1, "content is required").max(10000),
});

export const pageUpdateSchema = z.object({
  page: z.number().int().min(0),
});

export type BookCreateInput = z.infer<typeof bookCreateSchema>;
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;

export type BookStatus = z.infer<typeof bookStatusEnum>;
export type BookFormat = z.infer<typeof bookFormatEnum>;
