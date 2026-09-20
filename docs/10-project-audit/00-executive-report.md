# Tickr — Full Project Audit & Global Design Direction

**Prepared:** 2026-09-15 · **Branch:** `64-frontend-design-deliverables`, after merging `develop` (`21eb15d`).
**What this is:** a code-level audit of the whole repository — backend, infrastructure, CI/CD, frontend, tests, documentation — plus a design direction for Tickr as a multi-market product. Every finding was read in source and cites `file:line`; the highest-impact claims were independently re-verified before inclusion.
**What this is not:** a runtime penetration test or a load test. Where a finding is a static reading of code whose runtime effect is deduced, it says so.

---

## Contents

| | Section | File |
|---|---|---|
| 1 | [The one-page verdict](#1-the-one-page-verdict) | — |
| 2 | [What changed since the last audit](#2-what-changed-since-the-last-audit) | — |
| 3 | [The blockers, ranked](#3-the-blockers-ranked) | — |
| 4 | [Gap analysis by domain](#4-gap-analysis-by-domain) | [01](01-gaps-security-auth.md) · [02](02-gaps-commerce-wiring.md) · [03](03-gaps-infrastructure-cicd.md) · [04](04-gaps-frontend-testing.md) · [05](05-gaps-global-readiness.md) · [06](06-gaps-product-legal-money-ops.md) · [07](07-gaps-documentation.md) |
| 5 | [Global design direction — summary](#5-global-design-direction--summary) | [08](08-global-design-direction.md) · [10 visual](10-global-design-direction-visual.md) |
| 6 | [Recommended sequence](#6-recommended-sequence) | [09 — Remediation plan](09-remediation-plan.md) |
| 7 | [What is genuinely strong](#7-what-is-genuinely-strong) | — |
| 8 | [Method and confidence](#8-method-and-confidence) | — |

---

## 1. The one-page verdict

**Tickr is a well-architected platform that cannot yet sell a ticket.** The hexagonal structure, domain model, money value objects, check-in system, gateway integrations and the design specification are all genuinely good. But the seams between modules were never finished, and the seams are where the money moves.

Five facts, each verified in source, define the current state:

1. **A purchase does not complete.** `POST /orders` reserves tickets through a `[STUB]` adapter that returns mock ids; no webhook can confirm an order (Stripe never receives a raw body; Konnect and Paymee hand the handler a gateway reference it cannot look up); and even once wired, the handlers pass order-*item* ids where ticket ids belong. ([02](02-gaps-commerce-wiring.md))
2. **A production database cannot take an order.** No migration creates the `payments` or `analytics` tables, the root TypeORM config registers only the events/tickets entities with no `autoLoadEntities`, nothing runs migrations on deploy, and the migration CLI cannot run inside the production image. Development is masked by `synchronize: true`. ([03](03-gaps-infrastructure-cicd.md))
3. **Both deployment workflows are dead at their first job** — they call `ci.yml` as a reusable workflow that has no `workflow_call` trigger. ([03](03-gaps-infrastructure-cicd.md))
4. **Four Critical authorization holes**: any signed-in user can confirm any reserved ticket, cancel any ticket, read any ticket with its QR code and holder contacts, and refund any order. ([01](01-gaps-security-auth.md))
5. **No account can log in.** Registration never mints the verification token, the login policy requires it, and no resend endpoint exists. ([01](01-gaps-security-auth.md))

And one number: with `ORDER_EXPIRATION_MINUTES` set as documented, **the "15-minute hold" lasts about 35 hours** — the value arrives as a string and is concatenated onto the minutes. ([02 C-07](02-gaps-commerce-wiring.md))

None of this contradicts the product handoff's own readiness statement ("structurally strong but not launch-ready"). It sharpens it: the handoff names five P0 areas; the code shows roughly twenty distinct defects behind them, plus three the handoff does not mention (the database, the CD trigger, the IDORs).

**The frontend is a scaffold** — 302 lines, one route, zero design tokens — on top of a complete, backend-aligned specification. That is the right order; nothing there is wasted.

---

## 2. What changed since the last audit

The `develop` merge brought real progress. Three items previously recorded as blockers are **closed**:

| Previously flagged | Now |
|---|---|
| `GET /config/public` did not exist | ✅ Exists (`public-config.controller.ts:54-62`), returns global and per-event commission, TTL, currency |
| Shared `JwtAuthGuard` never verified a JWT | ✅ Extends `AuthGuard('jwt')`, rejects non-access tokens, pins HS256 |
| `payments.config.ts` unregistered with a 4 % default | ✅ Registered in `ConfigModule.load`; default corrected to 0.06 |

Two new features landed **well built**: per-event commission override (`ADMIN`-gated twice, range-validated, read consistently by the order handler and `/config/public`) and check-in staff assignments (the best-guarded surface in the codebase — access resolved against a live, active, verified user; concurrency-safe duplicate rejection; full audit trail).

Two blockers **remain exactly as before**: the reservation stub and the un-minted verification token. The V1 pricing contract was **locked** (face price in, fee on top — matching the design), and the roadmap now states expansion is **market by market**, which this report's design direction follows.

---

## 3. The blockers, ranked

Ranked by *what it costs to ship without it*, not by how hard it is to fix. The first six are each a day or less of work.

| Rank | Blocker | File · ID | Effort | Why this rank |
|---|---|---|---|---|
| 1 | Replace the reservation stub; carry real ticket ids through confirm/fail/expire/refund | [02](02-gaps-commerce-wiring.md) C-01, C-04 | 2–3 d | Without it nothing else in the money path can even be tested |
| 2 | Enable `rawBody`; add a gateway-reference lookup for Konnect/Paymee | [02](02-gaps-commerce-wiring.md) C-02, C-03 | ½ d | No order can ever confirm |
| 3 | Generate the missing `payments`/`analytics` migrations; `autoLoadEntities`; run migrations on deploy | [03](03-gaps-infrastructure-cicd.md) I-03, I-04, I-05 | 1–2 d | A fresh production database cannot store an order |
| 4 | Close the four IDORs | [01](01-gaps-security-auth.md) S-01…S-04 | 1 d | Cannot put a beta user in front of it |
| 5 | Mint and send the verification token; add resend | [01](01-gaps-security-auth.md) S-09 | 1 d | Nobody can log in |
| 6 | Read `ORDER_EXPIRATION_MINUTES` from the parsed config | [02](02-gaps-commerce-wiring.md) C-07 | 10 min | The countdown the whole frontend is built around is wrong |
| 7 | `workflow_call:` in `ci.yml`; commit the changelog config | [03](03-gaps-infrastructure-cicd.md) I-02 | ½ d | Nothing can deploy |
| 8 | Health-check path, nginx proxy, frontend API URL build-arg | [03](03-gaps-infrastructure-cicd.md) I-06…I-08 | 1 d | A deploy would fail its own checks |
| 9 | Refund: ownership, gate `REFUNDED` on gateway success, Konnect manual path | [02](02-gaps-commerce-wiring.md) C-05, C-06 | 1 d | Money leaves the wrong pocket |
| 10 | Analytics and notifications scoping (`@CurrentUser('id')` → `'userId'`) | [01](01-gaps-security-auth.md) S-05…S-07 | 1 d | Data leaks across organizers and users |
| 11 | Konnect webhook authentication | [01](01-gaps-security-auth.md) S-08 | ½ d | Before any Konnect money moves |
| 12 | Refresh-token rotation and revocation | [01](01-gaps-security-auth.md) S-10, S-11 | 2 d | Before scale |
| 13 | Redis-backed webhook dedupe and cron locks | [03](03-gaps-infrastructure-cicd.md) I-09 | 1 d | Before a second instance |
| 14 | Organizer payout model — a **decision**, then a ledger | [06](06-gaps-product-legal-money-ops.md) P-01 | product | Blocks live money at scale; the economic-model doc still contradicts the code |
| 15 | Legal documents + consent capture | [06](06-gaps-product-legal-money-ops.md) P-04 | legal | Blocks any public launch |

Everything from rank 1 to 8 is **under two weeks of engineering** and turns "cannot sell a ticket" into "can sell a ticket in Tunisia through a sandbox". That is the whole game for the next sprint.

---

## 4. Gap analysis by domain

| File | Domain | Findings | Critical | High | The one-line reading |
|---|---|---|---|---|---|
| [01](01-gaps-security-auth.md) | Security, auth, API hygiene | 21 | 4 | 6 | Guards are sound; authorization *inside handlers* is the weak layer |
| [02](02-gaps-commerce-wiring.md) | Commerce wiring | 17 | 5 | 3 | Gateways and check-in are real; the seams between modules are stubs |
| [03](03-gaps-infrastructure-cicd.md) | Infrastructure, CI/CD, ops | 18 | 4 | 6 | Good Dockerfiles and CI graph; no IaC, dead CD, missing migrations, single-instance state |
| [04](04-gaps-frontend-testing.md) | Frontend & test health | 13 | 0 | 3 | A scaffold on a correct foundation; coverage is claimed, not measured |
| [05](05-gaps-global-readiness.md) | Multi-market readiness | 15 | 0 | 5 | Money VOs are ~60 % ready; every edge (adapters, analytics, locale, timezone, identity) is Tunisia-only |
| [06](06-gaps-product-legal-money-ops.md) | Product, legal, money ops | 12 | 3 | 5 | Payout undecided, refund policy undefined, nothing legal in the repo |
| [07](07-gaps-documentation.md) | Documentation drift | 24 + 6 | — | — | The older tier describes a different product; numbers are stated that nobody measures |

Severity counts are per file; an item recorded in two files (e.g. refund ownership) is counted in both.

---

## 5. Global design direction — summary

The full direction is [08 — Chaux & Faïence](08-global-design-direction.md); the images are in
[10](10-global-design-direction-visual.md). The first palette (cobalt/sun) was rejected by the client;
the replacement was chosen from four independent pastel concepts by a three-judge panel and then
hardened — **124 text/UI pairs computed, zero failures**.

**The idea:** an afternoon walk from Sidi Bou Saïd to the water — chalk canvas, one door-blue that is
the only thing you can press, ten Nabeul glazes for categories, a clay accent for scarcity. The
organizer's poster is the only saturated object on any screen; checkout is a bare wall.

| Area | Decision |
|---|---|
| **Colour** | Pastels are surfaces, chips and stubs; every pastel carries a computed deep ink; white text exists on three fills only. `ink-support` and `border-strong` retuned to pass on every glaze |
| **Night** | Ink-tinted night-blue darks, chalk text, and the *lit-door* button (pale blue with night-ink text) — the only structure that passes both text and edge contrast |
| **Categories** | Ten glazes, min ΔE 7.9, always with label + icon + kernel dot; selected/hover states by density toward the ink, never a new hue |
| **Motifs** | Chalk mat, torn stub, faïence star, door arch, iron studs, sun-fade, ink stamp, tile frieze, kernel dot — all drawable, all used in the mockups |
| **Type** | Fraunces + Manrope · El Messiri + Readex Pro · Frank Ruhl Libre + Assistant · Literata for Cyrillic/Greek display · Rubik → Noto fallback; "bitter numerals" for headline money |
| **Global** | Logical-properties RTL (sun-fade from inline-start, stamp rotation flips), `Intl` money/time, WCAG 2.2 AA, typed `MarketConfig`; the accent-slot mechanism is retired — market energy comes from the glazes |

## 6. Recommended sequence

**Sprint 1 — make one purchase real (ranks 1–8).** Replace the stub, wire the webhooks, generate the migrations, close the IDORs, send the email, fix the minutes, unblock CD, align the health checks. Prove it with one automated journey: reserve → sandbox pay → webhook → `CONFIRMED` ticket → QR → check-in → duplicate rejected. Until that test is green, no other engineering work has a way to be verified.

**Sprint 2 — make it safe (ranks 9–13).** Refund correctness, scoping leaks, Konnect webhook auth, token rotation, Redis-backed state. Coverage gate turned on ([04 F-08](04-gaps-frontend-testing.md)). Then the first frontend PR — the API client and the design tokens, straight from the deliverables.

**In parallel — decide (ranks 14–15).** Payout model, refund policy, legal documents. These are not engineering; they gate live money.

**Before the second market — the cheap V1 items the brief already asks for** ([05](05-gaps-global-readiness.md)): `timestamptz` + `TZ=UTC` + `events.timezone`, phone consistency, externalised strings, reserved tax and consent columns, and the two currency guards that are correctness bugs the day EUR is enabled.

---

## 7. What is genuinely strong

It would be a misreading of this report to conclude the codebase is poor. It is unusually well *structured* for its stage:

- **Hexagonal boundaries are real and lint-enforced**, with 34 architecture fitness assertions in CI.
- **The money value objects are right** — currency metadata drives decimals, rounding and smallest-unit conversion; the Stripe adapter uses them correctly.
- **All three gateways are real HTTP integrations** with signature verification on two of them.
- **The check-in system is production-grade**: access resolution against live user state, a conditional update inside a transaction, an audit trail for concurrent losers.
- **Commission override** is persisted, double-gated, range-validated and consistently read.
- **The Dockerfiles and the CI job graph** are correct in shape; the local compose stack is rich and health-gated.
- **The design specification** (Phases 1–11) is complete, backend-aligned, and was itself corrected three times against source; the frontend team is not waiting on design.
- **The product handoff's self-assessment is honest** — its blocker list matches what the code shows.

The gap is not quality of thinking. It is that the last 10 % of wiring — the part that only matters when real money moves — has not been done, and the documents claim more than the code delivers.

---

## 8. Method and confidence

- Five independent audits, one per domain, each restricted to reading source under `backend/src`, `frontend/`, `infrastructure/`, `.github/`, `docs/`. Roughly 180 tool calls, every claim cited.
- The **sixteen highest-impact claims were re-verified by hand** before this report was written — the stub, `rawBody`, the gateway-ref lookup, the four IDORs, the `@CurrentUser('id')` mismatch, the minutes concatenation, the dead CD trigger, the missing migrations, the entity registration, the health path, the timestamp type, the phone regex, the `'TND'` literal, the frontend API base.
- Two claims are **inferred**, not observed: the TypeORM `EntityMetadataNotFound` at runtime (the configuration gap is verified; a fresh-DB integration test would settle it) and the ~35-hour hold (the string concatenation is deterministic JavaScript; the env value being a string follows from its absence in the Joi schema).
- **Not done**: no test suite was executed end to end (no `node_modules` in the backend; the CI runner is the right place), no penetration test, no load test, no runtime tracing. Counts of tests are static file counts.
- **Bias declared**: the design specification audited in [04](04-gaps-frontend-testing.md)/[07](07-gaps-documentation.md) was written by the same process that wrote this report. Two of its statements were found wrong and are corrected in this pass; line numbers in it drift with every merge.

---

**Index:** [README](README.md) · **Start here for engineering:** [09 — Remediation plan](09-remediation-plan.md) · **Start here for design:** [10 — Visual direction](10-global-design-direction-visual.md)
