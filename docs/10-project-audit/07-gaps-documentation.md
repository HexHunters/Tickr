# Gap Analysis 07 — Documentation Drift

**Domain:** statements in `docs/`, `README.md`, `AGENTS.md`, `PROJECT_STATUS.md` and the Postman collection that no longer match the code.
**Method:** each row was checked on both sides (document line and code line). The 08-frontend deliverables were reviewed against source in a previous pass and are mostly correct; the drift is concentrated in the older tier.
**Date:** 2026-09-15.

---

## Summary

1. **The older documents describe a different product**: Clictopay/Edinar, NestJS 10, React 18, Zod 3, `{ data, meta }` pagination, a `/cart/*` API, `/dashboard/*` routes, an `IhebRjeb/Tickr` remote. None of these exist.
2. **Numbers are stated that nobody measures**: ">80 % coverage (~85 %)" in four documents, "1805+" and "2310+ tests" in two — the corpus has ~2,975 `it()` blocks across 227 files and no coverage collection at all.
3. **`PROJECT_STATUS.md` is three months and one merge behind**: dated June, marks CI/CD as 0 % (all three workflows exist), lists frontend files as "not created" that exist, and uses a route scheme the specification replaced.
4. **The 08-frontend deliverables have aged in three places** — two statements are corrected in this pass; the rest are line numbers.
5. **Housekeeping**: two planning documents sit unindexed at `docs/` root, `docs/README.md` does not index `08-frontend` phases 3–11 or `09-product-and-growth`, the language mix is inconsistent per tier, the licence is contradictory, and there is no `CLAUDE.md`.

---

## Statements that no longer match the code

| Document · line | Says | Reality |
|---|---|---|
| `README.md:13,111` | Payments "Clictopay / Edinar" | Konnect · Paymee · Stripe — `webhooks.controller.ts:41,99,137` |
| `README.md:53-54` | Notifications, analytics "(planned)" | 75 and 64 source files under those modules; `PROJECT_STATUS.md:383,403` says 100 % |
| `README.md:57` | "Tests (1805+ passing)" | ~2,975 `it()` across 227 files (static count) |
| `README.md:85` | "NestJS 10+" | `@nestjs/common ^11.0.1` |
| `README.md:3,172` | Repo `IhebRjeb/Tickr` | `git remote` → `HexHunters/Tickr` |
| `README.md:468,543` · `AGENTS.md:412` · `PROJECT_STATUS.md:678` | "> 80 % coverage (~85 %)" | Never collected or enforced — [04 F-08](04-gaps-frontend-testing.md) |
| `README.md` (decisions) · `docs/README.md:17` | Commission "payée par organisateur" | Added on top of the face price and paid by the buyer — locked contract `2aec158`; `order.entity.ts:192` |
| `PROJECT_STATUS.md:3` | "June 16, 2026", v2.1 | Last touched 2026-07-06; code moved through 2026-09-01 |
| `PROJECT_STATUS.md:88,644` | "192 test files (2310+ tests)" | 214 `.spec.ts` + 13 `.e2e-spec.ts` |
| `PROJECT_STATUS.md:25,32` | "48 documents", "Technical Specs (5/5)" | 64 `.md` under `docs/`; 10 files in `02-technique` |
| `PROJECT_STATUS.md:614-618` | CI/CD 0 % — `ci.yml`, `cd-staging.yml`, `cd-production.yml` ❌ | All three exist (and the CD pair cannot run — [03 I-02](03-gaps-infrastructure-cicd.md)) |
| `PROJECT_STATUS.md:499-501` | `lib/api`, `utils.ts` "Not created" | Both exist |
| `PROJECT_STATUS.md:527-540` | Routes `/auth/login`, `/dashboard/*` | Specification uses `/login`, `/organizer/*` |
| `02-api-contract.md:55-63,463-469,900-905` | Pagination `{ data, meta }` | Flat `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }` — `pagination.dto.ts:42-63` |
| `02-api-contract.md:68-80` | Error `{ statusCode, message, errors[], timestamp }` | `{ statusCode, code, message, details, timestamp, path, method }` — `all-exceptions.filter.ts:53-61` |
| `02-api-contract.md:41-42,942-963` | Sold out `409`; `/orders` rate limit `429` | `400` and `403` — `orders.controller.ts:90-93` |
| `02-api-contract.md:255,281,474,553-607,686,828-905,912` | `PATCH /users/me`, `POST /users/me/become-organizer`, `PATCH /events/:id`, `/cart/*`, `GET /tickets/me`, `/dashboard/*`, `POST /upload/image` | `PUT /users/me`; no become-organizer; `PUT /events/:id`; no cart; `GET /tickets`; `/analytics/*`; `POST /events/:id/image` |
| `01-stack-technique.md:56,286,621,628` | Zod 3.x, NestJS 10.x, React 18 | Zod `^4.1.13`, Nest `^11`, React `19.2.0` |
| `docs/README.md:4,48,54,250,270` | "February 2026"; "17 docs"; "34" vs "30" architecture tests; "46 pages" | 18 files in `03-architecture`; 34 assertions in `architecture.spec.ts`; 64 `.md` |
| `frontend/README.md:57-78` | Tree with `app/events`, `app/auth`, `components/ui`, `lib/hooks`, `types/` | None exist |
| `frontend/README.md:128` vs root badge | "proprietary" vs MIT | No `LICENSE` file at all |
| `AGENTS.md:421` | Branches `feature/*` | Actual: issue-numbered (`64-…`, `6-…`); `develop` exists |
| `AGENTS.md:145,195` | "No semicolons (frontend)"; `api-client.ts` | No frontend `.prettierrc`; 3 of 4 files use semicolons; spec names `lib/api/client.ts` |
| `docs/collections/tickr-api.postman_collection.json` | — | Missing `GET /config/public` and `PATCH /events/:id/commission`; check-in-staff routes present |

