# Pontaj Lunar — Monthly Schedule Manager

A full-stack web application for managing monthly employee work schedules.
Managers can create, edit, and export a PNG image of the monthly schedule grid.

![Schedule grid](https://github.com/user-attachments/assets/bb28e0b8-e16b-40b9-9198-ae85a78487e9)

---

## Docs

| Document | Description |
|----------|-------------|
| [Running Locally](docs/RUNNING_LOCALLY.md) | Setup, dev server, scripts, testing, CI |
| [Deployment](docs/DEPLOYMENT.md) | Vercel + Neon + Cloudflare production setup |

---

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** ORM + **SQLite** (development) / **PostgreSQL via Neon** (production)
- **NextAuth.js v4** — email/password authentication (bcrypt, JWT)
- **Jest** — unit + integration tests
- **Playwright** — E2E browser tests
- **GitHub Actions** — CI pipeline

---

## Infrastructure

| Layer    | Service    | URL                                         |
|----------|------------|---------------------------------------------|
| Frontend | Vercel     | `https://pontaj.avrdevelopmentsolutions.ro` |
| Database | Neon       | serverless PostgreSQL                       |
| DNS/SSL  | Cloudflare | `avrdevelopmentsolutions.ro`                |

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
    ├── globalSetup.ts       # Jest global setup (migrates test DB)
    ├── helpers.ts           # Shared test utilities
    ├── businesses.test.ts   # Integration tests — businesses API
    ├── employees.test.ts    # Integration tests — employees API
    └── month-plans.test.ts  # Integration tests — plans + cells API

e2e/
├── helpers.ts           # Shared Playwright helpers
├── auth.spec.ts         # E2E — auth flows
├── businesses.spec.ts   # E2E — business CRUD
├── employees.spec.ts    # E2E — employee management
├── plans.spec.ts        # E2E — plan / schedule flows
├── navigation.spec.ts   # E2E — routing & navigation
├── regression.spec.ts   # E2E — data isolation regression
└── responsive.spec.ts   # E2E — responsive smoke tests

docs/
├── RUNNING_LOCALLY.md  # Local setup, scripts, testing guide
└── DEPLOYMENT.md       # Vercel + Neon + Cloudflare deployment guide

.github/workflows/
└── ci.yml              # GitHub Actions CI pipeline
```
