/**
 * Local API server for development (no AWS).
 * Wraps Lambda handlers; uses in-memory store when LOCAL_DEV=1.
 * Run: npm run start:local (from apps/api) or npm run dev:api (from root).
 */

import express, { type Request, type Response } from "express";
import * as handlers from "./handlers.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Local dev user (no Cognito). Set LOCAL_USER_ID to override.
const LOCAL_USER_ID = process.env.LOCAL_USER_ID ?? "local-dev-user";

app.use(express.json());

// CORS so frontend (localhost:3000) can call this API
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (res.req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

function buildEvent(req: Request, pathParams?: { id?: string }): {
  body?: string;
  pathParameters?: Record<string, string> | null;
  queryStringParameters?: Record<string, string> | null;
  requestContext: {
    authorizer: { jwt: { claims: { sub: string } }; claims?: { sub: string } };
  };
} {
  return {
    body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    pathParameters: pathParams ?? null,
    queryStringParameters: (req.query as Record<string, string>) || null,
    requestContext: {
      authorizer: {
        jwt: { claims: { sub: LOCAL_USER_ID } },
        claims: { sub: LOCAL_USER_ID },
      },
    },
  };
}

async function invoke(
  req: Request,
  res: Response,
  handler: (event: unknown) => Promise<{ statusCode: number; headers: Record<string, string>; body: string }>,
  pathParams?: { id?: string }
) {
  const event = buildEvent(req, pathParams);
  const result = await handler(event);
  res.status(result.statusCode);
  Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
  if (result.body) res.send(result.body);
  else res.end();
}

// POST /books
app.post("/books", (req, res) => invoke(req, res, handlers.createBook));

// GET /books
app.get("/books", (req, res) => invoke(req, res, handlers.listBooks));

// GET /books/:id
app.get("/books/:id", (req, res) =>
  invoke(req, res, handlers.getBook, { id: req.params.id })
);

// PATCH /books/:id
app.patch("/books/:id", (req, res) =>
  invoke(req, res, handlers.updateBook, { id: req.params.id })
);

// DELETE /books/:id
app.delete("/books/:id", (req, res) =>
  invoke(req, res, handlers.deleteBook, { id: req.params.id })
);

// POST /books/:id/notes
app.post("/books/:id/notes", (req, res) =>
  invoke(req, res, handlers.createNote, { id: req.params.id })
);

// GET /books/:id/notes
app.get("/books/:id/notes", (req, res) =>
  invoke(req, res, handlers.listNotes, { id: req.params.id })
);

// POST /books/:id/page
app.post("/books/:id/page", (req, res) =>
  invoke(req, res, handlers.recordPage, { id: req.params.id })
);

// GET /books/:id/events
app.get("/books/:id/events", (req, res) =>
  invoke(req, res, handlers.listReadingEvents, { id: req.params.id })
);

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: "info",
      message: "Local API server running (imageUrl/format supported)",
      port: PORT,
      localUserId: LOCAL_USER_ID,
      localDev: process.env.LOCAL_DEV,
    })
  );
});
