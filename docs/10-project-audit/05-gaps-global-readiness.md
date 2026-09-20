# Gap Analysis 05 — Global / Multi-Market Readiness

**Domain:** what must change for Tickr to operate outside Tunisia — currencies, languages (incl. Arabic RTL and English), timezones, identity formats, payment rails, tax and legal.
**Stance:** this audit **aligns with, and does not contradict**, the roadmap already locked in the product handoff (§9 Phase 3, "V2 international readiness") and the design brief (§A.5). Nothing here blocks the Tunisia V1. It separates the *cheap, build-ready-now* items the brief already asks for from the V2 work.
**Method:** read in code; the timestamp type, phone regex and config currency literal re-verified. `Verified` = read in code. `Inferred` = deduced.
**Date:** 2026-09-15.

---

## Summary

1. **The money model is the strongest asset**: `Currency` metadata drives decimals (TND = 3, EUR/USD = 2), rounding and smallest-unit conversion, and the Stripe adapter uses it correctly. But the DB `CHECK` constraints, the Konnect/Paymee adapters, every analytics aggregation and `GET /config/public` hard-code TND.
2. **There is no locale concept anywhere**: no user language field, no `Accept-Language` handling, one English-only variant per email template with a schema that cannot hold a second language, a French-only frontend with no i18n library, no `dir`, no logical CSS, and a Latin-only font subset.
3. **All timestamps are `timestamp` *without* time zone**; events and venues carry no timezone; no `TZ` is pinned; schedulers and sales-window checks compare raw `new Date()` — correct only while the Node process and Postgres both happen to run in UTC.
4. **Identity is Tunisia-bound**: `+216`-only phone value objects (contradicted by an E.164 register DTO), a Latin-1 name regex that rejects Arabic, free-text country and city with `LIKE` filters.
5. **Tax, invoices, consent versioning, data export/erasure, age policy and data residency are absent** — explicitly deferred by the roadmap, and recorded here so the V1 schema can reserve the columns now.

---

## Readiness matrix

| Dimension | Today (verified) | Multi-market gap | Effort |
|---|---|---|---|
| **Currency** | Enum TND/EUR/USD with metadata (`currency.vo.ts:8-59`); `Money` and `TicketPrice` round via metadata; `toSmallestUnit` (`currency.vo.ts:239-243`); Stripe uses it (`stripe.adapter.ts:47-54`) | DB `CHECK`s hard-code the three codes (`migrations/…03…:94-95,212-213`) so "add an enum entry" is not enough; Konnect `× 1000` + `'TND'` (`konnect.adapter.ts:59,70,137`); Paymee `'TND'` (`paymee.adapter.ts:53,123`); analytics **sum across currencies** and stamp `'TND'` (`get-organizer-dashboard.handler.ts:60,85`; `get-revenue-report.handler.ts:76,88`; `metric.repository.ts:103-168`); `/config/public` literal `'TND'` (`public-config.controller.ts:101`); commission minimum is a currency-less number (`payments.config.ts:8`) | M |
| **Locale & language** | No locale on users (`user.orm-entity.ts:23-66`); no `Accept-Language` (grep empty); templates English, single variant, no `lang` (`welcome.hbs`, `ticket-confirmed.hbs`, `password-reset.hbs`); template table has `slug UNIQUE` and no locale column (`notification-template.orm-entity.ts:20-36`); metadata EN/FR only (`event-category.vo.ts:26-32`); `'en-US'` defaults in PDF and date VOs (`pdf-generator.service.ts:219`; `event-date-range.vo.ts:180`) | `users.locale` + an `Accept-Language` resolver; `(slug, locale)` template key; Arabic and English variants; locale passed into PDF/VO formatters | M |
| **Timezone** | `timestamp` (no tz) on events (`event.orm-entity.ts:97-101`), ticket types, orders, users, notifications; no event/venue timezone (`location.vo.ts:8-15`); crons declare `timeZone: 'UTC'`; comparisons via `new Date()` (`event-scheduler.service.ts:114-118`; `event.repository.ts:254`; `sales-period.vo.ts:83-99`); no `TZ` pin in Dockerfile/compose; docs assume Africa/Tunis (`03-regles-metier.md:79`) | Migrate to `timestamptz`; add `events.timezone` (IANA); pin `TZ=UTC`; PDF `formatDate` has no `timeZone` (`pdf-generator.service.ts:218-227`) | M |
| **Identity & contact** | Phone `+216` only (`shared/…/phone.vo.ts:22-23`; `users/…/phone.vo.ts:28-29`, auto-prefix `:78-79`; `update-profile.dto.ts:35`) vs E.164 in the register DTO (`auth.dto.ts:66`); names `/^[a-zA-ZÀ-ÿ\s'-]+$/` reject Arabic (`update-profile.dto.ts:19,28`); ASCII-only email regex (`email.vo.ts:27`); country free text (`location.vo.ts:12`), a Tunisian city list and `isTunisian()` in the domain (`:40-65,197-201`) | libphonenumber + country; `\p{L}` names; ISO-3166 country code + per-country postal format | S–M |
| **Payment rails** | `STRIPE \| KONNECT \| PAYMEE` (`payment-method.vo.ts:8-13`); choice is **client-sent** (`request.dto.ts:88-90` → `process-payment.handler.ts:117`); the provider port has no capability API (`payment-provider.port.ts:22-34`); SMS via SNS and email via SES pinned to `eu-west-1` (`aws.config.ts:33,38`); Konnect webhook URL hard-coded to `api.tick-r.tn` (`.env.example:88,93`) | Market → provider policy (`supports(currency, country)`), server-side eligibility, per-market SMS sender | M |
| **Tax & legal** | No tax/VAT/invoice/consent/erasure code (grep of `backend/src` empty); order fees only (`order.orm-entity.ts:72-85`); tax deferred by design (`16-payments-module-plan.md:67`); `DELETE /users/me` deactivates only; no age rule; a documented "RGPD light" 2-year purge is not implemented (`03-regles-metier.md:401-420`); `eu-west-1` everywhere | Tax lines per order item, invoice numbering, terms/privacy version + consent, export/erasure, age gate, a residency plan per market | L |
| **Content & discovery** | Category names EN + FR only; city/country `LIKE` on free text (`event.repository.ts:354-363`); title search `LOWER(title) LIKE` (`event.repository.ts:166-172`) despite a "trigram" comment (`:26`); images S3 + optional CloudFront; Next allows only `*.s3.eu-west-1…` (`next.config.ts:16-21`) | Country enum filter; language-aware full-text search (`to_tsvector` per locale) or real trigram; CDN in front of S3 | S–M |
| **Frontend** | `lang="fr"` (`layout.tsx:38`), `fr_TN` (`:18`), Inter `latin` only (`:6`); no i18n library (`package.json`), no messages directory; hard-coded French (`page.tsx:11,14,23`); `fr-TN`/TND/2-decimal formatters (`utils.ts:14-37`); `globals.css` has no logical properties or `dir` | `next-intl` + `[locale]` routing; `dir` on `<html>`; logical-property lint; per-script fonts — all specified in [08](08-global-design-direction.md) | M |

