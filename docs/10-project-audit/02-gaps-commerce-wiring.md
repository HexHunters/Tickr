# Gap Analysis 02 — Commerce Wiring (does a purchase run end to end?)

**Domain:** `backend/src/modules/{payments,tickets,events}` — the order → reservation → payment → webhook → ticket → check-in chain.
**Method:** each link traced in source; the seven highest-impact claims independently re-verified line by line. `Verified` = read in code. `Inferred` = runtime effect deduced from code.
**Date:** 2026-09-15 · **Branch:** `64-frontend-design-deliverables` after merging `develop` (`21eb15d`).

---

## Summary

1. **A purchase does not run end to end.** Every Payments → Tickets call goes through a `[STUB]` adapter, so `POST /orders` never holds inventory and no webhook can ever produce a `CONFIRMED` ticket.
2. **No webhook can confirm an order today**, independently of the stub: Stripe needs `req.rawBody`, which is never enabled; Konnect and Paymee pass the gateway reference as the `orderId`, and nothing can resolve it.
3. **Even once the stub is replaced, the order → ticket link is missing**: handlers pass order-*item* ids where ticket ids are expected, and the reservation's real ticket ids are discarded.
4. **The 15-minute hold is not 15 minutes** when `ORDER_EXPIRATION_MINUTES` is set: the value arrives as a string and is *concatenated* onto the minutes.
5. The gateway integrations, commission override, check-in access control and the expiry crons are real and well built. The gaps are wiring, not design.

---

## Chain status

| Link | Works end to end? | Evidence | What is missing |
|---|---|---|---|
| **1. `POST /orders` → reserve** | 🔴 **No** | `payments.module.ts:119-122` binds `TICKET_RESERVATION_PORT` → `TicketReservationAdapter`; `ticket-reservation.adapter.ts:36-45` returns `stub-ticket-*` ids, `:48-56` confirm/cancel are log-only; `create-order.handler.ts:142-148` discards the returned ids; `tickets.module.ts:205-209` exports repositories only, not `ReserveTicketsHandler` | A real adapter over `ReserveTicketsHandler` / `ConfirmTicketsHandler` / `CancelTicketsHandler`; export them from `TicketsModule`; persist the ticket ids on the order (or the `orderId` on the tickets at reservation) |
| **2. `POST /orders/:id/pay`** | 🟡 **Partial** — gateways are real | Stripe SDK `stripe.adapter.ts:35-61` → `clientSecret`; Konnect `fetch` `konnect.adapter.ts:61-96` → `paymentUrl`; Paymee `fetch` `paymee.adapter.ts:55-82` → `paymentUrl`; factory `payment-provider-factory.adapter.ts:29-33` | Method ↔ currency validation; a guard for a missing Stripe key (`stripe.adapter.ts:38-41` builds a `null` client) |
| **3. Webhook → `CONFIRMED` ticket** | 🔴 **No** | **Stripe:** `webhooks.controller.ts:46-52` requires `req.rawBody`; `main.ts:10` is `NestFactory.create(AppModule)` with no `{ rawBody: true }` → every delivery 400s. **Konnect/Paymee:** `:124-126` / `:173-175` pass `paymentRef` as `orderId`; `confirm-payment.handler.ts:34` does `findById(orderId)`; the port has no gateway-ref lookup → `ORDER_NOT_FOUND`. **Then:** `confirm-payment.handler.ts:61-62` sends `order.items.map(i => i.id)` (order-item ids) to the stub | `rawBody: true`; `findByGatewayPaymentRef` on the order repository; carry real ticket ids |
| **4. Expiry** | 🟡 **Partial** | `order-expiration.service.ts:40-47` `@Cron` every minute, provided at `payments.module.ts:202`; `expire-orders.handler.ts:44-45` releases via the stub → no inventory effect; only `PENDING` expires (`order.entity.ts:511`; `order.repository.ts:107-108`). The ticket cron independently restores `sold_quantity` (`ticket-expiration.service.ts:63-66,131-134`) | Expire `PROCESSING` past `expiresAt`; wire the release |
| **5. Refund** | 🟡 **Partial** | Stripe real (`stripe.adapter.ts:91-100`); Paymee real (`paymee.adapter.ts:130-157`); Konnect always `success: false` (`konnect.adapter.ts:141-150`). `request-refund.handler.ts:76-95` marks the order `REFUNDED` **regardless of gateway outcome**; no ownership check; release via the stub | Ownership check; gate `REFUNDED` on gateway success; manual-refund path for Konnect |
| **6. Commission** | ✅ **Yes** | `create-order.handler.ts:125` `event.commissionRateOverride ?? this.commissionRate`; `PATCH /events/:id/commission` is `ADMIN`-guarded twice (`events.controller.ts:659-661`; `set-event-commission-override.handler.ts:42-51`); range 0–0.2 (`event.entity.ts:195`); `GET /config/public` reads the same sources (`public-config.controller.ts:80-100`) | The minimum fee is never applied — `order.entity.ts:192` is a plain percentage and `CommissionCalculator` is unused |
| **7. Check-in** | ✅ **Yes** | `check-in-ticket.handler.ts:70-79` → `resolve-event-check-in-access.handler.ts:34-65` (active + verified user; `ADMIN` / owner / active staff assignment; `PUBLISHED` required); event match `:96-102`; window `:107-125`; duplicate scan → `DuplicateCheckInAttemptedEvent` + fail (`ticket.entity.ts:380-393`); conditional `UPDATE … WHERE status='CONFIRMED'` inside a transaction (`ticket-check-in.repository.ts:25-52`) | — |
| **8. Integrity** | 🟡 **Partial** | Reserve-then-save with no transaction or compensation (`create-order.handler.ts:140-167`; `order.repository.ts:27-49`); no `@VersionColumn`; `holders.length` drives reservation (`:146`) while `quantity` drives pricing (`:113`) with no equality check; `idempotencyKey` accepted (`request.dto.ts:92-98`) but only **logged** (`process-payment.handler.ts:89`) | Transaction + compensation; persisted idempotency key with a unique index; equality validation |
| **9. Multi-currency** | 🟡 **Partial** | Order currency = first item's (`create-order.handler.ts:124`); mixed items throw inside `Money.assertSameCurrency` (`money.vo.ts:152-158`) uncaught → **500**; no method ↔ currency check (`process-payment.handler.ts:117-121`); Konnect hard-codes `× 1000` and `'TND'` (`konnect.adapter.ts:59,70`) | Validate one currency per order (400); reject TND-only gateways for non-TND orders |

