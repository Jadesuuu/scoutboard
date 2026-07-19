# ScoutBoard

A realtime small-business marketplace: browse listings, make offers, watch them land live. Built as a deliberate deep-dive into the stack I'm targeting professionally — NestJS, MongoDB, Redis, Socket.IO, Next.js, TanStack Query, and an LLM feature — with every architectural tradeoff made on purpose and named below.

## Stack

**Backend** — NestJS · MongoDB (Mongoose) · Redis (ioredis) · Socket.IO · OpenAI API · @nestjs/schedule
**Frontend** — Next.js (App Router) · TanStack Query · shadcn/ui · Tailwind · socket.io-client
**Workspace** — pnpm monorepo · Jest · GitHub Actions CI (lint, test, build on every push)

## What it does

- **Listings** — validated creation (global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`: undeclared fields are rejected loudly, so mass-assignment attempts like `views: 50000` fail at the door), browse grid, detail pages with a Redis-backed view counter.
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

**Deliberate rescopes, named.** The browse page is a card grid, not a data table — the right UI for a consumer marketplace (tables fit admin/backoffice views); sorting/filtering are client-side because the client holds the whole dataset at this size, and the migration path (server-side `manualSorting` + query params + indexed sort fields) is understood. The offer rate limit is currently a single shared bucket; keyed per-user is the correct production shape and lands with auth.

## Running locally

```bash
pnpm install

# backend — needs MongoDB and Redis running locally
cd scoutboard-backend
cp .env.example .env        # MONGODB_URI, REDIS_URL, AI_BASE_URL, AI_MODEL, AI_API_KEY, SIMULATOR_ENABLED
cd ..

pnpm -r --parallel dev      # backend :3000, frontend :3001
```

Seed data: `POST /listings/bulk` accepts an array of listings (validated per-element via `ParseArrayPipe`) — dev seeding route, would be removed or guarded in production.

## Tests & CI

Jest suite across services, gateways, and controllers on a fully mocked DI shelf — models via `getModelToken`, Redis via a custom provider token, the gateway as a stub — so the suite runs in milliseconds with no infrastructure. Tests encode design decisions, not just coverage: the failure paths assert *absence* of side effects (a rate-limited request creates nothing, increments nothing, broadcasts nothing), and the broadcast test asserts a plain object crossed the wire (a regression tripwire from a real hydrated-document bug). GitHub Actions runs lint, tests, and a production build on every push.

## Next steps

Auth (JWT guard) with per-user rate limiting · Mongo transactions around offer-create + counter-increment · LangFuse tracing on the AI calls · server-side pagination/sorting past ~100 listings · confirm-dialog on listing deletion · image uploads
