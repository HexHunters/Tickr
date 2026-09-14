# 🔍 Project Audit & Global Design Direction — Index

A code-level audit of the whole Tickr repository, one gap file per domain, plus the design direction
for Tickr as a **multi-market** product. Prepared 2026-09-15 on `64-frontend-design-deliverables`
after merging `develop` (`21eb15d`). Every finding cites `file:line`; the highest-impact claims were
independently re-verified before inclusion.

**Read first:** [00 — Executive report](00-executive-report.md) — the one-page verdict, the ranked
blockers, and the recommended sequence.

| # | File | Domain | Findings | Critical |
|---|---|---|---|---|
| 00 | [Executive report](00-executive-report.md) | Verdict · ranked blockers · sequence · what is strong | — | — |
| 01 | [Security, auth & API hygiene](01-gaps-security-auth.md) | Guards, handler-level authorization, auth lifecycle, webhooks, config, PII | 21 | 4 |
| 02 | [Commerce wiring](02-gaps-commerce-wiring.md) | Does a purchase run end to end? Order → reservation → payment → webhook → ticket → check-in | 17 | 5 |
| 03 | [Infrastructure, CI/CD & ops](03-gaps-infrastructure-cicd.md) | IaC, workflows, migrations, containers, health, observability, single-instance state | 18 | 4 |
| 04 | [Frontend & test health](04-gaps-frontend-testing.md) | Frontend scaffold state, test corpus, coverage enforcement | 13 | 0 |
| 05 | [Global / multi-market readiness](05-gaps-global-readiness.md) | Currency, locale, timezone, identity, payment rails, tax, discovery | 15 | 0 |
| 06 | [Product, legal & money operations](06-gaps-product-legal-money-ops.md) | Payout, refunds, cancellation, legal documents, support, moderation | 12 | 3 |
| 07 | [Documentation drift](07-gaps-documentation.md) | Statements that no longer match the code; housekeeping | 24 + 6 | — |
| 08 | [**Global design direction**](08-global-design-direction.md) | Script-complete typography, validated dark theme and accent slots, RTL, money/time formatting, market configuration, WCAG 2.2 | — | — |

## Severity legend

🔴 Critical — blocks a launch or leaks money/data · 🟠 High — must fix before real users · 🟡 Medium — fix before scale · 🟢 Low — hygiene.
`Verified` = read in source. `Inferred` = a runtime effect deduced from code, stated as such.

## Three things to know before reading anything else

1. **A purchase does not complete today** — the reservation adapter is a stub and no webhook can confirm an order ([02](02-gaps-commerce-wiring.md)).
2. **A production database cannot take an order** — the `payments` and `analytics` tables have no migration, and CD cannot run ([03](03-gaps-infrastructure-cicd.md)).
3. **Ranks 1–8 of the blocker list are under two weeks of engineering** and turn "cannot sell a ticket" into "can sell a ticket in Tunisia through a sandbox" ([00 §3](00-executive-report.md#3-the-blockers-ranked)).

## Relationship to other documents

- Supersedes nothing. The [08-frontend deliverables](../08-frontend/README.md) remain the frontend specification; two stale statements in them were corrected in this pass ([07](07-gaps-documentation.md)).
- Confirms and sharpens the [product handoff's](../09-product-and-growth/01-executive-product-growth-handoff.md) §8.2 blocker list.
- The [global design direction](08-global-design-direction.md) extends [Phase 1](../08-frontend/02-product-design-brief.md) and follows its §A.5 market-by-market roadmap.
