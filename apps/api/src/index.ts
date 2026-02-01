/**
 * Lambda entry: route by path + method to handler (operationId from docs/openapi.yaml).
 * API Gateway HTTP API v2 payload: rawPath, requestContext.http.method, pathParameters.
 */

import type { APIGatewayProxyEventV2 } from "aws-lambda";
import * as handlers from "./handlers.js";

type Handler = (event: APIGatewayProxyEventV2) => Promise<{ statusCode: number; headers: Record<string, string>; body: string }>;

const routes: Record<string, Handler> = {
  "POST /books": (e) => handlers.createBook(e),
  "GET /books": (e) => handlers.listBooks(e),
  "GET /books/{id}": (e) => handlers.getBook(e),
  "PATCH /books/{id}": (e) => handlers.updateBook(e),
  "DELETE /books/{id}": (e) => handlers.deleteBook(e),
  "POST /books/{id}/notes": (e) => handlers.createNote(e),
  "GET /books/{id}/notes": (e) => handlers.listNotes(e),
  "POST /books/{id}/page": (e) => handlers.recordPage(e),
  "GET /books/{id}/events": (e) => handlers.listReadingEvents(e),
};

function normalizePath(path: string, params?: Record<string, string> | null): string {
  if (!params?.id) return path;
  return path.replace(params.id, "{id}");
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const method = event.requestContext?.http?.method ?? "GET";
  const path = event.rawPath ?? "/";
  const normalized = normalizePath(path, event.pathParameters);
  const key = `${method} ${normalized}`;
  const fn = routes[key];
  if (fn) {
    return fn(event);
  }
  return {
    statusCode: 404,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "NOT_FOUND", message: "Not found" }),
  };
}
