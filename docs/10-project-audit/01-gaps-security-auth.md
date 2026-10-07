# Gap Analysis 01 — Security, Authentication & API Hygiene

**Domain:** `backend/src` — guards, authorization inside handlers, auth lifecycle, webhooks, config, PII.
**Method:** every finding was read in source; the seven highest-impact ones were independently re-verified line by line before inclusion. `Verified` = read in code. `Inferred` = a runtime effect deduced from code.
**Date:** 2026-09-15 · **Branch:** `64-frontend-design-deliverables` after merging `develop` (`21eb15d`).

---

## Summary

1. Authentication is now sound at the guard layer — the shared `JwtAuthGuard` extends `AuthGuard('jwt')`, and no route was found without a guard. **Authorization inside handlers is the weak layer.**
2. **Four Critical IDORs**: any authenticated user can confirm any reserved ticket, cancel any ticket, read any ticket (including its QR code and holder contact details), and refund any order.
3. Analytics ignores ownership; the notifications controller reads a JWT field that does not exist, so its "my notifications" query is unscoped.
4. Self-service auth cannot complete: verification and reset tokens are never emailed, no resend endpoint exists, refresh tokens are never rotated or revoked, and access tokens effectively last 7 days.
5. Webhook authenticity is uneven: Stripe and Paymee verify signatures (Stripe currently fails closed for an unrelated reason — see [02](02-gaps-commerce-wiring.md)); Konnect's verifier exists but is never called.

---

## Findings