### In the 08-frontend deliverables (corrected in this pass)

| Document · line | Said | Reality | Action |
|---|---|---|---|
| `08-frontend/README.md` corrections table | "no code path emits 409" | `events.controller.ts:567` throws Nest's `ConflictException` for an events state-transition conflict | **Reworded**: sold-out is `400`; one `409` exists on the events controller |
| `08-frontend/README.md` work item 2 | "Add a machine-readable `code`" | The envelope has `code`, but for `HttpException`s it is Nest's reason phrase, not `INSUFFICIENT_AVAILABILITY` (`all-exceptions.filter.ts:55`; `orders.controller.ts:93`) | **Reworded**: "populate `code` with the domain error type" |
| `11-frontend-architecture.md` §9 | "the 24h in the api-contract doc is stale" | The contract was corrected to 7 d in a previous pass (`02-api-contract.md:27`) | **Cross-reference removed** |
| `08-frontend/README.md` line refs | `payments.module.ts:117-120`, `auth.controller.ts:154-156`, `events.controller.ts:583-584` | Now `:119-122`, `:158-160`, `:839-841`; the facts still hold | Left as-is — facts are correct, lines drift with every merge |

### Still correct (verified again)

`/api` prefix · flat pagination · envelope shape · `400`/`403` codes · JWT 7 d / 30 d · `GET /config/public` exists · shared `JwtAuthGuard extends AuthGuard('jwt')` · `paymentsConfig` registered · check-in-staff routes · `/config/public` and check-in-staff in the API contract.

---

## Housekeeping

| # | Item | Action |
|---|---|---|
| D-01 | `docs/ANALYTICS_MODULE_PLAN.md` (937 lines) and `docs/NOTIFICATIONS_MODULE_SUB_ISSUES.md` (267 lines) sit unindexed at `docs/` root | Move to `docs/archive/` |
| D-02 | `docs/README.md` does not index `08-frontend` phases 3–11, `09-product-and-growth`, or this folder | Indexed in this pass |
| D-03 | Language per tier: `01`/`04`/`05` French, `06`–`10` English, `02`/`03` mixed, root README French, `PROJECT_STATUS` English | Pick one language per tier; the newer tiers are English |
| D-04 | No `LICENSE`; root badge says MIT; `frontend/README.md` says proprietary | Decide, add the file, fix the badge |
| D-05 | No `CLAUDE.md` | Add one line: `@AGENTS.md` |
| D-06 | `PROJECT_STATUS.md` is stale enough to mislead | Either regenerate from this audit or delete and link here |

---

**Prev:** [06 — Product, legal & money ops](06-gaps-product-legal-money-ops.md) · **Next:** [08 — Global design direction](08-global-design-direction.md) · **Index:** [README](README.md)
