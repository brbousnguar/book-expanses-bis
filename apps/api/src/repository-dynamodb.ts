/**
 * DynamoDB single-table data access (production).
 * Implements docs/data-model.md (PK/SK patterns, query patterns, cascade delete).
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { Book, Note, ReadingEvent } from "@book-tracker/types";
import { TABLE_NAME } from "./config.js";

const client = new DynamoDBClient({});

const PK = (userId: string) => `USER#${userId}`;
const SK_BOOK = (bookId: string) => `BOOK#${bookId}`;
const SK_NOTE = (bookId: string, noteId: string) => `NOTE#${bookId}#${noteId}`;
const SK_EVENT = (bookId: string, occurredAt: string, eventId: string) => `EVENT#${bookId}#${occurredAt}#${eventId}`;

function toBook(item: Record<string, unknown>): Book {
  const b = item as Record<string, unknown>;
  return {
    id: b.id as string,
    title: b.title as string,
    description: (b.description as string | null) ?? null,
    status: b.status as Book["status"],
    rating: (b.rating as number | null) ?? null,
    currentPage: (b.currentPage as number | null) ?? null,
    totalPages: (b.totalPages as number | null) ?? null,
    price: (b.price as number | null) ?? null,
    currency: (b.currency as string | null) ?? null,
    store: (b.store as string | null) ?? null,
    purchaseDate: (b.purchaseDate as string | null) ?? null,
    boughtAt: (b.boughtAt as string | null) ?? null,
    createdAt: b.createdAt as string,
    updatedAt: b.updatedAt as string,
    userId: b.userId as string,
  };
}

function toNote(item: Record<string, unknown>): Note {
  const n = item as Record<string, unknown>;
  return {
    id: n.id as string,
    bookId: n.bookId as string,
    content: n.content as string,
    createdAt: n.createdAt as string,
    updatedAt: n.updatedAt as string,
    userId: n.userId as string,
  };
}

function toEvent(item: Record<string, unknown>): ReadingEvent {
  const e = item as Record<string, unknown>;
  return {
    id: e.id as string,
    bookId: e.bookId as string,
    page: e.page as number,
    occurredAt: e.occurredAt as string,
    userId: e.userId as string,
  };
}

export async function putBook(book: Book): Promise<void> {
  const item = {
    pk: PK(book.userId),
    sk: SK_BOOK(book.id),
    entityType: "BOOK",
    ...book,
  };
  await client.send(new PutItemCommand({ TableName: TABLE_NAME, Item: marshall(item) }));
}

export async function getBook(userId: string, bookId: string): Promise<Book | null> {
  const res = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ pk: PK(userId), sk: SK_BOOK(bookId) }),
    })
  );
  if (!res.Item) return null;
  return toBook(unmarshall(res.Item) as Record<string, unknown>);
}

export async function listBooks(
  userId: string,
  options: { status?: string; sort?: string } = {}
): Promise<Book[]> {
  const res = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: marshall({ ":pk": PK(userId), ":sk": "BOOK#" }),
    })
  );
  let items = (res.Items ?? []).map((i) => toBook(unmarshall(i) as Record<string, unknown>));
  if (options.status) {
    items = items.filter((b) => b.status === options.status);
  }
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

  const pk = PK(userId);

  const notesRes = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: marshall({ ":pk": pk, ":sk": `NOTE#${bookId}#` }),
    })
  );
  const eventsRes = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: marshall({ ":pk": pk, ":sk": `EVENT#${bookId}#` }),
    })
  );

  const deleteRequests: { DeleteRequest: { Key: Record<string, unknown> } }[] = [];
  for (const item of notesRes.Items ?? []) {
    const u = unmarshall(item) as Record<string, unknown>;
    deleteRequests.push({ DeleteRequest: { Key: marshall({ pk: u.pk, sk: u.sk }) } });
  }
  for (const item of eventsRes.Items ?? []) {
    const u = unmarshall(item) as Record<string, unknown>;
    deleteRequests.push({ DeleteRequest: { Key: marshall({ pk: u.pk, sk: u.sk }) } });
  }
  deleteRequests.push({
    DeleteRequest: { Key: marshall({ pk, sk: SK_BOOK(bookId) }) },
  });

  for (let i = 0; i < deleteRequests.length; i += 25) {
    const chunk = deleteRequests.slice(i, i + 25);
    await client.send(
      new BatchWriteItemCommand({
        RequestItems: { [TABLE_NAME]: chunk },
      })
    );
  }
  return true;
}

export async function putNote(note: Note): Promise<void> {
  const item = {
    pk: PK(note.userId),
    sk: SK_NOTE(note.bookId, note.id),
    entityType: "NOTE",
    ...note,
  };
  await client.send(new PutItemCommand({ TableName: TABLE_NAME, Item: marshall(item) }));
}

export async function listNotes(userId: string, bookId: string): Promise<Note[]> {
  const res = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: marshall({ ":pk": PK(userId), ":sk": `NOTE#${bookId}#` }),
    })
  );
  return (res.Items ?? []).map((i) => toNote(unmarshall(i) as Record<string, unknown>));
}

export async function putEvent(event: ReadingEvent): Promise<void> {
  const item = {
    pk: PK(event.userId),
    sk: SK_EVENT(event.bookId, event.occurredAt, event.id),
    entityType: "EVENT",
    ...event,
  };
  await client.send(new PutItemCommand({ TableName: TABLE_NAME, Item: marshall(item) }));
}

export async function listEvents(
  userId: string,
  bookId: string,
  options: { limit?: number; scanIndexForward?: boolean } = {}
): Promise<ReadingEvent[]> {
  const res = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: marshall({ ":pk": PK(userId), ":sk": `EVENT#${bookId}#` }),
      Limit: options.limit ?? 50,
      ScanIndexForward: options.scanIndexForward ?? true,
    })
  );
  return (res.Items ?? []).map((i) => toEvent(unmarshall(i) as Record<string, unknown>));
}
