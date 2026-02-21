# Running the App Locally

## Requirements

| Tool    | Version      |
|---------|--------------|
| Node.js | v18 or newer |
| npm     | v9 or newer  |

> The app uses **SQLite** in development — no extra database server needed.

---

## 1. Clone and install

```bash
git clone https://github.com/avrdevsolutions/table-filler.git
cd table-filler
npm install
```

---

## 2. Configure environment variables

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 3. Set up the database

```bash
npm run db:push
```

---

## 4. (Optional) Seed a test account

Creates `test@example.com` / `password123`:

```bash
npm run db:seed
```

---

## 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command                    | Description                                              |
|----------------------------|----------------------------------------------------------|
| `npm run dev`              | Start development server on port 3000                    |
| `npm run build`            | Create an optimised production build                     |
| `npm run start`            | Start the production server (requires `build` first)     |
| `npm run lint`             | Run ESLint                                               |
| `npm run typecheck`        | Run TypeScript type checking (`tsc --noEmit`)            |
| `npm test`                 | Run all unit tests (Jest)                                |
| `npm run test:unit`        | Run unit tests only (schedule + validation logic)        |
| `npm run test:integration` | Run API integration tests with a fresh test database     |
| `npm run test:e2e`         | Run Playwright E2E tests (headless)                      |
| `npm run test:e2e:headed`  | Run Playwright E2E tests in headed (interactive) mode    |
| `npm run db:push`          | Sync Prisma schema to the SQLite database                |
| `npm run db:seed`          | Insert the test user account                             |

---

## Testing

### Unit tests

Tests pure functions — schedule logic, validation helpers, date utilities.

```bash
npm run test:unit
```

Covers: `getDaysInMonth`, `getDemisieCells`, `calcTotal`, `countCO`, `formatDateRO`, `isValidEmail`, `parseLocalDate`

---

### Integration / API tests

Tests every Next.js API route handler directly (no running server needed).
Uses an isolated SQLite test database that is reset before each run.

```bash
npm run test:integration
```

Covers: businesses, employees, month-plans, cells — CRUD, auth scoping, ownership isolation.

---

### E2E tests (Playwright)

Browser-driven tests that spin up the dev server on port 3001 against a dedicated E2E database.

**First-time setup:**

```bash
# Create E2E database
DATABASE_URL=file:./prisma/e2e-test.db npx prisma db push --skip-generate

# Install Playwright browser
npx playwright install chromium
```

**Run:**

```bash
# Headless
npm run test:e2e

# Headed (interactive / debug)
npm run test:e2e:headed

# View HTML report after a run
npx playwright show-report
```

**Coverage matrix:**

| Area        | Scenarios                                                                            |
|-------------|--------------------------------------------------------------------------------------|
| Auth        | Register, login, logout, invalid credentials, field validation, guarded routes       |
| Businesses  | Create, edit, delete (confirm modal), select (dashboard), data isolation             |
| Employees   | Add, status badge, details modal, business isolation                                 |
| Plans/Table | Empty state, month selector, business switcher, back navigation                      |
| Navigation  | Guarded routes, back button, navbar links                                            |
| Regression  | Data isolation across businesses and months, hard reload                             |
| Responsive  | Desktop (1280×800) and mobile (390×844) smoke tests                                 |

---

## CI Pipeline

Every PR and push to `main` runs the full pipeline via GitHub Actions.

| Job           | Command                    | What it does                              |
|---------------|----------------------------|-------------------------------------------|
| `lint`        | `npm run lint`             | ESLint across all source files            |
| `typecheck`   | `npm run typecheck`        | TypeScript strict type checking           |
| `unit`        | `npm run test:unit`        | Fast pure-function unit tests             |
| `integration` | `npm run test:integration` | API route tests with a fresh test DB      |
| `e2e`         | `npm run test:e2e`         | Full browser-driven Playwright tests      |

All jobs must pass before a PR can be merged.

### Reproducing CI failures locally

| Failure       | Command                       |
|---------------|-------------------------------|
| lint          | `npm run lint`                |
| typecheck     | `npm run typecheck`           |
| unit          | `npm run test:unit`           |
| integration   | `npm run test:integration`    |
| e2e           | `npm run test:e2e:headed`     |

---

## Using the App

1. **Register or log in** at `/login` (or use the seeded `test@example.com` / `password123`).
2. On the **Businesses** page, add your company and click it to open the schedule.
3. **Add employees** via the people icon on the business card.
4. Use the per-row action buttons on the schedule grid:

   | Button | Action                                                    |
   |--------|-----------------------------------------------------------|
   | **ZL** | Toggle work days (value `24`)                             |
   | **CO** | Toggle paid leave days (`CO`)                             |
   | **X**  | Toggle unpaid leave days (`X`)                            |
   | **D**  | Set termination date — auto-fills cells with `DEMISIE`    |

5. The **TOTAL** column updates instantly (sum of `24`-valued cells × 24 hours).
6. Click **Descarcă** to download a PNG of the schedule.

