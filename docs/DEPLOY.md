# Hosting Compass in production: Supabase + Auth0 + Vercel

Compass runs as one Vercel project:

- the React app is built by Vite and served as static files, and
- the API (Hono) runs as a single Vercel Function under `/api`.

The API stores data in **Supabase Postgres** and accepts only requests carrying a valid
**Auth0** access token. Every row belongs to the Auth0 user who created it, and every
query is filtered by that user.

```
Browser ── Auth0 login ──► access token (audience = Compass API)
   │
   └── /api/* + Bearer token + X-Timezone ──► Vercel Function (Hono, Node.js 24)
                                                 ├── verifies the token (Auth0 JWKS, RS256)
                                                 └── Drizzle ──► Supabase Postgres (transaction pooler, TLS)
```

Nothing in the browser talks to Supabase directly. Row-level security is enabled on
every table with no policies, so Supabase's public Data API can't read the data even with
a project key. Only the server's own database connection can.

The deployed build refuses to run half-configured:
- The Vercel build fails if the `VITE_AUTH0_*` settings are missing.
- The function won't start without `DATABASE_URL`, `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`.
- Development shortcuts (local database, no-login local user, sample data) don't exist there.

## 1. Supabase

1. Create a project at supabase.com. Pick the region closest to you; the Vercel
   Function must run in the matching region (step 4).
   - For production, use a paid plan: free projects pause after about a week without
     activity and have no automatic backups.
2. In **Connect**, copy two connection strings, replacing `[YOUR-PASSWORD]`:
   - **Transaction pooler** (port 6543): this is `DATABASE_URL`, used by the app. It
     works over IPv4, which Vercel needs; the direct connection is IPv6-only.
   - **Session pooler** (port 5432): this is `DATABASE_MIGRATION_URL`, used only for
     schema changes. Append `?sslmode=require`.
3. For verified TLS, download the CA certificate from **Database → Settings → SSL
   configuration**. Its contents (the PEM text) become `DATABASE_CA_CERT`. Without it,
   connections are still encrypted but the server's certificate isn't checked.
4. Create the tables from your machine, with the values above in `.env.local`:
   ```bash
   pnpm db:migrate
   ```
   Run it again whenever `drizzle/` gains a new migration, before deploying the code that needs it.
5. Turn off the Data API (**Integrations → Data API**). Compass never uses it.

## 2. Auth0

1. **Applications → APIs → Create API**
   - Name: `Compass API`
   - Identifier: for example `https://compass-api`. This is the *audience*. It isn't
     called; it just has to match everywhere.
   - Signing algorithm: RS256
   - Turn on **Allow Offline Access** (needed for refresh tokens).
2. **Applications → Create Application → Single Page Application**, named `Compass`
   - Allowed Callback URLs, Allowed Logout URLs and Allowed Web Origins: your production
     URL, e.g. `https://compass.example.com`. Don't use wildcards such as
     `https://*.vercel.app`. For local development against Auth0, create a separate
     development application instead of adding `http://localhost:5173` here.
   - Refresh Token Rotation: on, with absolute and inactivity expiry.
3. Note the tenant **Domain** (e.g. `your-tenant.eu.auth0.com`) and the application's **Client ID**.
4. **Tenant settings → Environment tag: Production**. Development-tagged tenants get lower rate limits.
5. For a personal app, stop strangers from signing up: after creating your own login,
   turn on **Disable Sign Ups** for the database connection
   (Authentication → Database → Username-Password-Authentication).
6. If you later add an Auth0 custom domain, the token issuer changes. Set
   `AUTH0_DOMAIN` and `VITE_AUTH0_DOMAIN` to the custom domain.

The Auth0 MCP server in `.mcp.json` can create the application (step 2) from a Claude
Code session. Creating the API in step 1 needs permissions that weren't granted, so do
that one in the dashboard.

## 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for Production:

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL (port 6543) |
| `DATABASE_CA_CERT` | Supabase CA certificate (PEM text), for verified TLS |
| `AUTH0_DOMAIN` | e.g. `your-tenant.eu.auth0.com` |
| `AUTH0_AUDIENCE` | the API identifier, e.g. `https://compass-api` |
| `VITE_AUTH0_DOMAIN` | same as `AUTH0_DOMAIN` |
| `VITE_AUTH0_CLIENT_ID` | the SPA's Client ID |
| `VITE_AUTH0_AUDIENCE` | same as `AUTH0_AUDIENCE` |

`DATABASE_MIGRATION_URL` is only needed on the machine that runs `pnpm db:migrate`
(in `.env.local`, which is git-ignored).

`VITE_*` values are compiled into the JavaScript bundle. They are public identifiers,
not secrets; redeploy after changing them. `DATABASE_URL` and `DATABASE_CA_CERT` stay
server-side.

## 4. Vercel

The repository already has the configuration:
- `vercel.json` builds with Vite (`pnpm build` into `dist/`), routes `/api/*` to
  `api/index.ts`, and serves `index.html` for every other path (a single-page app).
- `package.json` pins Node.js `24.x` and pnpm 9.15.9.

Before the first deployment, add the function region next to your Supabase region to
`vercel.json`, for example `"regions": ["lhr1"]` for London (eu-west-2) or `["dub1"]`
for Ireland (eu-west-1). Without it, functions run in Washington, D.C., and every
query crosses the Atlantic. The Hobby plan allows one region.

With the CLI (installed and signed in):

```bash
vercel link
vercel env add DATABASE_URL production
vercel env add DATABASE_CA_CERT production
vercel env add AUTH0_DOMAIN production
vercel env add AUTH0_AUDIENCE production
vercel env add VITE_AUTH0_DOMAIN production
vercel env add VITE_AUTH0_CLIENT_ID production
vercel env add VITE_AUTH0_AUDIENCE production
vercel deploy --prod
```

`vercel link` creates the project. Or push the repository to GitHub and import it at
vercel.com/new: the framework is detected as Vite, and every push to the main branch
deploys to production.

After the first deployment:
1. Add the production URL (or custom domain) to the Auth0 application's URL lists.
2. Sign in and complete onboarding.
3. Check **Settings → Your data**.

## 5. Local development

```bash
pnpm install
pnpm dev
```

With no `.env.local`, the app runs against an in-process Postgres (PGlite) in
`./data/pglite` as a single local user, without sign-in. **Settings → Load sample data**
fills every screen. Put development Supabase/Auth0 values in `.env.local` to work against
real services; don't point development at the production database.

Schema changes:
1. edit `server/db/schema.ts`;
2. run `pnpm db:generate` to write a new folder under `drizzle/`;
3. commit it;
4. run `pnpm db:migrate` against Supabase before deploying the code that needs it.
