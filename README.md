# Pontaj Lunar — Monthly Schedule Manager

A full-stack web application for managing monthly employee work schedules.
Managers can create, edit, and export a PNG image of the monthly schedule grid.

![Schedule grid](https://github.com/user-attachments/assets/bb28e0b8-e16b-40b9-9198-ae85a78487e9)

---

## Table of Contents

1. [Local Development](#local-development)
2. [Available Scripts](#available-scripts)
3. [Testing](#testing)
4. [CI Pipeline](#ci-pipeline)
5. [Production Deployment (Vercel)](#production-deployment-vercel)
6. [Stack](#stack)
7. [Project Structure](#project-structure)

---

## Local Development

### Requirements

| Tool | Version |
|------|---------|
| Node.js | v18 or newer |
| npm | v9 or newer |

> **Note:** The app uses SQLite in development — no additional database server is required.

### 1. Clone and install dependencies

```bash
git clone https://github.com/avrdevsolutions/table-filler.git
cd table-filler
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

> **Production:** Replace `NEXTAUTH_SECRET` with a long random string:
> ```bash
> openssl rand -base64 32
> ```

### 3. Set up the database

```bash
npm run db:push
```

### 4. (Optional) Seed a test account

Creates `test@example.com` / `password123`:

```bash
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create an optimised production build |
| `npm run start` | Start the production server (requires `build` first) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run all unit tests (Jest) |
| `npm run test:unit` | Run unit tests only (schedule + validation logic) |
| `npm run test:integration` | Run API integration tests with a fresh test database |
| `npm run test:e2e` | Run Playwright E2E tests (headless) |
| `npm run test:e2e:headed` | Run Playwright E2E tests in headed (interactive) mode |
| `npm run db:push` | Sync Prisma schema to the SQLite database |
| `npm run db:seed` | Insert the test user account |

---

## Testing

The project has three test layers, each serving a different purpose.

### A) Unit tests (fast)

Tests pure functions with no I/O — schedule logic, validation helpers, and
date utilities.

```bash
npm run test:unit
```

Covers:
- `getDaysInMonth`, `getDemisieCells`, `calcTotal`, `countCO`, `formatDateRO`
- `isValidEmail`, `parseLocalDate`

### B) Integration / API tests

Tests every Next.js API route handler directly (no running server required).
Each test uses an isolated SQLite test database (`prisma/test.db`) that is
created fresh before the suite runs.

```bash
npm run test:integration
```

Covers:
- `GET/POST /api/businesses` + auth scoping + CRUD ownership isolation
- `GET/POST/PUT/DELETE /api/employees` + soft-delete + business scoping
- `GET/POST/PUT/DELETE /api/month-plans` + idempotency + unique constraint
- `POST /api/cells` + batch upsert

The test database is separate from `prisma/dev.db` and is reset automatically
before each run via `prisma db push --force-reset`.

### C) E2E tests (Playwright)

Browser-driven tests that simulate a real user. The dev server is started
automatically on port 3001 against a dedicated E2E database (`prisma/e2e-test.db`).

**Set up the E2E database (first time only):**

```bash
DATABASE_URL=file:./prisma/e2e-test.db npx prisma db push --skip-generate
```

**Install Playwright browsers (first time only):**

```bash
npx playwright install chromium
```

**Run headless:**

```bash
npm run test:e2e
```

**Run headed (interactive) for debugging:**

```bash
npm run test:e2e:headed
```

**View the HTML report after a run:**

```bash
npx playwright show-report
```

**E2E coverage matrix:**

| Area | Scenarios |
|------|-----------|
| Auth | Register, login, logout, invalid credentials, field validation, guarded routes |
| Businesses | Create, edit, delete (confirm modal), select (dashboard), data isolation |
| Employees | Add, status badge, details modal, business isolation |
| Plans / Table | Empty state, month selector, business switcher, back navigation |
| Navigation | Guarded routes, back button, navbar links |
| Regression | Data isolation across businesses and months, hard reload |
| Responsive | Desktop (1280x800) and mobile (390x844) smoke tests |

---

## CI Pipeline

Every pull request and push to `main` runs the full CI pipeline via GitHub Actions.

### Jobs

| Job | Command | What it does |
|-----|---------|--------------|
| `lint` | `npm run lint` | ESLint across all source files |
| `typecheck` | `npm run typecheck` | TypeScript strict type checking |
| `unit` | `npm run test:unit` | Fast pure-function unit tests |
| `integration` | `npm run test:integration` | API route tests with a fresh test DB |
| `e2e` | `npm run test:e2e` | Full browser-driven Playwright tests |

All jobs must pass before a PR can be merged.

### How to read CI failures

1. Open the failing PR and click **Details** next to the failing check.
2. Expand the failed step to see the error output.
3. For Playwright failures, download the **playwright-report** artifact that is
   uploaded automatically on failure — it contains screenshots and traces.
4. To reproduce locally:
   - **lint:** `npm run lint`
   - **typecheck:** `npm run typecheck`
   - **unit:** `npm run test:unit`
   - **integration:** `npm run test:integration`
   - **e2e:** `npm run test:e2e:headed` (headed mode shows the browser)

### Branch protection

To enforce that CI passes before merging:

1. Go to **Settings → Branches** in the repository.
2. Click **Add branch ruleset** (or **Add rule** for classic rules).
3. Set the branch pattern to `main`.
4. Enable **Require status checks to pass before merging**.
5. Add all five CI jobs as required checks:
   - `Lint (ESLint)`
   - `Type check (tsc)`
   - `Unit tests (Jest)`
   - `Integration tests (API + DB)`
   - `E2E tests (Playwright)`
6. Enable **Require branches to be up to date before merging**.
7. Save.

---

## Production Deployment (Vercel)

Follow this checklist exactly to deploy to production on Vercel.

### Prerequisites

- A [Vercel](https://vercel.com) account
- The repository hosted on GitHub
- A production-grade database (see note below)

> **Database note:** The default schema uses SQLite which is not suitable for
> multi-process production deployments (Vercel functions are serverless).
> For production you should use a managed Postgres provider and switch the
> Prisma provider to `postgresql`:
>
> ```prisma
> datasource db {
>   provider = "postgresql"
>   url      = env("DATABASE_URL")
> }
> ```
>
> Recommended providers: [Neon](https://neon.tech), [Supabase](https://supabase.com),
> or [Railway](https://railway.app) (all have free tiers).

### Step-by-step deployment checklist

#### 1. Create the Vercel project

- [ ] Log in to [vercel.com](https://vercel.com).
- [ ] Click **Add New → Project**.
- [ ] Import the GitHub repository (`avrdevsolutions/table-filler`).

#### 2. Configure build settings

Vercel auto-detects Next.js. Verify in **Project Settings → General**:

- [ ] **Framework Preset:** Next.js
- [ ] **Build Command:** `npm run build`
- [ ] **Output Directory:** `.next`
- [ ] **Install Command:** `npm ci`

#### 3. Configure environment variables

In **Project Settings → Environment Variables**, add the following:

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | Postgres connection string | Production, Preview |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` output | Production, Preview |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |

#### 4. Provision the production database

**Option A — Neon (recommended):**

- [ ] Create a project at [neon.tech](https://neon.tech).
- [ ] Copy the connection string into `DATABASE_URL`.
- [ ] Update `prisma/schema.prisma` datasource provider to `postgresql`.

**Option B — Supabase:**

- [ ] Create a project at [supabase.com](https://supabase.com).
- [ ] Use the **direct** connection string from *Settings → Database*.
- [ ] Update `prisma/schema.prisma` datasource provider to `postgresql`.

#### 5. Run database migrations on deploy

Add a `postbuild` script so migrations run on every Vercel build:

```json
"postbuild": "prisma migrate deploy"
```

- [ ] Add the script to `package.json` and push to `main`.

#### 6. Configure custom domain (optional)

- [ ] In **Project Settings → Domains**, add your custom domain.
- [ ] Follow the DNS instructions from Vercel.
- [ ] Update `NEXTAUTH_URL` to the custom domain.

#### 7. Enable branch protection + required CI checks

- [ ] Follow the [Branch protection](#branch-protection) steps above.
- [ ] All five CI jobs are set as required status checks.

#### 8. First deployment

- [ ] Push or merge to `main`.
- [ ] CI runs automatically — wait for all jobs to pass.
- [ ] Vercel deploys automatically after the merge.
- [ ] Visit your Vercel URL to verify the deployment.

### Deploy process summary

```
Feature branch → PR → Preview deploy (automatic, Vercel)
                    ↓
              CI jobs run (GitHub Actions)
                    ↓
         All checks pass → Merge allowed
                    ↓
           Merge to main → Production deploy (Vercel, only if CI green)
```

### Rollback

If a production deploy is broken:

1. Go to **Vercel → Project → Deployments**.
2. Find the last known-good deployment.
3. Click **⋯ → Promote to Production**.

---

## Creating a Schedule — Quick Workflow

1. **Register or log in** at `/login` (or use the seeded account above).
2. On the **Businesses** page, add your company and click it to open the schedule.
3. **Add employees** under the business card by clicking the people icon.
4. Use the per-row action buttons on the schedule grid:
   | Button | Action |
   |--------|--------|
   | **ZL** | Toggle work days (value `24`) |
   | **CO** | Toggle paid leave days (`CO`) |
   | **X**  | Toggle unpaid leave days (`X`) |
   | **D**  | Set termination date — auto-fills cells with `DEMISIE` pattern |
5. The **TOTAL** column updates instantly (sum of `24`-valued cells × 24 hours).
6. Click **Descarcă** to download a PNG of the schedule.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** ORM + **SQLite** (development) / **PostgreSQL** (production)
- **NextAuth.js v4** — email/password authentication (bcrypt, JWT)
- **Jest** — unit + integration tests
- **Playwright** — E2E browser tests
- **GitHub Actions** — CI pipeline

---

## Project Structure

```
src/
├── app/
│   ├── api/            # REST API routes (auth, employees, plans, cells, businesses)
│   ├── businesses/     # Businesses management page
│   ├── dashboard/      # Main schedule editing page
│   ├── login/          # Login page
│   └── register/       # Registration page
├── components/
│   ├── ScheduleGrid.tsx    # Interactive schedule table
│   ├── MonthSelector.tsx   # Month / year navigation
│   ├── DatePickerModal.tsx # Calendar date picker
│   └── DemisieDialog.tsx   # Termination date dialog
├── lib/
│   ├── schedule.ts     # Business logic (TOTAL, DEMISIE fill, CO count)
│   ├── validation.ts   # Email + date validation helpers
│   ├── auth.ts         # NextAuth configuration
│   ├── exportCanvas.ts # Canvas-based PNG export
│   └── prisma.ts       # Prisma client singleton
└── types/index.ts      # Shared TypeScript types

src/__tests__/
├── schedule.test.ts    # Unit tests — schedule logic
├── validation.test.ts  # Unit tests — validation helpers
└── api/
    ├── globalSetup.ts  # Jest global setup (migrates test DB)
    ├── helpers.ts      # Shared test utilities
    ├── businesses.test.ts   # Integration tests — businesses API
    ├── employees.test.ts    # Integration tests — employees API
    └── month-plans.test.ts  # Integration tests — plans + cells API

e2e/
├── helpers.ts           # Shared Playwright helpers (register, login, ...)
├── auth.spec.ts         # E2E — auth flows
├── businesses.spec.ts   # E2E — business CRUD
├── employees.spec.ts    # E2E — employee management
├── plans.spec.ts        # E2E — plan / schedule flows
├── navigation.spec.ts   # E2E — routing & navigation
├── regression.spec.ts   # E2E — data isolation regression
└── responsive.spec.ts   # E2E — responsive smoke tests

.github/workflows/
└── ci.yml              # GitHub Actions CI pipeline
```
