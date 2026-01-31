# Book Tracker — Product Specification

**Version:** 1.0  
**Status:** Approved for implementation

---

## 1. Problem Statement

Readers need a single place to track their personal book collection: what they own, what they are reading, what they have read, and how they felt about each book. They also need to record purchase details (price, store, date), reading progress over time (page updates), and free-form notes—without relying on third-party paid services or social features.

Book Tracker solves this by providing a **personal, multi-tenant, serverless web application** where each user’s data is isolated, validated, and stored with an append-only audit trail for reading events.

---

## 2. Users and Non-Goals

### 2.1 Primary User

- **Reader / Book owner**: A person who wants to catalog books, track reading progress, rate books, and store purchase and note data. Identity is established via Amazon Cognito (JWT); the Cognito `sub` is the canonical user identifier.

### 2.2 Non-Goals (Out of Scope)

- Social features: sharing shelves, follows, comments from other users.
- Recommendations or discovery from external APIs.
- E-book file storage or DRM.
- Mobile native apps (web-only for this MVP).
- Import/export (future enhancement, not MVP).
- Public profiles or anonymous access.

---

## 3. Entity Definitions

### 3.1 Book

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | yes | Unique identifier, generated server-side. |
| title | string | yes | Book title. |
| description | string | no | Free-form description or summary. |
| status | enum | yes | `SHELF` \| `READING` \| `READ`. |
| rating | number | no | 1–5 (integer or half-step). Stored as number; validated 1 ≤ rating ≤ 5. |
| currentPage | number | no | Last recorded page number; ≥ 0. |
| totalPages | number | no | Total pages if known; ≥ 0. |
| price | number | no | Purchase price. |
| currency | string | no | ISO 4217 code (e.g. USD, EUR). |
| store | string | no | Where the book was purchased. |
| purchaseDate | string | no | ISO 8601 date (YYYY-MM-DD). |
| boughtAt | string | no | Free-form string (e.g. "Amazon", "Local bookstore"). |
| createdAt | string | yes | ISO 8601 datetime (UTC). |
| updatedAt | string | yes | ISO 8601 datetime (UTC). |
| userId | string | yes | Cognito `sub`; set server-side from JWT. |

**Invariants:**

- Every book belongs to exactly one user (`userId`).
- `updatedAt` is set or refreshed on every update.
- Status transitions are unrestricted for MVP (any status → any status).

### 3.2 Note

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | yes | Unique identifier. |
| bookId | string | yes | References the book. |
| content | string | yes | Free-form text. |
| createdAt | string | yes | ISO 8601 datetime (UTC). |
| updatedAt | string | yes | ISO 8601 datetime (UTC). |
| userId | string | yes | Cognito `sub`; must match book owner. |

**Invariants:**

- Notes are always scoped to a book and to the same user who owns the book.
- A note cannot exist without a valid book.

### 3.3 ReadingEvent

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | yes | Unique identifier. |
| bookId | string | yes | Book this event belongs to. |
| page | number | yes | Page number at time of event; ≥ 0. |
| occurredAt | string | yes | ISO 8601 datetime (UTC). |
| userId | string | yes | Cognito `sub`; must match book owner. |

**Invariants:**

- **Immutable**: ReadingEvents are append-only; no update or delete in MVP.
- Each event is created when the user updates `currentPage` for a book (POST /books/{id}/page).
- Events form an ordered timeline per book (e.g. by `occurredAt`).

---

## 4. Status Lifecycle Rules

- **SHELF**: Book is owned but not started.
- **READING**: User is currently reading; may have reading events and currentPage updates.
- **READ**: Reading finished (user marks as read).

**MVP:** No formal state machine. Any status can transition to any other. No automatic transitions (e.g. we do not auto-set READ when currentPage = totalPages).

---

## 5. Permissions Model

- **Authentication:** All API requests (except health/public if any) require a valid Cognito JWT in `Authorization: Bearer <token>`.
- **Authorization:** Every resource (Book, Note, ReadingEvent) is tied to a `userId` (Cognito `sub`). The backend **must**:
  - Set `userId` from the JWT on create.
  - Enforce that only the owning user can read, update, or delete their books, notes, and events.
  - Never return or modify another user’s data.
- **Multi-tenancy:** Implemented by partition key design (see Data Model). All queries are scoped by `userId`.

---

## 6. UX Flows

1. **Sign in:** User signs in via Cognito (hosted UI or custom); receives JWT.
2. **List books:** User sees their books; can filter by status and sort by last update.
3. **Create book:** User adds a new book with required fields (e.g. title, status); optional purchase and rating.
4. **View book:** User opens a book detail view; sees metadata, notes, and reading history timeline.
5. **Update book:** User edits title, status, rating, purchase info, description, etc.
6. **Update progress:** User submits current page; system creates a ReadingEvent and updates book’s currentPage.
7. **View timeline:** User sees reading events in chronological order for that book.
8. **Add note:** User adds a note to a book; notes listed on book detail.
9. **Delete book:** User deletes a book (cascade behavior for notes/events defined in data model / API).
10. **Filter and sort:** User filters by SHELF / READING / READ and sorts by last update (default: newest first).

---

## 7. Edge Cases and Failure Modes

- **Invalid or missing JWT:** 401 Unauthorized; no access to data.
- **Wrong user accesses resource:** 403 Forbidden when attempting to access another user’s book/note/event by ID.
- **Book not found:** 404 for GET/PATCH/DELETE /books/{id} when id does not exist or belongs to another user.
- **Validation errors:** 400 Bad Request with a structured body (e.g. field errors) for invalid input (Zod validation).
- **Idempotency:** POST /books is not idempotent (each call creates a new book). POST /books/{id}/page is not idempotent (each call creates a new event).
- **Concurrent updates:** Last-write-wins for book PATCH; no optimistic locking in MVP.
- **Rate limiting:** Handled by API Gateway / AWS quotas; no custom rate limit in app logic.
- **Cascade delete:** Deleting a book should remove or orphan notes and events as per data model (e.g. delete all items with same book partition).
- **Empty states:** Empty list of books, no notes, no events—UI must handle without errors.
- **Very long text:** Description and notes have reasonable max length (e.g. 10k characters) to avoid abuse and DynamoDB item size limits.