---

## Findings

| # | Finding | Severity | Status | Evidence | Recommendation |
|---|---|---|---|---|---|
| C-01 | **Reservation adapter is a stub; orders never hold inventory** | 🔴 Critical | Verified | `ticket-reservation.adapter.ts:21-56`; `payments.module.ts:119-122` | Implement the adapter over the Tickets handlers; export them from `TicketsModule` |
| C-02 | **Stripe webhook always returns 400** — `rawBody` never enabled | 🔴 Critical | Verified | `webhooks.controller.ts:46-52`; `main.ts:10` | `NestFactory.create(AppModule, { rawBody: true })` |
| C-03 | **Konnect/Paymee webhooks cannot resolve the order** — gateway ref passed as `orderId`, no lookup by ref exists | 🔴 Critical | Verified | `webhooks.controller.ts:124-126,173-175`; `confirm-payment.handler.ts:34`; `order.repository.port.ts` (no ref lookup) | Add `findByGatewayPaymentRef`; resolve before `ConfirmPaymentCommand` |
| C-04 | **Order-item ids used as ticket ids; reservation ids discarded** — confirm, fail, expire and refund all pass the wrong ids | 🔴 Critical | Verified | `confirm-payment.handler.ts:61`; `fail-payment.handler.ts:67`; `expire-orders.handler.ts:44`; `request-refund.handler.ts:99`; `create-order.handler.ts:142-148` | Pass `orderId` into reservation; use `ticketRepository.findByOrderId` |
| C-05 | **Refund has no ownership check** (also [01 S-03](01-gaps-security-auth.md)) | 🔴 Critical | Verified | `request-refund.handler.ts` — `command.userId` unused | `order.userId === userId \|\| isAdmin` |
| C-06 | **Order marked `REFUNDED` even when the gateway refund fails** (Konnect always fails) | 🟠 High | Verified | `request-refund.handler.ts:76-95`; `konnect.adapter.ts:141-150` | Keep `PAID` with refund `PENDING`/`FAILED`; treat Stripe `pending` as in-flight |
| C-07 | **`ORDER_EXPIRATION_MINUTES` concatenates instead of adding.** The env value is a string (not in the Joi schema, so never coerced); `expiresAt.setMinutes(getMinutes() + "15")` yields e.g. `"2115"` → the hold lasts ~35 hours, not 15 minutes | 🟠 High | Verified (code) · Inferred (effect — deterministic JS `number + string`) | `create-order.handler.ts:44`; `order.entity.ts:197`; `app.module.ts:43-68` (no entry); `.env.example:104` | Read `payments.order.expirationMinutes` (already parsed at `payments.config.ts:12`) |
| C-08 | `holders.length` ≠ `quantity` unvalidated — a buyer can pay for 1 and reserve 10 | 🟠 High | Verified | `create-order.handler.ts:113,146`; `request.dto.ts:33-48` | Validate equality in the DTO and handler |
| C-09 | Order creation is not transactional; a save failure after reserve leaks a hold | 🟡 Medium | Verified | `create-order.handler.ts:140-167`; `order.repository.ts:27-49` | Wrap in a transaction; cancel the reservation on failure |
| C-10 | `idempotencyKey` is not enforced — concurrent `/pay` calls can create two intents | 🟡 Medium | Verified | `process-payment.handler.ts:81-97`; `payment.orm-entity.ts` (no key column) | Persist the key with a unique index; look up by key |
| C-11 | `PROCESSING` orders never expire | 🟡 Medium | Verified | `order.entity.ts:363-369,511`; `order.repository.ts:107-108` | Expire `PROCESSING` past `expiresAt` too |
| C-12 | Mixed-currency order → 500; no method ↔ currency validation | 🟡 Medium | Verified | `create-order.handler.ts:120-124`; `money.vo.ts:152-158` | 400 on mixed currency; reject unsupported method/currency pairs |
| C-13 | Minimum commission never applied; defaults disagree (`payments.config.ts:8` = 0.5 vs `.env.example:130` = 0.00) | 🟡 Medium | Verified | `order.entity.ts:192`; `CommissionCalculator` unused | Use the calculator in `OrderEntity.create`; expose the minimum in `/config/public` |
| C-14 | Webhook dedupe is an in-process `Map`; Konnect marks processed *before* confirming | 🟡 Medium | Verified · Inferred (multi-instance) | `webhook-event-store.service.ts:15-27`; `webhooks.controller.ts:110-119` | Redis `SET NX EX`; mark after successful handling |
| C-15 | Double confirmation path once wired (handler + `OrderPaidAppHandler`) | 🟢 Low | Verified | `confirm-payment.handler.ts:62`; `order-paid-app.handler.ts:42` | Keep one |
| C-16 | Fraud ticket-limit counter never released on failure/expiry | 🟢 Low | Verified | `fraud-detection.service.ts:103-104` | Decrement on `OrderFailed` / `OrderExpired` |
| C-17 | `GET /config/public` hard-codes `currency: 'TND'` | 🟢 Low (V1) · 🟠 High (V2) | Verified | `public-config.controller.ts:101` | Return the market's currency |