| # | Finding | Severity | Status | Evidence | Recommendation |
|---|---|---|---|---|---|
| S-01 | **`POST /tickets/confirm` confirms arbitrary tickets.** The controller forwards only `ticketIds` + `orderId`; the handler never checks the caller, the order's owner, or that the order is `PAID` | 🔴 Critical | Verified | `tickets.controller.ts:173-203` (only `new ConfirmTicketsCommand(dto.ticketIds, dto.orderId)`); `confirm-tickets.handler.ts:45-102` (no user/order check) | Remove the public route — confirmation is already reached internally after payment. If kept: `ADMIN` only, and assert the order is `PAID` and owns every ticket id |
| S-02 | **`GET /tickets/:id` returns any ticket to any authenticated user** — including `qrCode`, `holderEmail`, `holderPhone`. The non-owner branch denies only when the *event* is missing; otherwise it falls through to the full DTO ("organizer check … handled at controller level via guards for now" — it is not) | 🔴 Critical | Verified | `get-ticket-by-id.handler.ts:44-56` (deny only on `!event`), `:58-72` (full DTO); `IsTicketOwnerGuard` exists but is unused (`tickets.module.ts:197`) | Deny unless `isOwner \|\| event.organizerId === requestingUserId`. The tickets-side event adapter must expose `organizerId` |
| S-03 | **`POST /orders/:id/refund` has no ownership check** — `command.userId` is never read; any user refunds any order, which also cancels its tickets | 🔴 Critical | Verified | `request-refund.handler.ts` — zero uses of `command.userId`; `orders.controller.ts:200-211` | Enforce `order.userId === userId \|\| isAdmin` before any gateway call |
| S-04 | **`POST /tickets/cancel` has no ownership check** — the controller's `_user` parameter is unused | 🔴 Critical | Verified | `tickets.controller.ts:408-414`; `cancel-tickets.handler.ts:53-80` | Pass `userId` into the command; reject tickets not owned by the caller (or by the event organizer) |
| S-05 | **Analytics ignores ownership.** `GET /analytics/events/:id` and `/sales-timeline` never verify the caller organizes the event; `GET /revenue-report` and `POST /export` return **platform-wide** revenue to any authenticated user (`isAdmin`/`organizerId` unused) | 🟠 High | Verified | `get-event-analytics.handler.ts:29-56`; `get-sales-time-series.handler.ts:55-60`; `get-revenue-report.handler.ts:62-66`; `generate-report.handler.ts:73-77` | Resolve event ownership via the events port; scope metric queries by the organizer's event ids; make `PLATFORM_SUMMARY` export `ADMIN`-only |
| S-06 | **`POST /notifications` lets any user send email/SMS** with arbitrary subject/content to any `userId`, `recipientEmail` or `recipientPhone` | 🟠 High | Verified | `notifications.controller.ts:72-105`; `notification.dto.ts:89-144` | `ADMIN`/internal only; remove free-form recipients from the public DTO |
| S-07 | **`@CurrentUser('id')` reads a field the JWT user does not have.** The strategy returns `{ userId, email, role }`; four notification routes read `'id'` → `undefined`. With TypeORM 0.3, `where: { userId: undefined }` drops the predicate, so `GET /notifications/me` likely returns **every user's notifications**; `/:id` and preferences always miss | 🟠 High | Verified (mismatch) · Inferred (TypeORM effect) | `notifications.controller.ts:116,140,163,180`; `jwt.strategy.ts:61-67`; same bug in `logging.interceptor.ts:25` | Use `@CurrentUser('userId')`; add a repository guard that rejects `undefined` ids |
| S-08 | **Konnect webhook is unauthenticated.** `KonnectAdapter.verifyWebhook` is never called; the unauthenticated `GET ?payment_ref=` marks the ref processed *before* confirming, so a spoofed early hit turns the real webhook into a "duplicate" | 🟠 High | Verified | `webhooks.controller.ts:99-135` (dedupe at `:110`); `konnect.adapter.ts:152-167` unused | Verify a shared secret/signature first; mark processed only after a successful handling |
| S-09 | **Registration never mints or sends the verification token; login then 403s.** The issuance is a `TODO` comment; `request-reset` creates a token but never emails it; no `resend-verification` route exists | 🟠 High | Verified | `auth.controller.ts:158-160` (TODO), `:196-200` (403), `:289-301` (reset never sent) | Publish `UserRegistered`/`PasswordResetRequested` with the token and let Notifications deliver it; add a throttled `POST /auth/resend-verification` |
| S-10 | **Refresh tokens are never rotated or revoked**, share the access secret unless `JWT_REFRESH_SECRET` is set, skip throttling, and never re-check the user. `DELETE /users/me` leaves every issued token valid because `JwtStrategy.validate` never touches the DB | 🟠 High | Verified | `jwt.service.ts:70-73`; `auth.controller.ts:364-393`; `jwt.strategy.ts:54-71`; `deactivate-user.handler.ts:55-64` | Persist refresh tokens (hash + `jti`), rotate on use, revoke on logout / deactivation / password change; re-check `isActive` on refresh |
| S-11 | **Access-token lifetime drift.** Joi and `JwtModule` declare `JWT_ACCESS_EXPIRATION=15m`; the token service reads `JWT_EXPIRES_IN` (default `7d`) and overrides `expiresIn` → 7-day access tokens | 🟡 Medium | Verified | `app.module.ts:63`; `users.module.ts:124`; `jwt.service.ts:74,92` | One env name, Joi-validated, short-lived access + rotating refresh |
| S-12 | **Raw error messages reach clients on 500s** — the global filter echoes `Error.message` (DB/driver text) for non-HTTP exceptions | 🟡 Medium | Verified | `all-exceptions.filter.ts:49-51,68` | Generic message when `status === 500`; keep detail in logs |
| S-13 | **Hardening gaps.** No `helmet`; CORS disabled unless `CORS_ENABLED=true` and reads `CORS_ORIGINS` while `.env.example` provides `CORS_ORIGIN`; Swagger mounted unconditionally; no `trust proxy`; in-memory throttler storage → per-instance limits keyed on the load balancer's IP | 🟡 Medium | Verified (code) · Inferred (proxy) | `app.config.ts:8-9` vs `.env.example:36`; `main.ts:55-62`; `app.module.ts:75-79` | Add helmet; gate Swagger on `NODE_ENV`; Redis throttler storage + `trust proxy` |
| S-14 | **Config validation is thin.** Joi requires only `JWT_SECRET` (no minimum length); gateway and AWS variables are unvalidated; insecure defaults (`DB_PASSWORD=postgres`, AWS creds `test`); a dead fallback secret in `jwt.config.ts:4`; widespread `.env.example` key drift (`DATABASE_*`→`DB_*`, `S3_BUCKET`→`AWS_S3_BUCKET`, `FRAUD_MAX_*`→`MAX_*`) | 🟡 Medium | Verified | `app.module.ts:43-72`; `aws.config.ts:20-21`; `payments.config.ts:18`; `.env.example:10-14,45,107` | Require gateway/AWS vars in production; `JWT_SECRET.min(32)`; regenerate `.env.example` from the Joi schema |
| S-15 | **Image upload trusts the client mimetype** — no magic-byte sniff; the original buffer is uploaded before `sharp` validates it | 🟡 Medium | Verified | `events.controller.ts:184-209,1160-1162`; `s3-storage.service.ts:151-156` | Sniff with `file-type`; upload only the re-encoded output |
| S-16 | **No erasure or export path.** `DELETE /users/me` is a soft flag; PII is retained indefinitely and tokens stay valid (S-10) | 🟡 Medium | Verified | `deactivate-user.handler.ts:55-64`; `users.controller.ts:241-265` | Add an anonymisation job (PII, tokens) and a data-export endpoint — a legal prerequisite in every EU market |
| S-17 | **Secrets and PII in logs.** Full URLs are logged, including the unsubscribe token path and Konnect `payment_ref`; transfer target emails are logged; the user id logs as `anonymous` because of S-07 | 🟢 Low | Verified | `logging.interceptor.ts:25-34`; `notifications.controller.ts:211`; `transfer-ticket.handler.ts:48-50` | Redact token-bearing paths; fix the user-id read |
| S-18 | **Email enumeration** — register says "Email already registered"; transfer says "No user found with email" | 🟢 Low | Verified | `auth.controller.ts:129`; `transfer-ticket.handler.ts:79` | Generic messages; throttle transfer |
| S-19 | **`@Public()` is a no-op on `EventsController` and `PublicConfigController`** because no class-level guard runs. Side effect: `GET /events/:id` never sees `@CurrentUser()`, so an organizer cannot view their own `DRAFT` through the public route | 🟢 Low | Verified | `events.controller.ts:228,454-465`; `get-event-by-id.handler.ts:70-79` | Apply `JwtAuthGuard` class-wide on events and rely on `@Public()`; delete the users-module duplicate guards |
| S-20 | **Admin policy is inconsistent.** Neither `RolesGuard` nor `IsEventOwnerGuard` bypasses for `ADMIN`, so every `@Roles('ORGANIZER')` route locks admins out, while check-in resolution grants them | 🟢 Low | Verified | `shared/.../roles.guard.ts:37`; `is-event-owner.guard.ts:78`; `resolve-event-check-in-access.handler.ts:50` | Decide one admin policy and encode it in the guards |
| S-21 | Search wildcards (`%`, `_`) unescaped (bound params — no injection, but pattern abuse); several `@Query('limit')` without an upper bound | 🟢 Low | Verified | `event.repository.ts:166-172`; `tickets.controller.ts:227-229`; `events.controller.ts:400-403` | Escape wildcards; `PaginationDto` with `@Max` everywhere |

