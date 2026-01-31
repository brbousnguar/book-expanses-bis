# Book Tracker — Acceptance Criteria

**Version:** 1.0  
**Status:** Approved for implementation

All scenarios are Gherkin-style (Given / When / Then). IDs reference API operations and data model where relevant.

---

## AC-01: Create book (happy path)

**Scenario:** User creates a book with required fields only  
**Given** the user is authenticated with a valid Cognito JWT  
**And** the request body contains `title` and `status` only  
**When** the user sends `POST /books` with a valid body  
**Then** the API returns `201 Created`  
**And** the response body contains a `Book` with `id`, `userId` (from JWT), `title`, `status`, `createdAt`, `updatedAt`  
**And** the book is stored in DynamoDB with `pk = USER#<userId>`, `sk = BOOK#<bookId>`

---

## AC-02: Create book with full optional fields

**Scenario:** User creates a book with description, rating, purchase info, pages  
**Given** the user is authenticated  
**And** the request body includes `title`, `status`, `description`, `rating`, `price`, `currency`, `store`, `purchaseDate`, `boughtAt`, `currentPage`, `totalPages`  
**When** the user sends `POST /books` with valid values  
**Then** the API returns `201 Created`  
**And** the response contains all provided fields with correct types  
**And** `rating` is between 1 and 5, `currentPage` and `totalPages` are non-negative

---

## AC-03: Create book — missing title (validation)

**Scenario:** Create book fails when title is missing  
**Given** the user is authenticated  
**When** the user sends `POST /books` with body `{ "status": "SHELF" }` (no title)  
**Then** the API returns `400 Bad Request`  
**And** the response body includes a structured error (e.g. `code`, `message`, `details`)  
**And** no book is created in DynamoDB

---

## AC-04: Create book — invalid status (validation)

**Scenario:** Create book fails when status is not allowed  
**Given** the user is authenticated  
**When** the user sends `POST /books` with body `{ "title": "Foo", "status": "INVALID" }`  
**Then** the API returns `400 Bad Request`  
**And** no book is created

---

## AC-05: Create book — rating out of range (validation)

**Scenario:** Create book fails when rating is outside 1–5  
**Given** the user is authenticated  
**When** the user sends `POST /books` with body `{ "title": "Foo", "status": "READ", "rating": 6 }`  
**Then** the API returns `400 Bad Request`  
**And** no book is created

---

## AC-06: Create book — unauthenticated

**Scenario:** Create book fails without a valid token  
**Given** the user does not send an `Authorization` header (or sends an invalid/expired token)  
**When** the user sends `POST /books` with a valid body  
**Then** the API returns `401 Unauthorized`  
**And** no book is created

---

## AC-07: List books (happy path)

**Scenario:** User lists their books  
**Given** the user is authenticated  
**And** the user has at least one book in the system  
**When** the user sends `GET /books`  
**Then** the API returns `200 OK`  
**And** the response contains an `items` array of books belonging only to that user  
**And** books are sorted by `updatedAt` (default: newest first)

---

## AC-08: List books — filter by status

**Scenario:** User filters books by status  
**Given** the user is authenticated  
**And** the user has books with status SHELF, READING, and READ  
**When** the user sends `GET /books?status=READING`  
**Then** the API returns `200 OK`  
**And** every item in `items` has `status` equal to `READING`

---

## AC-09: List books — sort by last update

**Scenario:** User sorts books by last update  
**Given** the user is authenticated  
**When** the user sends `GET /books?sort=updatedAt_asc`  
**Then** the API returns `200 OK`  
**And** `items` are ordered by `updatedAt` ascending  
**When** the user sends `GET /books?sort=updatedAt_desc`  
**Then** `items` are ordered by `updatedAt` descending

---

## AC-10: Get book by ID (happy path)

**Scenario:** User retrieves one of their books  
**Given** the user is authenticated  
**And** a book with ID `bookId` exists and belongs to that user  
**When** the user sends `GET /books/{bookId}`  
**Then** the API returns `200 OK`  
**And** the response body is the full `Book` object

---

## AC-11: Get book — not found

**Scenario:** Get book returns 404 when book does not exist  
**Given** the user is authenticated  
**When** the user sends `GET /books/{id}` with a non-existent or non-UUID `id`  
**Then** the API returns `404 Not Found`  
**And** the response body includes an error structure

---

## AC-12: Get book — other user’s book (forbidden)

**Scenario:** User cannot get another user’s book  
**Given** user A is authenticated  
**And** a book exists that belongs to user B  
**When** user A sends `GET /books/{bookId}` for that book  
**Then** the API returns `403 Forbidden` or `404 Not Found` (per security policy: do not leak existence)  
**And** no data of user B is returned

---

## AC-13: Update book (happy path)

**Scenario:** User updates their book  
**Given** the user is authenticated  
**And** a book exists and belongs to that user  
**When** the user sends `PATCH /books/{bookId}` with valid partial body (e.g. `title`, `status`, `rating`)  
**Then** the API returns `200 OK`  
**And** the response contains the updated book with new `updatedAt`  
**And** only provided fields are changed; others remain unchanged