---

## What is solid

- **All three gateways are real HTTP integrations**, not mocks — Stripe SDK, Konnect and Paymee `fetch` calls, with Stripe/Paymee signature verification (Konnect's verifier exists but is not called — [01 S-08](01-gaps-security-auth.md)).
- **Commission override** is persisted, `ADMIN`-gated twice, range-validated, and read by both the order handler and `/config/public` from the same sources.
- **Check-in** verifies owner/admin/staff access, event match and time window, and is concurrency-safe via a conditional update in a transaction with a full audit trail. This is production-grade.
- **Ticket-side inventory** is atomic (`quantity - sold_quantity >= :qty`), and the ticket expiry cron restores it.
- **The order state machine** blocks invalid transitions; payment attempts are capped at 3.
- **Domain events** are wired correctly end to end (`eventName` = class name, `EventEmitterModule` global).

---

## Fix order

The first four are one coherent piece of work — *make one purchase real* — and should be done together, then proven by a single automated journey: reserve → pay (sandbox) → webhook → `CONFIRMED` ticket → QR → check-in → duplicate rejected.

1. **C-01** replace the stub · **C-04** carry real ticket ids · **C-02** `rawBody` · **C-03** gateway-ref lookup.
2. **C-07** — one-line fix, and without it the countdown the whole frontend is built around is wrong.
3. **C-05 · C-06 · C-08** — money correctness.
4. **C-09 · C-10 · C-14** — before more than one instance runs.
5. The rest in severity order; C-12/C-17 rise to High the day a second currency is enabled ([05](05-gaps-global-readiness.md)).

---

**Prev:** [01 — Security & auth](01-gaps-security-auth.md) · **Next:** [03 — Infrastructure & CI/CD](03-gaps-infrastructure-cicd.md) · **Index:** [README](README.md)
