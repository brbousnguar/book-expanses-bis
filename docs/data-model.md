# Book Tracker — Data Model Specification

**Version:** 1.0  
**Status:** Approved for implementation

---

## 1. Overview

This document defines the **DynamoDB single-table design** for Book Tracker. All entities (Book, Note, ReadingEvent) live in one table. Multi-tenancy is enforced by using the Cognito user identifier (`userId`) in the partition key so that every query is scoped to a single user.

---

## 2. Table Configuration

- **Table name:** `BookTrackerTable` (or parameterized via SAM)
- **Partition key:** `pk` (String)
- **Sort key:** `sk` (String)
- **Billing mode:** On-demand (free tier friendly; can switch to provisioned for predictable load)
- **Point-in-time recovery:** Optional (cost consideration)
- **TTL:** Not used in MVP

---

## 3. PK / SK Patterns

### 3.1 Entity Type Prefixes

| Entity        | PK prefix | SK prefix / pattern |
|---------------|-----------|----------------------|
| User metadata | `USER#<userId>` | `METADATA` |
| Book          | `USER#<userId>` | `BOOK#<bookId>` |
| Note          | `USER#<userId>` | `NOTE#<bookId>#<noteId>` |
| ReadingEvent  | `USER#<userId>` | `EVENT#<bookId>#<occurredAt>#<eventId>` |

All `userId` values are Cognito `sub`. All `bookId` and `noteId` and `eventId` are UUIDs.

### 3.2 Examples

**Book (user `abc-123`, book `b1-uuid`):**

- `pk`: `USER#abc-123`
- `sk`: `BOOK#b1-uuid`

**Note (user `abc-123`, book `b1-uuid`, note `n1-uuid`):**

- `pk`: `USER#abc-123`
- `sk`: `NOTE#b1-uuid#n1-uuid`

**ReadingEvent (user `abc-123`, book `b1-uuid`, occurredAt `2025-01-15T10:00:00.000Z`, event `e1-uuid`):**

- `pk`: `USER#abc-123`
- `sk`: `EVENT#b1-uuid#2025-01-15T10:00:00.000Z#e1-uuid`

Using ISO timestamp in SK ensures chronological ordering when querying with `sk BETWEEN ...` for a given book. Event IDs ensure uniqueness if two events share the same second.

---

## 4. Query Patterns

| Operation | PK | SK / Condition |
|-----------|----|-----------------|
| List books for user | `USER#<userId>` | `sk begins_with BOOK#` |
| Get book by ID | `USER#<userId>` | `sk = BOOK#<bookId>` |
| List notes for book | `USER#<userId>` | `sk begins_with NOTE#<bookId>#` |
| List events for book (timeline) | `USER#<userId>` | `sk begins_with EVENT#<bookId>#` (asc or desc by sort key) |
| Delete book + notes + events | `USER#<userId>` | Multiple: delete item BOOK#<bookId>; query NOTE#<bookId>#* and EVENT#<bookId>#* and delete each (or batch) |

**Ownership:** Every query uses `pk = USER#<userId>` where `userId` comes from the JWT. No cross-user access is possible at the data layer for these patterns.

---

## 5. Attributes (Generic)

All items store:

- `pk`, `sk` (keys)
- `entityType`: `BOOK` | `NOTE` | `EVENT` (for filtering or GSI if needed)
- `userId`: redundant but useful for validation and logging
- Entity-specific attributes (see below)

**Book item:**  
`pk`, `sk`, `entityType`, `userId`, `id` (= bookId), `title`, `description`, `status`, `rating`, `currentPage`, `totalPages`, `price`, `currency`, `store`, `purchaseDate`, `boughtAt`, `createdAt`, `updatedAt`.

**Note item:**  
`pk`, `sk`, `entityType`, `userId`, `id` (= noteId), `bookId`, `content`, `createdAt`, `updatedAt`.

**ReadingEvent item:**  
`pk`, `sk`, `entityType`, `userId`, `id` (= eventId), `bookId`, `page`, `occurredAt`, (no `updatedAt` — immutable).

---

## 6. Index Strategy

**Base table only** is sufficient for MVP:

- List books: Query `pk = USER#<userId>` with `sk begins_with BOOK#`.
- Get book: GetItem `pk`, `sk`.
- List notes for book: Query `pk = USER#<userId>` with `sk begins_with NOTE#<bookId>#`.
- List events for book: Query `pk = USER#<userId>` with `sk begins_with EVENT#<bookId>#`; ScanIndexForward = true for oldest first, false for newest first.

**Optional GSI (future):**  
If we need “list books by status” or “list books by updatedAt” without loading all books, add:

- **GSI:** `gsi1pk = USER#<userId>`, `gsi1sk = STATUS#<status>#<updatedAt>` for books.  
Not in MVP scope; filtering by status can be done in memory after querying all books for the user (acceptable for small collections).

---

## 7. Event Immutability Rules

- **ReadingEvent** items are **append-only**. There is no UpdateItem or DeleteItem for events in the API.
- When the user submits a page update (POST /books/{id}/page), the backend:
  1. Creates a new ReadingEvent with a new UUID and `occurredAt = now` (ISO UTC).
  2. Updates the Book’s `currentPage` and `updatedAt`.
- No soft delete or overwrite of events. No “edit event” or “delete event” in MVP.

---

## 8. Cascade Delete (Delete Book)

When deleting a book:

1. Query `pk = USER#<userId>`, `sk begins_with NOTE#<bookId>#`; delete each note item.
2. Query `pk = USER#<userId>`, `sk begins_with EVENT#<bookId>#`; delete each event item.
3. Delete the book item `pk = USER#<userId>`, `sk = BOOK#<bookId>`.

Order can be arbitrary; all in same user partition. Use BatchWriteItem where possible to reduce round trips.
