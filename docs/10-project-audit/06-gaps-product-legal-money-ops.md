# Gap Analysis 06 — Product, Legal & Money Operations

**Domain:** the gaps that are not code — commercial policy, legal readiness, money operations, support — plus the product-level consequences of the code gaps in [01](01-gaps-security-auth.md)–[05](05-gaps-global-readiness.md).
**Sources:** the product handoff (`docs/09-product-and-growth/01-executive-product-growth-handoff.md`, §7–§8), the business rules (`docs/01-fonctionnel/03-regles-metier.md`), the economic model (`docs/02-technique/04-modele-economique.md`), and the code audits. Where the handoff already names a gap, this file cites it rather than restating it.
**Date:** 2026-09-15.

---

## Summary

1. **The handoff's own launch-blocker list (§8.2) is accurate and this audit confirms every item in code**: the reservation stub, the un-sent verification email, the scaffold frontend, undefined money operations, and absent legal readiness.
2. **Organizer payout is still an open commercial decision**, not an implementation gap — and the economic-model document still contradicts itself on it (organizer nets 47 vs the code's face-price-plus-fee model). No payout, ledger, reconciliation or settlement code exists.
3. **Refund policy is undefined in law and inconsistent in code**: the commission is non-refundable by code, refunds are marked complete even when the gateway fails, Konnect refunds cannot be executed at all, and no policy document states any of this to a buyer.
4. **Nothing legal exists in the repository**: no terms, privacy policy, organizer agreement, refund policy, consent capture, cookie policy, or age rule — and the Tunisia V1 cannot honestly go live without them.
5. **Support and operations have no surface**: no support contact in the product, no admin takedown that works, no incident runbook, no backup/restore procedure.

---

## Findings

| # | Gap | Severity | Where it is already recorded | What this audit adds |
|---|---|---|---|---|
| P-01 | **Organizer payout model undecided.** Planning proposes payout 7 days after the event; nothing is approved or implemented. No ledger separating ticket value, fee, refund, chargeback and payout; no reconciliation per provider | 🔴 Blocks live money at scale | Handoff §7.4, §8.2 "Define and implement money operations" | The economic model (`04-modele-economique.md:24-64`) still shows the organizer netting **47 TND** on a 50 TND ticket while the code adds the fee on top of the face price ([brief §L gap 8](../08-frontend/02-product-design-brief.md)). **Resolve the document before designing the ledger**, or the ledger will encode the wrong split |
| P-02 | **Refund policy undefined and code-inconsistent.** Code: refund = subtotal + payment fees, commission kept (`request-refund.handler.ts:56`); order marked `REFUNDED` even if the gateway fails ([02 C-06](02-gaps-commerce-wiring.md)); Konnect refunds always fail (`konnect.adapter.ts:141-150`); any user can refund any order ([01 S-03](01-gaps-security-auth.md)) | 🔴 Critical | Handoff §4.4 "Refund and cancellation"; §8.2 | A buyer-facing refund policy must state the non-refundable fee **before** purchase (the design already does this — [brief §G.3 ⑤](../08-frontend/02-product-design-brief.md)); a manual-refund operating procedure is required for Konnect until the gateway supports it |
| P-03 | **Event cancellation has no money path.** `EventStatus.CANCELLED` exists; nothing refunds ticket-holders, notifies them with a money statement, or reverses organizer earnings | 🟠 High | Handoff §4.4; §7.4 "rules for cancelled, postponed, disputed" | An organizer-initiated cancellation today strands paid tickets in `CONFIRMED`. Needs: bulk refund command, `EVENT_CANCELLED` email with the refund amount, and a policy on who bears gateway fees |
| P-04 | **No legal documents in the repository or the product**: terms of service, privacy policy, organizer agreement, refund policy, cookie notice. The route tree reserves `/legal/*` as static pages with nothing behind them | 🔴 Blocks any public launch | Handoff §8.2 "Establish legal and commercial readiness" | Consent capture also does not exist in the schema ([05 G-13](05-gaps-global-readiness.md)) — the pages alone are not enough; acceptance must be recorded with a version |
| P-05 | **Tax treatment undefined.** No VAT/tax fields on orders or ticket types; whether the 6 % service fee is taxable, and to whom, is undecided | 🟠 High | Handoff §7.3 "Costs that remain unvalidated"; `16-payments-module-plan.md:67` (deferred) | Reserve the columns now ([05 G-12](05-gaps-global-readiness.md)) so the decision does not require a migration under pressure |
| P-06 | **Provider contracts and production credentials** are not in place; the Konnect webhook URL in `.env.example` points at `api.tick-r.tn`, a domain that differs from `tickr.tn` | 🟠 High | Handoff §8.2 "signed production-provider arrangements" | `.env.example:88,93` — likely a typo, but it is the only place that URL appears; confirm the production domain |
| P-07 | **Support has no product surface.** No support contact, hours or contact form anywhere in the specified screens beyond the market config placeholder; no escalation for "I paid and have no ticket" — which the code today would produce on every purchase ([02 C-01](02-gaps-commerce-wiring.md)) | 🟠 High | Handoff §8.2 "customer-support commitments" | The specified error copy already promises « Aucun montant n'a été débité » — that promise needs a human behind it when it is wrong |
| P-08 | **Admin cannot moderate.** Neither guard bypasses for `ADMIN`; `DELETE /events/:id` always `403`s for an admin; `GET /events` returns `PUBLISHED` only, so drafts are invisible to moderation | 🟡 Medium | [Phase 4 §7.8](../08-frontend/05-screen-inventory.md); [01 S-20](01-gaps-security-auth.md) | A takedown path is a legal necessity in every market (illegal content, fraud, IP claims). It is a product decision *which* powers an admin has — then a one-line guard change |
| P-09 | **Organizer verification is undefined.** Any registered user who is granted `ORGANIZER` can publish and collect money; no identity, bank-account or business verification exists | 🟡 Medium (V1) · 🟠 High (money) | Handoff §7.4 "Organizer identity and bank-account requirements"; §9 Phase 2 | KYC is a prerequisite for payout in every market; the market config should carry the verification requirements per country |
| P-10 | **No operating runbooks**: incident response, backup/restore (only a snapshot snippet — [03 I-17](03-gaps-infrastructure-cicd.md)), payment-provider outage, webhook replay, manual ticket issuance | 🟡 Medium | Handoff §8.4 readiness statement | The first production incident will be a payment that confirmed on the gateway and not in Tickr ([02 C-02/C-03](02-gaps-commerce-wiring.md)); there is no procedure for it |
| P-11 | **Pricing rule mismatch between documents.** The locked V1 face-price contract (commit `2aec158`) says the organizer enters the face price and the fee is added; the economic model's revenue split and the root README's "commission payée par organisateur" describe the opposite | 🟡 Medium | [07](07-gaps-documentation.md) | Fix the two older documents; the locked contract is the source of truth |
| P-12 | **Age and content policy absent.** No age restriction on events or accounts; no content rules for organizer uploads; no reporting path for attendees | 🟢 Low (V1) · 🟡 Medium (V2) | — | Needed before nightlife categories scale; a per-market `minimumAge` on the event and a report action on the event page |

---

## The launch-readiness statement, updated

The handoff (§8.4) says the platform is *"structurally strong but not launch-ready"*. This audit agrees and sharpens it:

| Area | Handoff says | Code confirms |
|---|---|---|
| Reservation & issuance | P0 blocker | `[STUB]` adapter, order-item ids passed as ticket ids, no webhook can confirm — **five distinct defects**, not one ([02](02-gaps-commerce-wiring.md)) |
| Account verification & email | P0 blocker | Token never minted, reset never sent, no resend, login `403` — plus **refresh tokens never revoked** ([01](01-gaps-security-auth.md)) |
| Frontend | P0 blocker | 302 lines, one route, zero tokens, two known defects in its only real code ([04](04-gaps-frontend-testing.md)) |
| Money operations | P0 blocker | No ledger, no payout, refunds marked complete on gateway failure, any user can refund any order |
| Legal & commercial | P0 blocker | Nothing in repo; no consent capture in schema; production domain inconsistent |
| **Not in the handoff** | — | **A production database cannot take an order** (missing migrations, unregistered entities), **CD cannot run**, **four IDORs**, and the **hold lasts ~35 hours** when configured ([03](03-gaps-infrastructure-cicd.md), [02 C-07](02-gaps-commerce-wiring.md)) |

---

**Prev:** [05 — Global readiness](05-gaps-global-readiness.md) · **Next:** [07 — Documentation drift](07-gaps-documentation.md) · **Index:** [README](README.md)
