# Book Tracker

Production-quality, multi-tenant web app for tracking books, reading progress, notes, and purchase info. Built with **Next.js**, **AWS API Gateway (HTTP API)**, **Lambda**, **DynamoDB**, and **Cognito**.

---

## Repo structure

```
/apps
  /web          Next.js (App Router), TypeScript, Tailwind, shadcn/ui
  /api          Lambda handlers (Node 20 + TypeScript)
/packages
  /types        Shared types + Zod schemas
/infra
  template.yaml AWS SAM
/docs
  spec.md       Product specification
  openapi.yaml  API contract (OpenAPI 3.1)
  data-model.md DynamoDB single-table design
  acceptance.md Acceptance criteria (Gherkin)
  test-plan.md  Unit / integration / smoke tests
  /adr          Architecture decision records
```

---

## Spec compliance matrix

| Feature | API (operationId) | DynamoDB access | UI page |
|--------|-------------------|----------------|--------|
| Create book | `createBook` | PutItem BOOK# | `/books/new` |
| List books | `listBooks` | Query pk, begins_with BOOK# | `/books` |
| Get book | `getBook` | GetItem BOOK# | `/books/[id]` |
| Update book | `updateBook` | GetItem + PutItem | `/books/[id]` (Edit) |
| Delete book | `deleteBook` | Query NOTE#/EVENT# + BatchWrite + DeleteItem | `/books/[id]` (Delete) |
| Add note | `createNote` | GetItem book + PutItem NOTE# | `/books/[id]` (Notes) |
| List notes | `listNotes` | Query NOTE#&lt;bookId&gt;# | `/books/[id]` |
| Record page | `recordPage` | PutItem EVENT# + UpdateItem book | `/books/[id]` (Record progress) |
| List events | `listReadingEvents` | Query EVENT#&lt;bookId&gt;# | `/books/[id]` (Timeline) |
| Filter by status | `listBooks` (query param) | In-memory filter after Query | `/books` (Status filter) |
| Sort by updatedAt | `listBooks` (query param) | In-memory sort after Query | `/books` (Sort) |
| Auth | All endpoints | userId from JWT (Cognito sub) | Login, Bearer in API client |

---

## Local dev setup (Windows 11 and others)

### Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/) (LTS). Check: `node -v`
- **npm** — Comes with Node. Check: `npm -v`
- No AWS account or Docker needed for local backend.

### Quick start: run backend + frontend locally (no AWS)

1. **Install dependencies** (from repo root):

   ```bash
   npm install
   ```

2. **Start the local API server** (in-memory store, no DynamoDB):

   ```bash
   npm run dev:api
   ```

   The API runs at **http://localhost:3001**. Leave this terminal open.

3. **Configure the frontend** to use the local API:

   - Copy `apps/web/.env.local.example` to `apps/web/.env.local`
   - Ensure it contains: `NEXT_PUBLIC_API_URL=http://localhost:3001`
   - Do **not** set Cognito vars for local dev (so the app skips login and uses a fake user).

4. **Start the frontend** (in a second terminal):

   ```bash
   npm run dev:web
   ```

5. Open [http://localhost:3000](http://localhost:3000). You can add books, notes, and record progress. Data is stored in memory and is lost when you stop the API.

6. **Verify the API** (optional): with the API running, from repo root run `npm run test:local-api`. It should print `Local API test passed.`

### Run frontend only

```bash
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000). Without the local API or env vars, list/detail pages will show empty or errors until the backend is running and `NEXT_PUBLIC_API_URL` points to it.

### Build (for production or Lambda deploy)

```bash
npm install
npm run build
```

This builds `packages/types`, `apps/api` (Lambda bundle), and `apps/web`.

---

## AWS deployment (SAM)

### First-time deploy

1. **Build Lambda artifact**

   From repo root, build types and API so the Lambda handler and deps are ready:

   ```bash
   npm run build -w packages/types
   npm run build -w apps/api
   ```

2. **Build and deploy with SAM**

   ```bash
   cd infra
   sam build
   sam deploy --guided
   ```

   When prompted:

   - Stack name: e.g. `book-tracker-dev`
   - AWS Region: your choice
   - Parameter Stage: e.g. `dev`
   - Confirm defaults for the rest (or set as needed).

3. **Outputs**

   After deploy, note:

   - **ApiUrl** — API Gateway HTTP API URL (e.g. `https://xxx.execute-api.region.amazonaws.com`)
   - **UserPoolId** — Cognito User Pool ID
   - **UserPoolClientId** — Cognito App Client ID

### Frontend env for deployed API

Create `.env.local` in `apps/web` (or set in Amplify / your host):

```env
NEXT_PUBLIC_API_URL=https://<your-api-id>.execute-api.<region>.amazonaws.com
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<UserPoolId>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<UserPoolClientId>
```

Then build and run or deploy the web app:

```bash
npm run build -w apps/web
npm run start -w apps/web
```

### Create a user (Cognito)

Create at least one user in the User Pool (Console or CLI) so you can sign in:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username your@email.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

Then set a permanent password in the Console or via `admin-set-user-password`.

---

## Environment variables

| Variable | Where | Description |
|----------|--------|-------------|
| `TABLE_NAME` | Lambda (SAM sets it) | DynamoDB table name |
| `NEXT_PUBLIC_API_URL` | Web | API Gateway HTTP API base URL |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Web | Cognito User Pool ID |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Web | Cognito App Client ID |

---

## Cost awareness

- **DynamoDB**: On-demand billing; free tier includes 25 GB storage and 25 WCU/RCU (provisioned equivalent). Single table keeps one table to manage.
- **Lambda**: Free tier includes 1M requests/month and 400,000 GB-seconds. ARM64 and single Lambda for all routes reduce cost.
- **API Gateway HTTP API**: Lower cost than REST API; pay per request and data transfer.
- **Cognito**: Free tier includes 50,000 MAUs.
- **Amplify**: Hosting and build minutes have their own free tier and pricing.

For light personal use, staying within free tier is realistic. Monitor usage in the AWS Billing dashboard.

---

## Traceability

- **Handlers** → `docs/openapi.yaml` (operationId per endpoint).
- **Acceptance** → `docs/acceptance.md` (AC-01–AC-25).
- **Data access** → `docs/data-model.md` (PK/SK, query patterns).
- **Decisions** → `docs/adr/` (single-table, Cognito, event audit).

---

## License

Private / unlicensed unless otherwise specified.
