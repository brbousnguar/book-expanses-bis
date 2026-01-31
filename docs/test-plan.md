# Book Tracker — Test Plan

**Version:** 1.0  
**Status:** Approved for implementation

---

## 1. Scope

- **Unit tests:** Handlers, services, validation (Zod), data access layer (mocked DynamoDB).
- **Integration tests:** API (HTTP) + real or local DynamoDB; auth with valid/invalid JWT.
- **Smoke tests:** Against deployed stack (API Gateway + Lambda + DynamoDB + Cognito).

---

## 2. Unit Tests

### 2.1 Shared package (`packages/types`)

- **Zod schemas:**  
  - BookCreate, BookUpdate: valid payloads pass; missing required fields, invalid enum, rating out of range, negative page, long strings fail with expected errors.  
  - NoteCreate, PageUpdate: valid/invalid cases.  
- **Shared types:** TypeScript types align with Zod inferred types; no hand-written duplicate DTOs that can drift.

### 2.2 API layer (`apps/api`)

- **Handlers (per operationId):**  
  - Each handler: given a valid event (with JWT in `requestContext.authorizer` or headers), returns expected status and body shape.  
  - Invalid body: returns 400 and structured error.  
  - Missing/invalid JWT: returns 401.  
- **Auth:**  
  - Extract `userId` from JWT; unit test with mocked authorizer payload.  
  - Invalid or missing token: 401.  
- **Services:**  
  - BookService: create, get, list, update, delete — with mocked repository; verify calls and return values.  
  - NoteService: create, list by bookId — mocked.  
  - EventService: recordPage, list by bookId — mocked; verify event is created and book currentPage updated.  
- **Data access (repository):**  
  - With DynamoDB mock (e.g. dynamodb-local or jest mock):  
    - PutItem/GetItem/Query/DeleteItem/BatchWriteItem called with correct pk/sk and attributes.  
    - List books: query with pk and begins_with BOOK#.  
    - List notes: query with pk and begins_with NOTE#<bookId>#.  
    - List events: query with pk and begins_with EVENT#<bookId>#.  
    - Delete book: cascade delete notes and events then book.

### 2.3 Coverage targets

- Handlers: all branches (success, 400, 401, 403, 404).  
- Services: success and error paths.  
- Zod: all schema branches.  
- Aim: > 80% line coverage for `apps/api` and `packages/types`.

---

## 3. Integration Tests

### 3.1 Environment

- Use a dedicated test table (e.g. `BookTrackerTable-Test`) or isolated prefix.  
- Auth: use a real Cognito test user or a mock authorizer that injects a fixed `sub` for integration tests.  
- API: invoke Lambda via AWS SDK (invoke) or HTTP against a deployed dev API; prefer HTTP for realism.

### 3.2 Scenarios (map to acceptance criteria)

- **AC-01, AC-02:** POST /books → 201, body has id, userId, timestamps; GET /books includes new book.  
- **AC-03–AC-05:** POST /books with invalid payload → 400.  
- **AC-06, AC-23:** POST/GET without token or with invalid token → 401.  
- **AC-07–AC-09:** GET /books, with status and sort query params; verify order and filtering.  
- **AC-10:** GET /books/{id} → 200 and correct book.  
- **AC-11, AC-12:** GET /books/{id} with wrong id or other user’s id → 403 or 404.  
- **AC-13, AC-14:** PATCH /books/{id} valid/invalid → 200 or 400.  
- **AC-15, AC-16:** DELETE /books/{id} → 204 and data removed; other user → 403/404.  
- **AC-17–AC-19:** POST /books/{id}/notes, GET /books/{id}/notes; 404 for missing book.  
- **AC-20–AC-22:** POST /books/{id}/page → 201, new event and book.currentPage updated; invalid page → 400.  
- **AC-21:** GET /books/{id}/events returns events in order.  
- **AC-24:** All timestamps in responses are ISO 8601.

### 3.3 Data integrity

- After create book, query DynamoDB and verify pk/sk and attributes.  
- After record page, verify new EVENT item and updated BOOK item.  
- After delete book, verify book, notes, and events are gone.

---

## 4. Smoke Tests (Deployed)

### 4.1 Prerequisites

- Stack deployed via SAM (API Gateway, Lambda, DynamoDB, Cognito).  
- Cognito user created; access token obtained (e.g. via AWS CLI or script).

### 4.2 Steps

1. **Health / readiness:** If an optional health route exists, GET returns 200.  
2. **Auth:** Request without token → 401. Request with valid token → not 401 for a valid path.  
3. **Happy path:**  
   - POST /books → 201, save book id.  
   - GET /books → 200, list contains the book.  
   - GET /books/{id} → 200.  
   - PATCH /books/{id} → 200.  
   - POST /books/{id}/notes → 201.  
   - GET /books/{id}/notes → 200.  
   - POST /books/{id}/page → 201.  
   - GET /books/{id}/events → 200.  
   - DELETE /books/{id} → 204.  
   - GET /books/{id} → 404.  
4. **Cross-tenant:** Create book as user A; with user B token, GET/DELETE that book → 403 or 404.

### 4.3 Execution

- Run after each deploy to prod or staging (e.g. GitHub Action or manual).  
- Use env vars for API URL and test user credentials; no secrets in repo.

---

## 5. Tooling

- **Runner:** Jest (or Vitest) for unit and integration.  
- **API client:** fetch or axios for integration/smoke.  
- **DynamoDB:** Use DynamoDB Local or real table with test prefix for integration.  
- **Cognito:** Use test user pool and test user for integration/smoke; token via AWS Cognito Identity SDK or CLI.

---

## 6. Traceability

- Each integration scenario references one or more acceptance criteria (AC-xx) from `docs/acceptance.md`.  
- Each handler test references `operationId` from `docs/openapi.yaml`.  
- Data access tests reference query patterns in `docs/data-model.md`.
