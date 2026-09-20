# Remediation Plan — Proposed Fixes, in Order

**Scope:** concrete fixes for every blocker ranked in the [executive report §3](00-executive-report.md#3-the-blockers-ranked), plus the High items behind them. Each fix names the file, shows the change, and states the test that proves it.
**Ground rule:** the fixes follow the existing hexagonal structure — ports stay ports, adapters stay adapters, handlers keep returning `Result`. Nothing here introduces a new framework or a new pattern.
**Date:** 2026-09-15 · line numbers as of `21eb15d`.

---

## Contents

| Sprint | Fixes | Outcome |
|---|---|---|
| [Sprint 1 — make one purchase real](#sprint-1--make-one-purchase-real) | R-01 … R-08 | A ticket can be bought in Tunisia through a sandbox and scanned at a door |
| [Sprint 2 — make it safe](#sprint-2--make-it-safe) | R-09 … R-14 | Money cannot leave the wrong pocket; data cannot leak across users; a second instance can run |
| [In parallel — decide](#in-parallel--decide) | R-15 … R-17 | The commercial and legal prerequisites for live money |
| [Before the second market](#before-the-second-market) | R-18 … R-22 | The cheap V1 items the brief already asks for |
| [The proof](#the-proof--one-journey-test) | — | One automated journey that gates everything above |

---

## Sprint 1 — make one purchase real

### R-01 · Replace the reservation stub with a real cross-module adapter
**Fixes** [02 C-01](02-gaps-commerce-wiring.md) · **Effort** 1–2 d · **Owner** backend

Today `payments.module.ts:119-122` binds `TICKET_RESERVATION_PORT` to `TicketReservationAdapter`, whose three methods log `[STUB]`. `TicketsModule` exports only repository tokens (`tickets.module.ts:205-209`), so the adapter has nothing to call.

**1. Export a facade from the Tickets module** (keeps handlers internal, exposes one intent-level surface):

```ts
// modules/tickets/application/services/ticket-reservation.facade.ts
@Injectable()
export class TicketReservationFacade {
  constructor(
    private readonly reserve: ReserveTicketsHandler,
    private readonly confirm: ConfirmTicketsHandler,
    private readonly cancel: CancelTicketsHandler,
    @Inject(TICKET_REPOSITORY) private readonly tickets: TicketRepositoryPort,
  ) {}

  async reserveForOrder(cmd: ReserveTicketsCommand & { orderId: string }) {
    const r = await this.reserve.execute(cmd);           // atomic sold_quantity decrement lives here
    if (r.isFailure) throw new ReservationFailedError(r.error!.type, r.error!.message);
    return r.value;                                       // { ticketIds, reservedUntil }
  }
  async confirmForOrder(orderId: string) {
    const ids = (await this.tickets.findByOrderId(orderId)).map((t) => t.id);
    return this.confirm.execute(new ConfirmTicketsCommand(ids, orderId));
  }
  async releaseForOrder(orderId: string) {
    const ids = (await this.tickets.findByOrderId(orderId)).map((t) => t.id);
    return this.cancel.execute(new CancelTicketsCommand(ids, 'ORDER_RELEASED'));
  }
}
// tickets.module.ts → providers: [..., TicketReservationFacade], exports: [TICKET_REPOSITORY, CHECK_IN_REPOSITORY, TicketReservationFacade]
```

**2. Stamp the `orderId` on tickets at reservation time** so `findByOrderId` works before confirmation. `ReserveTicketsCommand` (`reserve-tickets.command.ts:42-51`) gains an optional `orderId`; `createReservation` (`reserve-tickets.handler.ts:121-131`) passes it into `TicketEntity.create`. The order id already exists before reservation — `OrderEntity.create` assigns it (`create-order.handler.ts:120-137`).

**3. Make the adapter real** — same port, real calls:

```ts
// modules/payments/infrastructure/adapters/ticket-reservation.adapter.ts
@Injectable()
export class TicketReservationAdapter implements TicketReservationPort {
  constructor(private readonly facade: TicketReservationFacade) {}
  reserveTickets(eventId, ticketTypeId, userId, quantity, holders, orderId) {
    return this.facade.reserveForOrder(new ReserveTicketsCommand(eventId, ticketTypeId, userId, holders, orderId));
  }
  confirmTickets(_ids: string[], orderId: string) { return this.facade.confirmForOrder(orderId); }
  cancelReservations(_ids: string[], orderId: string) { return this.facade.releaseForOrder(orderId); }
}
// payments.module.ts → imports: [..., TicketsModule]
```

The port gains `orderId` on all three methods (a widening change; the stub-era `ticketIds` parameter can be kept and ignored).

**Proof:** integration test — `POST /orders` → `SELECT count(*) FROM tickets.tickets WHERE order_id = $1` equals the quantity, and `ticket_types.sold_quantity` decreased by the same number.

---

### R-02 · Carry real ticket ids through confirm / fail / expire / refund
**Fixes** [02 C-04](02-gaps-commerce-wiring.md) · **Effort** ½ d · **Owner** backend

Four handlers pass `order.items.map((i) => i.id)` — order-*item* ids — where ticket ids are expected (`confirm-payment.handler.ts:61`; `fail-payment.handler.ts:67`; `expire-orders.handler.ts:44`; `request-refund.handler.ts:99`). With R-01 the adapter resolves tickets by `orderId`, so every call site becomes:

```ts
await this.ticketReservation.confirmTickets([], order.id);   // confirm-payment
await this.ticketReservation.cancelReservations([], order.id); // fail · expire · refund
```

Also delete the duplicate confirm in `order-paid-app.handler.ts:41-42` — one confirmation path ([02 C-15](02-gaps-commerce-wiring.md)).

---

### R-03 · Let the Stripe webhook receive a raw body
**Fixes** [02 C-02](02-gaps-commerce-wiring.md) · **Effort** 10 min · **Owner** backend

```ts
// main.ts:10
const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
```

`webhooks.controller.ts:46-55` already reads `req.rawBody` and calls `provider.verifyWebhook(signature, rawBody)` — nothing else changes.
**Proof:** e2e test posts a Stripe-signed payload built with `stripe.webhooks.generateTestHeaderString` and expects `200`.

---

### R-04 · Resolve Konnect / Paymee orders by gateway reference
**Fixes** [02 C-03](02-gaps-commerce-wiring.md) · **Effort** ½ d · **Owner** backend

`webhooks.controller.ts:124-131` (and `:173-178` for Paymee) passes `paymentRef` as the `orderId`; `confirm-payment.handler.ts:34` does `findById`. The order already stores the reference (`order.orm-entity.ts:62` `gateway_payment_ref`).

```ts
// application/ports/order.repository.port.ts
findByGatewayPaymentRef(ref: string): Promise<OrderEntity | null>;

// infrastructure/persistence/repositories/order.repository.ts
async findByGatewayPaymentRef(ref: string) {
  const row = await this.repo.findOne({ where: { gatewayPaymentRef: ref }, relations: ['items'] });
  return row ? OrderMapper.toDomain(row) : null;
}

// webhooks.controller.ts — both TN handlers
const order = await this.orderRepository.findByGatewayPaymentRef(paymentRef);
if (!order) { this.logger.warn(`No order for ref ${paymentRef}`); return { received: true }; }
await this.handlePaymentSuccess(order.id, paymentRef, paymentResult.transactionId, {...});
```

Add a unique index on `gateway_payment_ref` in the same migration as R-06.
**Proof:** e2e — create order, call `/pay` with `KONNECT` (adapter mocked to return a ref), hit `GET /payments/webhooks/konnect?payment_ref=<ref>` → order `PAID`, tickets `CONFIRMED`.

---

### R-05 · Read the expiry minutes from the parsed config
**Fixes** [02 C-07](02-gaps-commerce-wiring.md) · **Effort** 10 min · **Owner** backend

```ts
// create-order.handler.ts:44
this.expirationMinutes = this.configService.get<number>('payments.order.expirationMinutes') ?? 15;
```

`payments.config.ts:12` already `parseInt`s it. Remove the raw `ORDER_EXPIRATION_MINUTES` read, and add the key to the Joi schema so a bad value fails at boot.
**Proof:** unit test — with `ORDER_EXPIRATION_MINUTES="15"` in env, `order.expiresAt - order.createdAt` is 900 000 ms, not ~35 h.

---

### R-06 · A production database that can take an order
**Fixes** [03 I-03 · I-04 · I-05](03-gaps-infrastructure-cicd.md) · **Effort** 1–2 d · **Owner** backend + ops

```ts
// shared/infrastructure/database/database.module.ts:27
autoLoadEntities: true,          // replaces the hand-maintained list — forFeature() entities register themselves
```

Then generate what is missing and make it runnable in production:

```bash
npm run migration:generate -- src/shared/infrastructure/database/migrations/CreatePaymentsAndAnalyticsTables
```

```ts
// data-source.ts — compiled paths so the CLI runs inside the image
entities:   [__dirname + '/../../../modules/**/infrastructure/persistence/entities/*.orm-entity.{ts,js}'],
migrations: [__dirname + '/migrations/*.{ts,js}'],
```

```json
// backend/package.json
"migration:run:prod": "typeorm migration:run -d dist/shared/infrastructure/database/data-source.js"
```

Run it as a **pre-deploy ECS task** (or an init container) in both CD workflows before the service update. Add a CI job that runs `migration:generate` against a migrated database and fails if the diff is non-empty.
**Proof:** a fresh Postgres, `migration:run`, then the R-01 integration test passes without `synchronize`.

---

### R-07 · Close the four IDORs
**Fixes** [01 S-01 … S-04](01-gaps-security-auth.md) · **Effort** 1 d · **Owner** backend

| Route | Change |
|---|---|
| `POST /tickets/confirm` (`tickets.controller.ts:173`) | **Delete the route.** Confirmation is internal (R-01/R-02). If an operator path is ever needed, `@Roles('ADMIN')` and assert `order.status === PAID` |
| `POST /tickets/cancel` (`:408-414`) | `new CancelTicketsCommand(dto.ticketIds, dto.reason, user.userId)`; in the handler, reject any ticket where `ticket.userId !== command.userId` unless the caller organizes its event |
| `GET /tickets/:id` (`get-ticket-by-id.handler.ts:44-56`) | Replace the fall-through with a real check: `if (!isOwner && event.organizerId !== query.requestingUserId) return Result.fail({ type: 'ACCESS_DENIED' })`. The tickets-side event adapter must expose `organizerId` (`tickets/…/event-query.adapter.ts:47-51`) |
| `POST /orders/:id/refund` (`request-refund.handler.ts:34`) | After `findById`: `if (order.userId !== command.userId && !command.isAdmin) return Result.fail({ type: 'ACCESS_DENIED' })` |

**Proof:** four e2e tests, each with a second user's token, each expecting `403`.

---

### R-08 · Mint and send the verification token; add resend
**Fixes** [01 S-09](01-gaps-security-auth.md) · **Effort** 1 d · **Owner** backend

The event already carries the token (`user-registered.event.ts:15`); the controller's issuance is commented out (`auth.controller.ts:158-160`); the notifications listener sends `WELCOME` without it.

```ts
// auth.controller.ts:158 — uncomment and persist
const token = this.tokenService.generateToken(32);
await this.verificationTokenRepository.save(VerificationToken.forEmail(userId, token, /* 24h */));
await this.eventPublisher.publish(new UserRegisteredEvent(userId, token));

// notifications/application/event-handlers/notification-event.handlers.ts:69 — deliver it
await this.send(NotificationType.EMAIL_VERIFICATION, payload.userId, { verifyUrl: `${appUrl}/verify-email?token=${payload.verificationToken}` });
```

Add `POST /auth/resend-verification` (throttled 3/h, generic response regardless of whether the email exists — [01 S-18](01-gaps-security-auth.md)), and wire `PasswordResetRequested` the same way (`auth.controller.ts:289-301` creates the token but never emails it).
**Proof:** e2e — register → Maildev inbox contains a link → `POST /auth/verify-email` → `POST /auth/login` returns `200`.

---

## Sprint 2 — make it safe

### R-09 · CD that can run, health checks that agree, a frontend that finds its API
**Fixes** [03 I-02 · I-06 · I-07 · I-08](03-gaps-infrastructure-cicd.md) · **Effort** 1 d · **Owner** ops

```yaml
# .github/workflows/ci.yml:3
on:
  workflow_call:            # ← lets cd-staging.yml / cd-production.yml reuse it
  pull_request: { branches: [develop, main] }
  push: { branches: ['**'] }   # today issue-numbered branches never run CI on push
```

Commit `.github/changelog-config.json` and a seed `CHANGELOG.md`. Then one health contract:

```ts
// app.controller.ts — @nestjs/terminus
@Get('health') @HealthCheck()
check() { return this.health.check([() => this.db.pingCheck('database'), () => this.redis.isHealthy('redis')]); }
```

Point every checker at `/api/health` (`docker-compose.prod.yml:38,71`; `cd-staging.yml:137,214`; `cd-production.yml:246`). Fix nginx: `proxy_pass http://backend_api;` (no trailing slash — it strips `/api/`) and proxy `/` to `frontend:3001` instead of serving a static root. Pass `NEXT_PUBLIC_API_URL=https://api-<env>.tickr.tn/api` as a build-arg in both CD workflows, and add `/api` to `frontend/.env.example:2`, `docker-compose.dev.yml:126`, `docker-compose.prod.yml:50`.

### R-10 · Refund correctness
**Fixes** [02 C-05 · C-06](02-gaps-commerce-wiring.md) · **Effort** ½ d

```ts
// request-refund.handler.ts:76-95
const gw = await provider.refund(order.transactionId, refundAmount);
if (!gw.success) {                       // Konnect always returns false today
  refund.markFailed(gw.error);           // order stays PAID; refund row records FAILED
  await this.refundRepository.save(refund);
  return Result.fail({ type: 'GATEWAY_REFUND_FAILED', message: 'Refund could not be executed automatically' });
}
order.markAsRefunded(); ...
```

Treat Stripe `pending` as in-flight, not success. Document the manual Konnect refund procedure ([06 P-02](06-gaps-product-legal-money-ops.md)).

### R-11 · Scoping leaks in notifications and analytics
**Fixes** [01 S-05 … S-07](01-gaps-security-auth.md) · **Effort** 1 d

```ts
// notifications.controller.ts:116,140,163,180
@CurrentUser('userId') userId: string,     // the JWT user is { userId, email, role } — 'id' is undefined
```

Add a repository guard (`if (!userId) throw new UnauthorizedException()`) so an undefined id can never become an unscoped query. In analytics, resolve `event.organizerId` through the events port and reject mismatches in `get-event-analytics`, `get-sales-time-series`; scope `get-revenue-report` and `generate-report` to the caller's event ids unless `role === 'ADMIN'`. Restrict `POST /notifications` to `ADMIN`.

### R-12 · Authenticate the Konnect webhook
**Fixes** [01 S-08](01-gaps-security-auth.md) · **Effort** ½ d

`konnect.adapter.ts:152-167` already implements timing-safe verification; call it first in `webhooks.controller.ts:99-135`, and move `tryMarkAsProcessed` **after** a successful `confirmPayment` so a spoofed early hit cannot burn the real event.

### R-13 · Redis-backed dedupe and cron locks
**Fixes** [02 C-14](02-gaps-commerce-wiring.md) · [03 I-09](03-gaps-infrastructure-cicd.md) · **Effort** 1 d

```ts
// webhook-event-store.service.ts — replace the Map
async tryMarkAsProcessed(id: string, source: string) {
  return (await this.redis.set(`wh:${source}:${id}`, '1', 'EX', 86_400, 'NX')) === 'OK';
}
```

Wrap each `@Cron` body in a short Redis lock (`SET lock:<job> NX PX 55000`) so N tasks run it once. Hoist `ScheduleModule.forRoot()` to `AppModule`.

### R-14 · Refresh-token rotation and revocation
**Fixes** [01 S-10 · S-11](01-gaps-security-auth.md) · **Effort** 2 d

Persist refresh tokens (`jti` + hash + `userId` + `expiresAt`); rotate on every use; revoke on logout, password change and `DELETE /users/me`; re-check `isActive` in the refresh path. Collapse the two expiry variables to `JWT_ACCESS_EXPIRATION=15m` / `JWT_REFRESH_EXPIRATION=30d` and delete `JWT_EXPIRES_IN`.

Also in Sprint 2: enable coverage collection and a threshold ([04 F-08](04-gaps-frontend-testing.md)); add `helmet`, gate Swagger on `NODE_ENV`, fix `CORS_ORIGINS` naming ([01 S-13](01-gaps-security-auth.md)); replace the frontend API client with the specified single-flight refresh version ([04 F-01/F-02](04-gaps-frontend-testing.md)).

---

## In parallel — decide

| # | Decision | Why it cannot be engineered around |
|---|---|---|
| R-15 | **Organizer payout model.** Fix `docs/02-technique/04-modele-economique.md` to match the locked face-price contract (buyer pays face + fee; the organizer receives the face price), then design the ledger: ticket value · service fee · refund · chargeback · payout, reconciled per provider | The economic-model document still says the organizer nets 47 TND on a 50 TND ticket. A ledger built on the wrong split is worse than no ledger ([06 P-01](06-gaps-product-legal-money-ops.md)) |
| R-16 | **Refund and cancellation policy**, buyer-facing, stating the non-refundable service fee **before** purchase, and the organizer-cancellation path (bulk refund, who bears gateway fees) | The design already displays the arithmetic; the words behind it do not exist ([06 P-02 · P-03](06-gaps-product-legal-money-ops.md)) |
| R-17 | **Legal set + consent capture**: terms, privacy, organizer agreement, cookie notice; `terms_accepted_version/at` on the user; the `/legal/*` pages the route tree already reserves | Nothing legal exists in the repository ([06 P-04](06-gaps-product-legal-money-ops.md)); consent must be *recorded*, not just displayed |

---

## Before the second market

The brief already asks for these; they are cheap now and expensive later ([05](05-gaps-global-readiness.md)).

| # | Fix | Where |
|---|---|---|
| R-18 | `timestamptz` everywhere; `events.timezone` (IANA); `TZ=UTC` in Dockerfile and compose | `event.orm-entity.ts:97-101` and siblings; one additive migration |
| R-19 | One phone rule via libphonenumber, storing `country` + E.164; `\p{L}` name regex | `users/…/phone.vo.ts`, `update-profile.dto.ts:19,28,35`, `auth.dto.ts:66` |
| R-20 | Guard the two latent currency bugs now: `supports(currency, country)` on the provider port; analytics grouped by currency | `payment-provider.port.ts:22-34`; `metric.repository.ts:103-168` |
| R-21 | Reserve additive columns: `order_items.tax_amount/tax_rate/tax_country`; `users.locale`; `users.terms_accepted_version/at` | One migration, no behaviour change |
| R-22 | `next-intl` + `[locale]` routing; `dir` on `<html>`; a lint rule banning physical-direction utilities | Frontend — see [08 §5, §12](08-global-design-direction.md) |

---

## The proof — one journey test

Everything in Sprint 1 is gated by a single automated journey, run in CI against real Postgres and Redis and the sandbox gateways (or their mocked HTTP surface):

```
register → (Maildev) verify → login
→ GET /events/:id                    availableQuantity = N
→ POST /orders (qty 2)               201 · tickets.order_id set · sold_quantity = N−2 · expiresAt = +15 min
→ POST /orders/:id/pay KONNECT       paymentUrl returned · gateway_payment_ref stored
→ GET /payments/webhooks/konnect     order PAID · 2 tickets CONFIRMED · QR present
→ GET /tickets/:id (other user)      403
→ POST /tickets/check-in             CHECKED_IN
→ POST /tickets/check-in (again)     rejected as duplicate · audit row written
→ (clock +16 min on a fresh order)   order EXPIRED · sold_quantity restored
```

Until this test is green, no other work on the money path has a way to be verified. It is the definition of done for Sprint 1 and the regression guard for everything after.

---

**Index:** [README](README.md) · **Findings:** [01](01-gaps-security-auth.md) · [02](02-gaps-commerce-wiring.md) · [03](03-gaps-infrastructure-cicd.md) · **Design:** [08](08-global-design-direction.md) · [10 (visual)](10-global-design-direction-visual.md)
