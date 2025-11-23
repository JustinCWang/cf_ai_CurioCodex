## CurioCodex – AI Hobby Tracker

CurioCodex is an **AI‑powered hobby tracker** that helps you catalog collections, log items with images, and get smart suggestions using **Cloudflare Workers AI**, **D1**, **KV**, **R2**, and **Vectorize**.

- **Live site**: [`https://curiocodex.jcwang27.workers.dev`](https://curiocodex.jcwang27.workers.dev)

---

## Running the app

- **1. Install dependencies**

  ```bash
  cd cf_ai_CurioCodex/curiocodex
  npm install
  ```

- **2. Local development (Vite dev server)**

  ```bash
  npm run dev
  ```

  Then open [`http://localhost:5173`](http://localhost:5173) in your browser.

- **3. Production build & preview**

  ```bash
  # Build client + worker
  npm run build

  # Preview the built app locally
  npm run preview
  ```

- **4. Deploy to Cloudflare Workers**

  Make sure you are logged into Cloudflare (`npx wrangler login`), then:

  ```bash
  npm run deploy
  ```

  This builds the app and publishes the Worker, which serves the React client and `/api/*` endpoints at your Workers subdomain (for this project: [`https://curiocodex.jcwang27.workers.dev`](https://curiocodex.jcwang27.workers.dev)).

---

## Trying it out (features & flow)

- **On the deployed site**
  - Visit [`https://curiocodex.jcwang27.workers.dev`](https://curiocodex.jcwang27.workers.dev).
  - Register a new account or log in.
  - Create one or more **hobbies** (e.g., "Vintage Cameras", "Pokemon Cards").
  - Add **items** to a hobby, optionally uploading images.
  - Explore the **Dashboard**, **Hobbies**, **Items**, **Discover**, and **Activity** pages to see AI‑generated descriptions, categories, tags, and recommendations.

- **Locally (Vite dev server)**
  - Follow the steps in **Running the app** above.
  - The same UI is available; authentication and core CRUD flows work against your configured Cloudflare resources.
  - AI‑powered helpers (text generation, tagging, and image analysis) will work as long as your Cloudflare account has Workers AI enabled and bound as described below.
  - **Vectorize‑powered “similar hobbies / items” recommendations are disabled in local dev** (see the next section).

---

## Local dev vs deployment: Vectorize & environment bindings

CurioCodex uses **Cloudflare Vectorize** to store embeddings for hobbies/items and power similarity queries. Because Vectorize does not run cleanly in all local environments (notably on Windows), the project intentionally **omits the Vectorize binding in local dev** while keeping it enabled in production.

- **How config is selected**
  - The Vite config in `vite.config.ts` chooses different Wrangler configs based on mode/command:
    - **Local dev (`npm run dev`)**: uses `wrangler.dev.json` (no `vectorize` binding).
    - **Build / deploy**: uses `wrangler.json` (full config including `vectorize`).

- **What this means in practice**
  - In **local dev** (Vite + `wrangler.dev.json`):
    - `c.env.HOBBY_ITEMS_INDEX` is **not bound**, so code that reads or writes to Vectorize is guarded.
    - Routes like "find similar hobbies/items" will simply return **empty similarity results** and log a warning (for example, when calling `HOBBY_ITEMS_INDEX.getByIds` or `.query`).
    - All other features still work (auth, CRUD, Workers AI text/image helpers, etc.).
  - In **deployment** (Worker using `wrangler.json`):
    - `HOBBY_ITEMS_INDEX` is bound to the Vectorize index defined in `wrangler.json`, and similarity search is fully enabled.
    - Creating or updating hobbies/items writes embeddings to Vectorize; similarity routes return real matches.

This split keeps **local development stable** while ensuring **full AI + Vectorize functionality in production**.

---

## Cloudflare resources & “env” configuration

Instead of a traditional `.env` file, this project relies on **Cloudflare bindings** defined in `wrangler.json` and configured in your Cloudflare account. The generated `worker-configuration.d.ts` shows the `Env` shape:

```ts
interface Env {
  SESSIONS: KVNamespace;
  DB: D1Database;
  HOBBY_ITEMS_INDEX: VectorizeIndex;
  AI: Ai;
}
```

- **Configured in `wrangler.json` (production / deploy)**
  - **Workers AI**: `ai.binding = "AI"`
  - **D1 database**: `d1_databases[0].binding = "DB"` (plus `database_name` and `database_id`)
  - **KV namespace for sessions**: `kv_namespaces[0].binding = "SESSIONS"`
  - **Vectorize index**: `vectorize[0].binding = "HOBBY_ITEMS_INDEX"` (production only; omitted from `wrangler.dev.json`)
  - **R2 bucket for item images**: `r2_buckets[0].binding = "ITEM_IMAGES"`

- **Configured in `wrangler.dev.json` (used during `npm run dev`)**
  - Same as above **except** it **does not include the `vectorize` block**, so `HOBBY_ITEMS_INDEX` is not available in dev.

- **Secrets & account configuration**
  - Your Cloudflare **account, database, KV, R2, and Vectorize resources** are configured through the Cloudflare dashboard or `wrangler` commands; no `.env` file is required for these bindings.
  - If you add client‑side configuration in the future, use standard Vite env vars (`VITE_*`) via `.env.local`, and access them in React with `import.meta.env.VITE_YOUR_KEY`.

---

## Database migrations (D1)

SQL migrations for the `curiocodex-db` D1 database live in `curiocodex/migrations`:

- `0001_initial.sql`
- `0002_add_ai_fields.sql`
- `0003_add_item_images.sql`
- `0004_hobby_item_categories.sql`

To apply them to your D1 instance, use `wrangler d1` (replace the database name/ID if needed):

```bash
cd cf_ai_CurioCodex/curiocodex
wrangler d1 migrations apply curiocodex-db
```

---

## Useful npm scripts

From `cf_ai_CurioCodex/curiocodex`:

- **`npm run dev`**: Start Vite dev server wired up to the Worker using `wrangler.dev.json` (no Vectorize).
- **`npm run build`**: Type‑check and build client + worker using `wrangler.json`.
- **`npm run preview`**: Serve the built app locally.
- **`npm run deploy`**: Deploy the Worker and assets to Cloudflare.
- **`npm run check`**: Type‑check and run a dry‑run Workers deploy.
- **`npm run lint`**: Run ESLint on the project.

Once deployed, you can always try the latest version of CurioCodex at:
[`https://curiocodex.jcwang27.workers.dev`](https://curiocodex.jcwang27.workers.dev).