**What the docs already commit to** (quoted so this audit aligns): handoff §9 Phase 3 — *"Arabic and English in addition to French, including right-to-left layouts"*, *"Multiple countries, currencies, time zones, tax rules, and refund policies"*, *"Market-specific payment providers and settlement rules"*, and the expansion rule *"A market launches only when payments, legal compliance, support, event supply, content quality, and operational ownership are ready together."* Brief §A.5 V1 — *"Build internationalisation-ready components and logical layouts now, while exposing only the countries, currencies, languages and payment methods the V1 backend actually supports."* Brief §C.3 — *"All strings must be externalised from day one… No hard-coded French in components."*

---

## Findings

| # | Finding | Severity | Status | Evidence | Recommendation |
|---|---|---|---|---|---|
| G-01 | **Provider choice is client-sent with no currency/country guard.** A non-TND order routed to Konnect is multiplied `× 1000` and labelled `'TND'` | 🟠 High (latent) | Verified (routing) · Inferred (mis-charge) | `request.dto.ts:88-90`; `process-payment.handler.ts:117`; `konnect.adapter.ts:59,70`; `paymee.adapter.ts:53,123`; `payment-provider.port.ts:22-34` | Add `supports(currency, country)` to the port; the factory filters by order currency; reject mismatches in `ProcessPaymentHandler`. **Do this in V1** — it is a correctness bug the moment EUR is enabled |
| G-02 | **Analytics sums revenue across currencies and stamps `'TND'`** | 🟠 High (latent) | Verified | `get-organizer-dashboard.handler.ts:60,85`; `get-revenue-report.handler.ts:76,88`; `refresh-analytics.handler.ts:181,227`; `metric.repository.ts:103-168` | Group metrics by currency; never sum mixed currencies. **Do this in V1** for the same reason |
| G-03 | **No user locale, no `Accept-Language`, single-language templates**; the template schema cannot hold an Arabic or English variant | 🟠 High (V2) | Verified | `user.orm-entity.ts:23-66`; `notification-template.orm-entity.ts:20-36`; `welcome.hbs:15-24` | `users.locale`; `(slug, locale)` template key; a locale resolver; render dates and money with the user's locale |
| G-04 | **`timestamp` without tz everywhere; no event timezone; no `TZ` pin** — schedulers are correct only if process and DB both run UTC | 🟠 High | Verified (schema) · Inferred (risk) | `event.orm-entity.ts:97-101`; migrations `…03…:52-53,186-187`; `event-scheduler.service.ts:114-118`; `event.repository.ts:254` | Migrate to `timestamptz`; add `events.timezone` (IANA); `TZ=UTC` in Dockerfile and compose. **Cheap now, expensive later** — do it in V1 |
| G-05 | **Phone validation contradicts itself**: VO and profile DTO are `+216`-only, the register DTO accepts any E.164 → passes validation, then fails in the VO with an opaque error | 🟠 High | Verified · Inferred (error surface) | `users/…/phone.vo.ts:28-29,78-79`; `update-profile.dto.ts:35`; `auth.dto.ts:66` | libphonenumber; store `country` + E.164; one rule in DTO and VO |
| G-06 | DB `CHECK` constraints hard-code the currency list, contradicting the enum's "no other code changes" comment | 🟡 Medium | Verified | `migrations/…03…:94-95,212-213` vs `currency.vo.ts:29-32` | Drop the `CHECK`s or generate them from the enum; or a `currencies` table with an FK |
| G-07 | `/config/public` returns literal `'TND'`; the commission minimum is a bare number applied in any currency | 🟡 Medium | Verified | `public-config.controller.ts:101`; `payments.config.ts:8`; `commission-calculator.service.ts:46` | Per-market config response; minimum as `Money` per currency |
| G-08 | **PDF ticket**: `en-US` date with no `timeZone`, `toFixed(2)` drops millimes, English strings, and Helvetica has **no Arabic glyphs** | 🟡 Medium | Verified · Inferred (glyphs) | `pdf-generator.service.ts:105,140,152,218-227` | Accept `locale` + `timeZone`; use `CurrencyVO.formatAmount`; per-locale strings; embed a font with Arabic coverage |
| G-09 | Name regex is Latin-1 only (rejects Arabic and most of the world); email regex ASCII-only | 🟡 Medium | Verified | `update-profile.dto.ts:19,28`; `users/…/email.vo.ts:27` | `/^[\p{L}\p{M}\s'-]+$/u`; keep ASCII email for V1 |
| G-10 | Country/city free text with `LIKE`; title search is `LIKE` not full-text; a Tunisian city list lives in the domain | 🟡 Medium | Verified | `location.vo.ts:12,40-65,197-201`; `event.repository.ts:166-172,354-363` | ISO-3166 `country_code`; `pg_trgm` or per-locale `tsvector` |
| G-11 | **Frontend has no i18n layer** — `lang="fr"`, hard-coded French, `fr-TN` formatters, no `dir`, physical CSS, Latin-only font subset | 🟡 Medium (V1) · 🟠 High (V2) | Verified | `layout.tsx:6,18,38`; `page.tsx:11,14,23`; `utils.ts:14-37`; `globals.css:1-26` | Adopt `next-intl` now (the brief already requires externalised strings); logical-property lint; see [08](08-global-design-direction.md) |
| G-12 | No tax/VAT/invoice fields — explicitly deferred | 🟡 Medium | Verified | `order.orm-entity.ts:72-85`; `16-payments-module-plan.md:67` | Reserve `tax_amount`, `tax_rate`, `tax_country` on order items now (an additive migration); invoice numbering later |
| G-13 | No consent/terms version, no export, `DELETE /me` only deactivates; no age policy | 🟡 Medium | Verified | `user.orm-entity.ts:23-66`; `users.controller.ts:241-249`; `deactivate-user.handler.ts:57` | `terms_accepted_version/at`; erasure + export commands; optional `date_of_birth` with a per-market age gate — a **legal prerequisite for any EU market** |
| G-14 | Single-region assumption (`eu-west-1`) for S3/SES/SNS/CloudWatch and Next image hosts | 🟢 Low (V1) | Verified | `aws.config.ts:18,33,38`; `next.config.ts:20`; `01-aws-architecture.md:4` | Parameterise region per market; CloudFront in front of S3; document residency per market |
| G-15 | Order currency = first item's; mixed currencies throw inside `Money.add` (500) instead of a validation error | 🟢 Low | Verified · Inferred (500) | `create-order.handler.ts:124`; `money.vo.ts:152-158` | Validate up front; return 400 (also [02 C-12](02-gaps-commerce-wiring.md)) |

---

## Reading

The backend domain is roughly **60 % multi-currency-ready by design** — the value objects were built right. Everything at the *edges* (adapters, analytics, config, DB constraints, PDF) and the entire locale / timezone / identity / legal surface is Tunisia-only.

**Do in V1, because the brief already asks for it and it is cheap now:** G-04 (`timestamptz` + `TZ` + `events.timezone`), G-05 (phone consistency), G-11 (externalise strings), G-12/G-13 (additive reserved columns).
**Guard in V1, because they are correctness bugs the day a second currency is enabled:** G-01, G-02.
**Everything else is V2**, exactly as the roadmap says.

---

**Prev:** [04 — Frontend & testing](04-gaps-frontend-testing.md) · **Next:** [06 — Product, legal & money operations](06-gaps-product-legal-money-ops.md) · **Index:** [README](README.md)
