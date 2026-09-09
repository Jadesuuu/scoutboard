# ScoutBoard

**Live demo:** https://scoutboard-scoutboard-frontend.vercel.app — listings are seeded sample data, a simulator posts offers every few minutes, and the AI analyst runs on a small shared daily budget. First load after a quiet spell can take ~30 s while the free-tier API wakes up.

A realtime small-business marketplace: browse listings, make offers, watch them land live. Built as a deliberate deep-dive into the stack I'm targeting professionally — NestJS, MongoDB, Redis, Socket.IO, Next.js, TanStack Query, and an LLM feature — with every architectural tradeoff made on purpose and named below.

## Stack

**Backend** — NestJS · MongoDB (Mongoose) · Redis (ioredis) · Socket.IO · OpenAI API · @nestjs/schedule
**Frontend** — Next.js (App Router) · TanStack Query · shadcn/ui · Tailwind · socket.io-client
**Workspace** — pnpm monorepo · Jest · GitHub Actions CI (lint, test, build on every push)

## What it does

- **Listings** — validated creation (global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`: undeclared fields are rejected loudly, so mass-assignment attempts like `views: 50000` fail at the door), browse grid, detail pages with a Redis-backed view counter.
- **Deal metrics** — every listing carries optional owner cash flow alongside revenue, and the UI derives the figures buyers actually screen on: annual revenue, annual cash flow, asking multiple (price ÷ annual revenue) and cash-flow multiple (price ÷ annual cash flow, i.e. years to earn the price back). Browse sorts on lowest multiple and the market strip reports medians.
- **Verified financials** — a `verified` badge granted by the platform through an admin-guarded `PATCH /listings/:id/verify`, never claimable by the seller.
- **Offers** — separate feature module referencing listings by ObjectId; created via `POST /listings/:id/offers`, rate-limited, broadcast over WebSocket to every open detail page in realtime.
- **AI listing analyst** — `POST /listings/:id/analyze` returns structured JSON (verdict, fair-value range, reasoning bullets, suggested opening offer) computed from the listing's price/revenue multiple and offer activity.
- **Two cron jobs** — a reconciler (real operational work) and a market simulator (labeled demo theater — see below).

## Design decisions & tradeoffs

**Denormalized `offersCount`, with a reconciler.** The browse grid shows an offer count per listing. Counting live per render is an N+1 query; instead the count is stored on the listing and maintained with atomic `$inc` on every offer. The tax of denormalization is drift, so a scheduled `reconcileOffersCounts()` cron compares stored counts against ground truth (`countDocuments` per listing) and repairs only the drifted ones. At real scale the per-listing loop becomes a single `$group` aggregation — the loop is fine at this size and I know where the upgrade lives.

**Cache-aside on browse reads, invalidation-on-write.** `GET /listings` is cached in Redis (60s TTL). Every write that touches cached data deletes the key: creating a listing, deleting one, and — the subtle one — creating an *offer*, because `offersCount` lives inside the cached list. The AI analysis is cached per listing (1h TTL) and invalidated when a new offer changes its inputs. TTLs are the safety net bounding staleness if an invalidation path is ever missed.

**Atomicity, twice.** The view counter uses Redis `INCR` and the offer counter uses Mongo `$inc` — both because read-modify-write in application code loses updates under concurrency: two requests read the same value, both write value+1, one increment vanishes. Same principle, two engines.

**Realtime pushed into the query cache.** New offers are emitted by an `OffersGateway` (`.toObject()` before the wire — hydrated Mongoose documents don't serialize cleanly) and the frontend socket hook writes them directly into the per-listing TanStack Query cache with `setQueryData(['offers', listingId], ...)`. No refetch: the push already carries the record. Invalidate-and-refetch is reserved for writes where the client doesn't hold the authoritative result (e.g. after creating a listing).

**Provider-agnostic AI.** The analyzer talks to `AI_BASE_URL`/`AI_MODEL`/`AI_API_KEY` — OpenAI isn't named anywhere in code, so switching to a compatible provider (xAI etc.) is an env change. The model is instructed to return only JSON; the response is fence-stripped and parsed defensively with a graceful fallback. No LangChain: this is a single completion call, and orchestration frameworks earn their keep at multi-step pipelines (RAG, tool use) — the next step here would be LangFuse tracing for latency/token-cost observability.

**One honest cron, one labeled theater.** `reconcileOffersCounts` is what schedulers are actually for — reconciliation sweeps on derived data. `scheduledRandomOffer` is a **demo-mode market simulator**: it `$sample`s a random listing and creates a realistic offer (60–110% of asking) through the *real* `OffersService.create`, so validation, counters, invalidation, and broadcasts all fire. It exists so the realtime features are visible without manual input, it's gated behind `SIMULATOR_ENABLED=true`, and it goes through the front door precisely so the demo can't drift from production behavior.

**Verification is a platform decision, so it isn't a listing field.** `verified` is absent from `CreateListingDto` on purpose: if a seller could set it while creating a listing, the badge would mean nothing. It moves only through `PATCH /listings/:id/verify` behind the same `AdminKeyGuard` as the destructive routes, and the seed script calls that route as a second step after creating each listing. Cash flow is the opposite case — it *is* seller-supplied, and it's optional, because plenty of owners list before they have a clean number. Optional means genuinely absent rather than zero: the UI renders an em dash, since a `$0` cash flow reads as "this business earns nothing" instead of "not stated".

**Photography is committed, not hotlinked.** Listing and hero imagery comes from CC0 (public-domain) photos discovered through the [Openverse](https://openverse.org) API, re-encoded to width-capped WebP and committed under `scoutboard-frontend/public/photos` — about 2.6 MB for 26 images. Hotlinking a third-party CDN would have kept the repo smaller and broken the demo the day an upstream file moved. `scripts/build-photos.mjs` re-downloads and regenerates the typed manifest from `scripts/photo-sources.json`, so the choice stays auditable; CC0 waives attribution but the photographers are credited at `/credits` anyway. Photos are matched to a listing by keywords in its *name* rather than its industry, because "Harbor Street Laundromat" and "Ledger Lane Bookkeeping" are both `services` and should not share a picture.

**Deliberate rescopes, named.** The browse page is a card grid, not a data table — the right UI for a consumer marketplace (tables fit admin/backoffice views); sorting/filtering are client-side because the client holds the whole dataset at this size, and the migration path (server-side `manualSorting` + query params + indexed sort fields) is understood. The offer rate limit is currently a single shared bucket; keyed per-user is the correct production shape and lands with auth.

## Prerequisites

- **Node.js 20+** and **pnpm 10+**
- **MongoDB** running locally (or any connection string — Atlas works)
- **Redis** running locally
  - Windows: [Memurai](https://www.memurai.com/) — a Redis-compatible service for Windows
  - macOS: `brew install redis && brew services start redis`
  - Linux: `sudo apt install redis-server`
- An **OpenAI-compatible API key** for the summary endpoint (optional — the app runs without it; the summary endpoint returns a graceful fallback)

## Running locally

```bash
pnpm install

# backend — needs MongoDB and Redis running locally
cd scoutboard-backend
cp .env.example .env        # MONGODB_URI, REDIS_URL, AI_*, SIMULATOR_ENABLED, CORS_ORIGIN, ADMIN_API_KEY
cd ../scoutboard-frontend
cp .env.example .env        # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DEMO_MODE
cd ..

pnpm -r --parallel dev      # backend :3000, frontend :3001
pnpm --filter scoutboard-backend seed   # 12 realistic listings via the real POST /listings endpoint
```

Seeding creates each listing through `POST /listings`, then grants the verified
badge to eight of the twelve through `PATCH /listings/:id/verify`. If the API has
`ADMIN_API_KEY` set, give the seed the same value so the verify calls are accepted:

```bash
ADMIN_API_KEY=<same-as-api> pnpm --filter scoutboard-backend seed
```

Listings seeded before `monthlyCashFlow` and `verified` existed keep working —
the cash-flow figures render as em dashes and no badge shows. Re-seeding gets the
new fields populated on a fresh database.

**Repairing a database you don't want to re-seed** (the deployed demo, say, where
re-seeding would duplicate every listing and drop the offers already attached to
them): `backfill-cashflow.mjs` fills in `monthlyCashFlow` in place, which is all
the annual cash flow, cash-flow multiple, and margin figures are derived from. It
talks to MongoDB directly, since no route edits a listing's financials, and needs
no redeploy — the browse cache expires on its own within 60 s.

```bash
cd scoutboard-backend
pnpm backfill:cashflow            # dry run, writes nothing
pnpm backfill:cashflow --apply    # write
```

It reads `MONGODB_URI` from the environment, falling back to the API's own `.env`
so the connection string can stay in the file that already holds it rather than
going onto a command line and into shell history. To repair the deployed demo,
point that at the Atlas string from the Render service and put it back afterwards.

If the driver fails with `querySrv ECONNREFUSED`, the local resolver is refusing
the SRV lookup that `mongodb+srv://` depends on — ordinary hostname lookups can
still work, so this is easy to mistake for the cluster being down. Route the
lookup elsewhere: `DNS_SERVERS=1.1.1.1,8.8.8.8 pnpm backfill:cashflow`.

Listings whose titles match the seed catalogue get the authored figure back; the
rest get an industry-typical margin applied to their own monthly revenue, so a
UI-created listing lands in the same range instead of reading as an outlier. Both
are deterministic — re-running never yields a different number. Anything with no
revenue to derive from is left alone and reported, because a missing figure beats
an invented one. Add `--overwrite` to recompute listings that already have a value.

## Deploying (Vercel + Render)

The frontend is a normal Next.js app and deploys to **Vercel**. The API can't live there: Socket.IO needs a long-lived process and `@nestjs/schedule` needs a server that stays up, neither of which serverless functions provide. So the API runs on **Render** (or Railway/Fly), with **MongoDB Atlas** (free M0) and **Upstash** or **Redis Cloud** (free tier, `rediss://` works out of the box with ioredis).

1. **Data stores.** Create an Atlas cluster (allow access from anywhere, Render's IPs rotate) and a Redis instance. Copy both connection strings.
2. **API on Render.** New → Blueprint → this repo; `render.yaml` at the root defines the service. Fill in `MONGODB_URI`, `REDIS_URL`, `AI_API_KEY` (optional) and, after step 3, `CORS_ORIGIN`. `ADMIN_API_KEY` is auto-generated.
3. **Frontend on Vercel.** Import the repo, set **Root Directory** to `scoutboard-frontend`, add `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com` and `NEXT_PUBLIC_DEMO_MODE=true`. Vercel picks up pnpm from the lockfile; set `ENABLE_EXPERIMENTAL_COREPACK=1` if it doesn't honour the `packageManager` pin.
4. **Wire CORS.** Put the Vercel URL into the API's `CORS_ORIGIN` (comma-separate a custom domain or preview URL if needed). Both Express and the Socket.IO gateways read the same list.
5. **Seed.** `API_URL=https://<render-url> pnpm --filter scoutboard-backend seed`.

**Keeping the AI bill bounded on a public URL.** The key never leaves the API host. `AI_DAILY_LIMIT` caps *total* outbound completions per UTC day across all visitors (Redis `INCR` on a date-stamped key that self-expires); once spent, the endpoint returns a plain-language message instead of calling the model, and the UI shows it. `AI_CACHE_TTL_SECONDS` stretches the per-listing cache (24 h in the blueprint) so repeat clicks are free. Pair that with a hard monthly spend limit on the provider dashboard and a cheap model. Leave `AI_API_KEY` empty and the feature degrades to "not configured" without touching the network.

**Public-safety switches.** `NEXT_PUBLIC_DEMO_MODE=true` shows the seeded-data banner and hides the Delete button; server-side, `ADMIN_API_KEY` makes `DELETE /listings/:id/delete` require a matching `x-admin-key` header, so a visitor can't wipe the seed set. Creating listings and offers stays open on purpose: the demo is meant to be used, and offers are already rate-limited.

## Tests & CI

Jest suite across services, gateways, and controllers on a fully mocked DI shelf — models via `getModelToken`, Redis via a custom provider token, the gateway as a stub — so the suite runs in milliseconds with no infrastructure. Tests encode design decisions, not just coverage: the failure paths assert *absence* of side effects (a rate-limited request creates nothing, increments nothing, broadcasts nothing), and the broadcast test asserts a plain object crossed the wire (a regression tripwire from a real hydrated-document bug). GitHub Actions runs lint, tests, and a production build on every push.

## Next steps

Auth (JWT guard) with per-user rate limiting · Mongo transactions around offer-create + counter-increment · LangFuse tracing on the AI calls · server-side pagination/sorting past ~100 listings · confirm-dialog on listing deletion · image uploads