---

## AC-14: Update book — validation failure

**Scenario:** PATCH fails when body is invalid  
**Given** the user is authenticated  
**And** a book exists  
**When** the user sends `PATCH /books/{bookId}` with `rating: 0`  
**Then** the API returns `400 Bad Request`  
**And** the book is not updated

---

## AC-15: Delete book (happy path)

**Scenario:** User deletes their book and associated data  
**Given** the user is authenticated  
**And** a book exists with notes and reading events  
**When** the user sends `DELETE /books/{bookId}`  
**Then** the API returns `204 No Content`  
**And** the book, all notes for that book, and all reading events for that book are removed from DynamoDB

---

## AC-16: Delete book — other user’s book

**Scenario:** User cannot delete another user’s book  
**Given** user A is authenticated  
**And** a book exists that belongs to user B  
**When** user A sends `DELETE /books/{bookId}`  
**Then** the API returns `403 Forbidden` or `404 Not Found`  
**And** the book is not deleted

---

## AC-17: Add note to book (happy path)

**Scenario:** User adds a note to their book  
**Given** the user is authenticated  
**And** a book exists and belongs to that user  
**When** the user sends `POST /books/{bookId}/notes` with body `{ "content": "My note" }`  
**Then** the API returns `201 Created`  
**And** the response contains a `Note` with `id`, `bookId`, `content`, `createdAt`, `updatedAt`, `userId`  
**And** the note is stored with `sk = NOTE#<bookId>#<noteId>`

---

## AC-18: List notes for book (happy path)

**Scenario:** User lists notes for a book  
**Given** the user is authenticated  
**And** a book exists with at least one note  
**When** the user sends `GET /books/{bookId}/notes`  
**Then** the API returns `200 OK`  
**And** the response `items` contain only notes for that book belonging to that user

---

## AC-19: Add note — book not found

**Scenario:** Adding a note to non-existent book returns 404  
**Given** the user is authenticated  
**When** the user sends `POST /books/{nonExistentId}/notes` with valid body  
**Then** the API returns `404 Not Found`  
**And** no note is created

---

## AC-20: Record page / reading event (happy path)

**Scenario:** User records reading progress  
**Given** the user is authenticated  
**And** a book exists and belongs to that user  
**When** the user sends `POST /books/{bookId}/page` with body `{ "page": 42 }`  
**Then** the API returns `201 Created`  
**And** the response contains a `ReadingEvent` with `id`, `bookId`, `page`, `occurredAt`, `userId`  
**And** a new event is stored (append-only) with `sk = EVENT#<bookId>#<occurredAt>#<eventId>`  
**And** the book’s `currentPage` is updated to 42 and `updatedAt` is refreshed

---

## AC-21: List reading events / timeline (happy path)

**Scenario:** User views reading history for a book  
**Given** the user is authenticated  
**And** a book exists with at least two reading events  
**When** the user sends `GET /books/{bookId}/events`  
**Then** the API returns `200 OK`  
**And** the response `items` are reading events for that book in chronological order (configurable asc/desc)  
**And** events are immutable (no update/delete in API)

---

## AC-22: Record page — invalid page (negative)

**Scenario:** Recording a negative page fails  
**Given** the user is authenticated  
**And** a book exists  
**When** the user sends `POST /books/{bookId}/page` with body `{ "page": -1 }`  
**Then** the API returns `400 Bad Request`  
**And** no event is created and book’s `currentPage` is not changed

---

## AC-23: All endpoints require auth

**Scenario:** Every protected endpoint rejects unauthenticated requests  
**Given** no `Authorization: Bearer <token>` header is sent  
**When** the user sends GET/POST/PATCH/DELETE to `/books`, `/books/{id}`, `/books/{id}/notes`, `/books/{id}/page`, `/books/{id}/events`  
**Then** the API returns `401 Unauthorized` for each

---

## AC-24: ISO timestamps

**Scenario:** All timestamps in API and storage are ISO 8601 UTC  
**Given** any successful create or update  
**When** the response contains `createdAt`, `updatedAt`, or `occurredAt`  
**Then** each value is a string in format compatible with ISO 8601 (e.g. `2025-01-15T10:00:00.000Z`)

---

## AC-25: Pagination (optional)

**Scenario:** List endpoints support pagination when implemented  
**Given** the user has more items than the default page size  
**When** the user sends `GET /books` or `GET /books/{id}/events` with `limit` and/or `nextToken`  
**Then** the API returns at most `limit` items and may include `nextToken` for the next page  
*(If pagination is not in MVP, this scenario can be marked as future.)*

---

Traceability:  
- Features map to API operations in `openapi.yaml` (operationId).  
- Data access patterns map to `docs/data-model.md` (query patterns).  
- UI flows map to `docs/spec.md` (UX flows).
