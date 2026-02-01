/**
 * Centralized error handling and standard error response (docs/openapi.yaml ErrorResponse).
 */

import type { ErrorResponse } from "@book-tracker/types";

export function errorResponse(code: string, message: string, details?: unknown[]): ErrorResponse {
  return { code, message, ...(details?.length ? { details } : {}) };
}

export function jsonResponse(statusCode: number, body: unknown): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function parseBody<T>(body: string | null | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}
