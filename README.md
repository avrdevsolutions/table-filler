# Pontaj Lunar — Monthly Schedule Manager

A full-stack web application for managing monthly employee work schedules. Managers can create, edit, and export a 1920×1080 PNG image of the monthly schedule grid.

![Schedule grid](https://github.com/user-attachments/assets/bb28e0b8-e16b-40b9-9198-ae85a78487e9)

---

## Prerequisites

- **Node.js** v18 or newer
- **npm** v9 or newer

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and edit it if needed:

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

> **Production**: Replace `NEXTAUTH_SECRET` with a long random string (e.g. `openssl rand -base64 32`).

### 3. Set up the database

Create the SQLite database and apply the schema:

```bash
npm run db:push
```

### 4. (Optional) Seed a test account

Creates a ready-to-use account (`test@example.com` / `password123`):

```bash
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Creating a Schedule — Quick Workflow

1. **Register or log in** at `/login` (or use the seeded account above).
2. On the **Dashboard**, select a month and year (e.g. *Septembrie 2024*) and click **Încarcă / Creează**.
3. **Add employees** using the text field — one name per submission.
4. Use the per-row action buttons to fill in each employee's schedule:
   | Button | Action |
   |--------|--------|
   | **ZL** | Toggle work days (value `24`) |
   | **CO** | Toggle paid leave days (`CO`) |
   | **X**  | Toggle unpaid leave days (`X`) |
   | **D**  | Set a termination date — auto-fills cells with `DEMISIE` pattern |
5. The **TOTAL** column updates instantly (sum of `24`-valued cells × 24 hours).
6. Click **↑ / ↓** to reorder employees; **✕** to remove one.
7. Click **📷 Exportă PNG** to download a 1920×1080 PNG of the schedule.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create an optimised production build |
| `npm run start` | Start the production server (requires `build` first) |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Jest) |
| `npm run db:push` | Sync Prisma schema to the SQLite database |
| `npm run db:seed` | Insert the test user account |

---

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** ORM + **SQLite**
- **NextAuth.js v4** — email/password authentication (bcrypt, JWT)
- **html2canvas** — client-side PNG export

---

## Project Structure

```
src/
├── app/
│   ├── api/            # REST API routes (auth, employees, plans, cells)
│   ├── dashboard/      # Main schedule editing page
│   ├── export/[planId] # Fixed 1920×1080 export page
│   ├── login/          # Login page
│   └── register/       # Registration page
├── components/
│   ├── ScheduleGrid.tsx    # Interactive schedule table
│   ├── ScheduleTable.tsx   # Export-ready table (used by export page)
│   ├── CalendarPopup.tsx   # Day-picker popup (ZL / CO / X)
│   └── DemisieDialog.tsx   # Termination date dialog
├── lib/
│   ├── schedule.ts     # Business logic (TOTAL, DEMISIE fill, CO count)
│   ├── auth.ts         # NextAuth configuration
│   └── prisma.ts       # Prisma client singleton
└── types/index.ts      # Shared TypeScript types
```
