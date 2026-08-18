# Wire-it

Document real household Romex runs: labeled boxes, typed cables you can bend and color, and notes on a canvas. Dark mode for now. This is a documentation sketch, not a wiring or code guide.

**What is already built:** milestone 1 plus the palette/box tweaks — a React editor with multiple drawings, export/import, and PNG export in light or dark. **What is in progress:** [host and accounts](./MILESTONES.md) — Clerk login and Cloudflare D1 so drawings survive beyond this browser. **What comes next:** box internals, undo/redo, OAuth, and more. Details are in [PLAN.md](./PLAN.md) and [MILESTONES.md](./MILESTONES.md).

## Getting started

You need [Node.js](https://nodejs.org/) **20 or newer** (the LTS installer is fine). You do not need to know React to run this.

1. Open a terminal.
2. Go to this project folder:

   ```bash
   cd /path/to/wire-it
   ```

3. Install dependencies (first time, or after a pull):

   ```bash
   npm install
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Vite prints a local URL, usually **http://localhost:5173/**. Open that in your browser.

Stop the server with `Ctrl+C` in the terminal.

Without Clerk keys, the editor still runs and drawings autosave **in this browser only**. Use **Export → JSON** if you want a file backup.

With Clerk keys (see below), you get a login screen and cloud saves.

## How to use it

- **Palette (left):** drag a panel, 1/2/3-gang box, off-drawing stub, or note onto the canvas. Drag a device into a box. Drag a cable type onto or near a box to start a run (or click the type, then connect two boxes).
- **Canvas:** drag boxes anywhere. Each box has a short code (A, B, …). Select a cable and drag the round pressure points — runs stay at 90 degrees. Drag a cable end onto another box to move that run. End labels read like `A1` / `To B2`.
- **Inspector (right):** rename a box, set its code, gangs, and devices (or panel breaker labels), set each end’s port number, and change cable type or color.
- **Toolbar:** name the drawing, switch or create drawings, export JSON or a PNG (light or dark), import a JSON drawing.

The first launch loads a sample **Kitchen lighting** drawing so the board is not empty.

## Scripts

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local app (Worker + SPA when Cloudflare plugin is on) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm test` | Domain unit tests |
| `npm run db:migrate:local` | Apply D1 migrations to the local database |
| `npm run db:migrate` | Apply D1 migrations to the remote database |
| `npm run deploy` | Build and deploy the Worker + SPA |

## Hosting and login (you do these parts)

This repo cannot log into Cloudflare or Clerk for you. Create the accounts, put keys in gitignored local files, then the app can talk to them.

### 1. Clerk (required for login)

1. Create a free account at [clerk.com](https://clerk.com) and a new application named **Wire-it**.
2. In **User & authentication**:
   - Enable **Email** + **Password**.
   - Leave Google / OAuth **off** for now.
3. In **Restrictions** (or **Allowlist**): turn **off public sign-ups**. Invite yourself (and later others) by email.
4. In **API keys**, copy:
   - Publishable key (`pk_test_…` / later `pk_live_…`)
   - Secret key (`sk_test_…` / later `sk_live_…`)
5. Put them in two gitignored files at the repo root:

   `.env`

   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

   `.dev.vars`

   ```
   CLERK_SECRET_KEY=sk_test_...
   CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

6. In Clerk **Configure → Domains** (or allowed origins), add:
   - `http://localhost:5173`
   - `https://wire.therobhenry.com` (once DNS exists)

You can paste those two keys into chat if you want them dropped into the local files. Do **not** commit them, and do not put the secret key in GitHub.

### 2. Cloudflare (required to host and to persist)

You already use Cloudflare for DNS and the blog. This app is a Worker with static assets plus a D1 database — not a second Pages project unless you prefer that.

In a terminal on your machine (it opens a browser):

```bash
npx wrangler login
```

Then create the database and put the printed `database_id` into [wrangler.jsonc](./wrangler.jsonc):

```bash
npx wrangler d1 create wire-it
npm run db:migrate:local
```

After login works locally:

```bash
npm run db:migrate
npm run deploy
```

In the Cloudflare dashboard, add a Worker custom domain **`wire.therobhenry.com`** (CNAME on the `therobhenry.com` zone you already have). Then put production Clerk keys on the Worker:

```bash
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put CLERK_PUBLISHABLE_KEY
```

Rebuild with a **live** `VITE_CLERK_PUBLISHABLE_KEY` in `.env` before the production deploy so the login widget talks to the live Clerk instance.

### 3. What can wait

Code, the login screen, the drawings API, D1 schema, and safer browser storage. Once Clerk keys exist in `.env` / `.dev.vars`, local login works without Cloudflare. Cloud saves need `wrangler login` plus the D1 database.
