# ADR-0003: Event Audit Design (ReadingEvent Immutability)

**Status:** Accepted  
**Date:** 2025-01-31  
**Context:** Book Tracker

---

## Context

We need to track reading progress over time and provide a timeline (“I was on page X at time T”). Requirements:

- Append-only audit trail: once a reading event is recorded, it must not be changed or deleted by users.
- Each update of “current page” should create a new event and update the book’s `currentPage` and `updatedAt`.
- We must support listing events for a book in chronological order.

Options considered: (1) append-only events with no update/delete API, (2) mutable events (user can edit/delete), (3) event sourcing with snapshots.

---

## Decision

We use **append-only ReadingEvent** records:

- **Immutable:** No PATCH or DELETE for ReadingEvent in the API. Events are created only via POST /books/{id}/page.
- **One event per submission:** Each POST /books/{id}/page with body `{ "page": N }` creates a new ReadingEvent with a new UUID, `page = N`, and `occurredAt = now` (ISO UTC).
- **Book state:** The same request updates the book’s `currentPage` to N and `updatedAt` to now.
- **Storage:** Events are stored with SK `EVENT#<bookId>#<occurredAt>#<eventId>` so that querying by `begins_with EVENT#<bookId>#` returns a chronologically ordered timeline (sort key order).
- **Cascade delete:** When a book is deleted, all its events are deleted (same as notes); no soft delete for events in MVP.

---

## Consequences

**Positive:**

- Simple, tamper-evident history: no edits or deletes.
- Timeline is deterministic by sort key; no need for secondary index for “events by book.”
- Aligns with audit-style requirements and future analytics (e.g. reading velocity).

**Negative:**

- No “undo” or “correct typo” for a page entry; user would need to submit a new event (acceptable for MVP).
- Storage grows with number of events; DynamoDB item count and size remain manageable for personal use.

---

## References

- `docs/spec.md` — ReadingEvent entity, immutability.  
- `docs/data-model.md` — EVENT# PK/SK pattern, event immutability rules.  
- `docs/openapi.yaml` — POST /books/{id}/page, GET /books/{id}/events.
