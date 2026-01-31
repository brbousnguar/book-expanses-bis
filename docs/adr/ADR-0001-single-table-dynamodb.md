# ADR-0001: Single-Table DynamoDB Design

**Status:** Accepted  
**Date:** 2025-01-31  
**Context:** Book Tracker

---

## Context

We need a persistent store for Books, Notes, and ReadingEvents with strict multi-tenancy (each item belongs to one user). We must support:

- List books for a user (filter by status, sort by updatedAt).
- Get/update/delete a book by ID.
- List notes for a book.
- List reading events for a book (timeline).
- Cascade delete book and related notes/events.

Options considered: (1) one DynamoDB table with composite keys (single-table design), (2) one table per entity, (3) RDS/relational.

---

## Decision

We use a **single DynamoDB table** with composite partition key and sort key:

- **PK:** `USER#<userId>` (Cognito `sub`).
- **SK:**  
  - Books: `BOOK#<bookId>`  
  - Notes: `NOTE#<bookId>#<noteId>`  
  - Events: `EVENT#<bookId>#<occurredAt>#<eventId>`

All entities for a user share the same partition key. Queries are always scoped by `USER#<userId>`, so multi-tenancy is enforced at the data layer.

---

## Consequences

**Positive:**

- One table to manage, deploy, and back up.
- Strong tenant isolation: every query uses the same PK pattern.
- Efficient queries: list books, list notes for book, list events for book via `begins_with` on SK.
- Cost-efficient and free-tier friendly (single table, on-demand billing).
- No cross-partition scans; all access is partition-scoped.

**Negative:**

- Filtering by status or sort by updatedAt for books is done in memory after querying all user books (acceptable for small collections; GSI can be added later if needed).
- Application must construct and parse composite keys correctly; shared repository/helpers reduce risk.

---

## References

- `docs/data-model.md` — full PK/SK patterns and query patterns.
