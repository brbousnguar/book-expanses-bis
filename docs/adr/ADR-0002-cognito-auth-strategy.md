# ADR-0002: Cognito Auth Strategy

**Status:** Accepted  
**Date:** 2025-01-31  
**Context:** Book Tracker

---

## Context

We need authentication and a stable user identity for multi-tenant data. Requirements:

- No anonymous access; every API call must be tied to a user.
- User identity must be consistent and trusted by the backend.
- We want a managed, serverless-friendly auth solution that works with API Gateway and Lambda.

Options considered: (1) Amazon Cognito User Pools, (2) custom JWT issuer, (3) third-party IdP (Auth0, etc.).

---

## Decision

We use **Amazon Cognito User Pools** for authentication:

- Users sign up/sign in via Cognito (hosted UI or custom UI with Amplify Auth).
- API Gateway (HTTP API) uses a Cognito authorizer that validates the JWT and passes claims to Lambda.
- **User identity** is the Cognito `sub` (subject) claim — immutable, unique per user, and set in every request context.
- Frontend sends `Authorization: Bearer <access_token>`; API Gateway validates the token before invoking Lambda.
- No paid third-party SaaS for core auth.

---

## Consequences

**Positive:**

- Managed, scalable auth; no server to run.
- JWT validation at the gateway; Lambda receives only authenticated requests (or 401 before Lambda).
- `sub` is stable and suitable for partition keys and ownership checks.
- Integrates with Amplify for frontend hosting and auth flows.
- Free tier friendly for small user counts.

**Negative:**

- Vendor lock-in to Cognito; migration would require re-issuing identities.
- Custom claims or roles would require Cognito configuration (e.g. groups); MVP uses `sub` only.

---

## References

- `docs/spec.md` — Permissions model, userId = Cognito sub.  
- `docs/openapi.yaml` — securitySchemes.bearerAuth.