---

## What is solid

- The shared `JwtAuthGuard` extends `AuthGuard('jwt')`, rejects non-access token types and pins HS256 (`shared/.../jwt-auth.guard.ts:18`; `jwt.strategy.ts:36-58`). The blocker recorded in the previous audit is closed.
- `ValidationPipe` runs with `whitelist`, `forbidNonWhitelisted`, `transform`; every id param uses `ParseUUIDPipe`.
- **The check-in staff feature is the best-guarded surface in the codebase**: routes stack `JwtAuthGuard, RolesGuard, IsEventOwnerGuard`; handlers re-verify `organizerId` and `assignment.eventId`; `POST /tickets/check-in` resolves the operator's access against a live, active, verified user and rejects tickets from other events; stats are gated by `canViewBasicStats`.
- `GET /orders/:id`, `GET /orders`, `GET /tickets/:id/pdf`, `POST /tickets/:id/transfer` and `GET /events/organizer/:id` enforce ownership or admin correctly.
- Stripe and Paymee verify webhook signatures with library `constructEvent` / `timingSafeEqual`.
- Verification and reset tokens are 256-bit CSPRNG, single-use, expiring; all sibling tokens are invalidated on reset.
- bcrypt with configurable rounds; password policy enforced; login returns a uniform "Invalid credentials".
- Login, register and reset-request carry strict per-route throttles; all repository SQL uses bound parameters.

---

## Fix order

1. **S-01 · S-02 · S-03 · S-04** — the four IDORs. One day of work, no design decisions, and the product cannot be put in front of a beta user before they are closed.
2. **S-09** — without it no account can ever log in. Also blocks the frontend's registration journey.
3. **S-05 · S-06 · S-07** — the notifications and analytics leaks.
4. **S-08** — before any Konnect money moves.
5. **S-10 · S-11** — refresh/rotation, before scale.
6. **S-16** — before the first EU market (legal prerequisite).
7. Everything else in severity order.

---

**Next:** [02 — Commerce wiring](02-gaps-commerce-wiring.md) · **Index:** [README](README.md)
