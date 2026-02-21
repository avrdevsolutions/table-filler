# Deployment Guide

## Architecture

| Layer    | Service                                             | URL                                          |
|----------|-----------------------------------------------------|----------------------------------------------|
| Frontend | [Vercel](https://vercel.com)                        | `https://pontaj.avrdevelopmentsolutions.ro`  |
| Database | [Neon](https://neon.tech) (serverless Postgres)     | managed by Neon                              |
| DNS/SSL  | [Cloudflare](https://cloudflare.com)                | `avrdevelopmentsolutions.ro`                 |

> The Next.js app handles **both** the UI and the API routes — there is no separate backend server.
> Neon is the database only.

---

## Step 1 — Neon Database

1. Sign up / log in at [neon.tech](https://neon.tech).
2. Click **New Project** → give it a name (e.g. `pontaj`).
3. Once created, go to **Dashboard → Connection Details**.
4. Copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2 — Vercel (Frontend + API)

### 2.1 Create the project

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New → Project** → import your GitHub repository.
3. Vercel auto-detects Next.js. Verify in **Project Settings → General**:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm ci`

### 2.2 Environment variables

In **Project Settings → Environment Variables**, add:

| Name               | Value                                            | Environment        |
|--------------------|--------------------------------------------------|--------------------|
| `DATABASE_URL`     | Neon connection string from Step 1               | Production         |
| `NEXTAUTH_SECRET`  | Output of `openssl rand -base64 32`              | Production         |
| `NEXTAUTH_URL`     | `https://pontaj.avrdevelopmentsolutions.ro`      | Production         |
| `COOKIE_DOMAIN`    | `.avrdevelopmentsolutions.ro`                    | Production         |
| `ALLOWED_ORIGIN`   | `https://pontaj.avrdevelopmentsolutions.ro`      | Production         |

> Generate the secret locally:
> ```bash
> openssl rand -base64 32
> ```

### 2.3 Database migrations on deploy

Already handled — `package.json` runs `prisma generate && next build` and `prisma migrate deploy` automatically on every Vercel build.

### 2.4 Add the custom domain in Vercel

1. Go to **Project Settings → Domains**.
2. Add `pontaj.avrdevelopmentsolutions.ro`.
3. Vercel will show you the DNS records to add — **do this in Cloudflare (Step 3)**.

---

## Step 3 — Cloudflare DNS

> SSL is handled by Cloudflare automatically (Universal SSL is free).

### 3.1 Add your domain to Cloudflare

1. Log in to [cloudflare.com](https://cloudflare.com).
2. Click **Add a Site** → enter `avrdevelopmentsolutions.ro`.
3. Select the **Free** plan.
4. Update the nameservers at your registrar to the two Cloudflare nameservers shown.
5. Wait for propagation (usually a few minutes, up to 24 hours).

### 3.2 Add DNS records

In **Cloudflare → DNS → Records** for `avrdevelopmentsolutions.ro`:

#### Frontend (Vercel)

| Type  | Name   | Content (Target)                  | Proxy   |
|-------|--------|-----------------------------------|---------|
| CNAME | pontaj | `cname.vercel-dns.com`            | ✅ Proxied |

> Vercel provides `cname.vercel-dns.com` as the CNAME target for custom domains.
> If Vercel gives you a different value in their UI, use that instead.

#### Verify DNS propagation

```bash
dig pontaj.avrdevelopmentsolutions.ro
# or
nslookup pontaj.avrdevelopmentsolutions.ro
```

### 3.3 SSL / TLS settings

In **Cloudflare → SSL/TLS**:

- Set encryption mode to **Full (strict)**
- Enable **Always Use HTTPS**
- Enable **Automatic HTTPS Rewrites**

---

## Step 4 — First Deployment

1. Push or merge to `main`.
2. GitHub Actions CI runs automatically — wait for all jobs to pass.
3. Vercel deploys automatically after CI is green.
4. Visit `https://pontaj.avrdevelopmentsolutions.ro` to verify.

### Deploy flow

```
Feature branch → PR → Preview deploy (Vercel, automatic)
                    ↓
              CI jobs run (GitHub Actions)
                    ↓
         All checks pass → merge allowed
                    ↓
       Merge to main → Production deploy (Vercel)
```

---

## Step 5 — Seed production data (optional)

If you need the test account in production:

```bash
# Run from your local machine against the Neon database
DATABASE_URL="<your-neon-connection-string>" npm run db:seed
```

---

## Rollback

1. Go to **Vercel → Project → Deployments**.
2. Find the last known-good deployment.
3. Click **⋯ → Promote to Production**.

---

## Environment Variables Reference

### `.env` (local development)

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="any-local-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Vercel production

```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="<strong-random-secret>"
NEXTAUTH_URL="https://pontaj.avrdevelopmentsolutions.ro"
COOKIE_DOMAIN=".avrdevelopmentsolutions.ro"
ALLOWED_ORIGIN="https://pontaj.avrdevelopmentsolutions.ro"
```

---

## Troubleshooting

| Problem                          | Fix                                                                                    |
|----------------------------------|----------------------------------------------------------------------------------------|
| `NEXTAUTH_URL` mismatch          | Must exactly match the URL users access — no trailing slash                            |
| Auth cookies not persisting      | Check `COOKIE_DOMAIN` starts with a dot: `.avrdevelopmentsolutions.ro`                |
| Vercel build fails on migrations | Ensure `postbuild` script is in `package.json` and `DATABASE_URL` is set in Vercel    |
| SSL error on custom domain       | Set Cloudflare SSL mode to **Full (strict)**, not Flexible                             |
| DNS not resolving                | Wait for propagation; run `dig pontaj.avrdevelopmentsolutions.ro` to check             |
| Neon connection timeout          | Add `?sslmode=require` to the end of the connection string                             |

