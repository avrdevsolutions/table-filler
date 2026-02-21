# Running the App Locally

## Requirements

| Tool           | Version      |
|----------------|--------------|
| Node.js        | v18 or newer |
| npm            | v9 or newer  |
| Docker         | v24 or newer (for Postgres) |
| Docker Compose | v2 or newer  |

> The app uses **PostgreSQL** for both local development and production.
> A Docker Compose file is included to spin up Postgres with a single command.

---

## 1. Clone and install

```bash
git clone https://github.com/avrdevsolutions/table-filler.git
cd table-filler
npm install
```

---

## 2. Start Postgres via Docker

```bash
docker compose up -d
```

This starts a Postgres 16 container on port **5432** with:

| Setting  | Value          |
|----------|----------------|
| User     | `postgres`     |
| Password | `postgres`     |
| Database | `tablefiller`  |

---

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

The defaults in `.env.example` match the Docker Compose service:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tablefiller?schema=public"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

> **Note:** Keep the quotes around `DATABASE_URL` to avoid shell-parsing issues.

---

## 4. Set up the database schema

```bash
npx prisma db push
```

---

## 5. (Optional) Seed a test account

Creates `test@example.com` / `password123`:

```bash
npm run db:seed
```

---

## 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running integration tests locally

Integration tests require a separate Postgres database (`tablefiller_test`).

1. Create the test database:

   ```bash
   docker compose up -d   # already running? skip this
   docker exec -it table-filler-postgres-1 psql -U postgres -c "CREATE DATABASE tablefiller_test;"
   ```

2. Verify `.env.test` points to the test database (already committed):

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tablefiller_test?schema=public"
   ```

3. Run integration tests:

   ```bash
   npm run test:integration
   ```

---

## Available Scripts

| Command                    | Description                                              |
|----------------------------|----------------------------------------------------------|
| `npm run dev`              | Start development server on port 3000                    |
| `npm run build`            | Create an optimised production build                     |
| `npm run start`            | Start the production server (requires `build` first)     |
| `npm run lint`             | Run ESLint (non-interactive, CI-safe)                    |
| `npm run lint:fix`         | Run ESLint with auto-fix                                 |
| `npm run typecheck`        | Run TypeScript type checking (`tsc --noEmit`)            |
| `npm test`                 | Run all unit tests (Jest)                                |
| `npm run test:unit`        | Run unit tests only (schedule + validation logic)        |
| `npm run test:integration` | Run API integration tests against Postgres               |
| `npm run test:e2e`         | Run Playwright E2E tests locally (headless)              |
| `npm run test:e2e:headed`  | Run Playwright E2E tests with browser visible            |
| `docker compose up -d`     | Start Postgres in the background                         |
| `docker compose down`      | Stop Postgres                                            |
