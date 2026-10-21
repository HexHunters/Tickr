# Entrance pages, mobile, SEO and performance

Review date: 2026-10-21. Continuation of PR #82, targeting `develop`.
Visual reference: [En scène v1.1](../11-brand-charter/README.md).

## Pages and backend integration

| Route | Behavior |
| --- | --- |
| `/check-in` | Paginated events the signed-in owner, administrator or assigned operator can control. |
| `/check-in/[eventId]` | Submit a ticket code and gate to the real check-in endpoint. Display the server timestamp only after a validated successful response. |
| `/organizer/events/[id]/team` | Owner-only team listing, assignment by verified account email and confirmed revocation. |
| `/organizer/events/[id]/attendance` | Server totals and breakdown by tariff; refresh on request or window focus, no polling or estimated attendance. |
| `/account/messages` | Private, paginated notification subjects, channels and delivery statuses. |
| `/programme/comedies` | Public comedy collection with real published events, canonical metadata and sitemap inclusion. |

Entrance tools use compact typography, bordered rows, restrained sage surfaces and explicit result states. Mobile forms stack vertically. Team management is linked from event management; entrance access is available from account navigation and the mobile menu. No frontend event, ticket, attendance or notification fixture arrays were added.

## Bugs fixed

- The BFF previously constructed a body for upstream `204 No Content` responses, which can throw after a successful mutation. It now forwards bodyless responses correctly, exposes DELETE, and validates an empty revocation response on the client. A regression test covers the complete response/parse boundary.
- A result below the mobile fold could be missed. A successful or refused validation now focuses its result heading; moving to the next ticket restores focus to the code field after the disabled fieldset is released.
- Password changes now provide the account username to password managers, resolving the browser's missing-username diagnostic.
- The collection navigation now accommodates five categories and wraps on smaller screens.

Mutations are not retried automatically. A network failure or malformed success response remains unconfirmed. Success requires `isValid: true`, a ticket ID and a valid server timestamp. Actual ticket state, event access and the check-in window are enforced by NestJS.

## Functional and mobile verification

The production frontend was exercised against the running NestJS API and isolated PostgreSQL/Redis demo services, using actual demo accounts and database records.

- Successful entry persisted; reusing the same code was refused. Reserved tickets returned 400, wrong-event codes 404 and tickets before their entry window 400.
- Revocation returned an empty 204. The revoked operator's next mutation returned 403 and reloading removed the validation form. Reassigning access returned 201. Cancelling the revocation confirmation preserved access.
- The participant was denied event statistics with 403. The organizer received the actual totals: two eligible tickets, two entries and zero remaining, excluding the reserved ticket.
- Participant history contained its two messages; the separate operator account had none and received 404 for another user's notification ID.
- Repeated seeding preserved ticket states, check-in timestamps, assignment revocations and record counts. Seed message records are terminal with zero retries, and do not dispatch email.
- Eight representative routes at **320, 360, 390, 768 and 1440 px**: **40/40** returned 200 with no horizontal overflow or JavaScript exceptions. This includes every new view, discovery and account settings. Expected API refusal responses were inspected separately. Six follow-up checks of account navigation at 320, 390 and 1440 px also passed after adding the entrance link.
- All six new views passed a **200% text-size stress check at 390 px**, with reduced motion enabled and no horizontal overflow. This uses doubled computed font sizes, not a claim of physical-device or full browser-zoom coverage. Result visibility and keyboard focus restoration were verified in Chromium.

Browser artifacts are local under `output/playwright/` and `output/verification/entrance/`; they are excluded from the commit. Checks cover Chromium emulation, not physical iOS/Android devices.

## SEO report

**24 HTTP checks passed**, using a Googlebot user agent with a production build configured with `SITE_URL=https://tickets.example.com` and `SITE_INDEXABLE=true`. That origin is a test configuration, not a deployed site.

- Public home, discovery, comedy, concert, help and event pages return 200 with canonical URLs, descriptions, Open Graph and Twitter metadata in the initial head.
- Comedy and discovery event cards exist in the server HTML. Search/filter pages remain `noindex,follow`.
- Ten protected/auth routes, including the new entrance, team, attendance and message pages, remain `noindex,nofollow`; no event structured data is emitted there.
- Event JSON-LD matches the API event. No purchasable offer is advertised while checkout is disabled.
- Robots excludes `/check-in` alongside the other private route families. Public sitemaps include comedy and exclude protected routes and unpublished events.
- An unpublished event, an unknown collection, out-of-range discovery pagination and an invalid event sitemap return actual 404 responses.

The demo is restored to indexing disabled after benchmarking. Five additional HTTP checks passed for preview noindex, private metadata, robots and empty sitemaps. Production indexing still requires the real public HTTPS origin and explicit opt-in at build and runtime. Sitemap discovery and Lighthouse scores do not guarantee indexing or rich results.

## Performance report

Lighthouse **13.5.0**, three serial runs per public route against the optimized production Webpack build. Default mobile emulation (412 × 823), simulated mobile network and 4× CPU slowdown; fresh browser storage per run. Reported values are medians. These are local lab measurements, not production field Core Web Vitals or physical-phone timings.

| Page | Performance (range) | Accessibility | SEO | FCP | LCP | TBT | CLS | JS transfer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 100 (95–100) | 100 | 100 | 0.92 s | 1.75 s | 19.5 ms | 0 | 178.2 KiB |
| `/events` | 97 (96–99) | 100 | 100 | 0.91 s | 2.57 s | 17 ms | 0 | 178.0 KiB |
| `/programme/comedies` | 96 (94–96) | 100 | 100 | 0.91 s | 2.71 s | 31 ms | 0 | 178.0 KiB |

The category hero now sets an explicit high fetch priority and uses an allowed image quality of 65. Visual review retained the existing composition. Comedy page transfer decreased from **367.5 to 334.4 KiB** (about 33.1 KiB / 9.0%). The LCP priority discovery audit now passes. This is a transfer-size improvement; the timing samples are variable and do not establish a causal speedup.

LCP remains above the 2.5 s target on discovery and comedy in these median lab samples. Lighthouse also identifies shared render-blocking CSS (~15 KiB) and unused portions of framework JavaScript (~50 KiB) as remaining opportunities. Further bundle/CSS splitting and measurements on the real hosting/network are the next performance work.

Operational pages paginate at 12 records and have no polling. Code validation makes one explicit POST per submission. Team changes invalidate the relevant cached lists. Public catalogue reads remain server-rendered, with request-level deduplication and automatic catalogue prefetch disabled. Inventory and prices are not persistently cached. The local font and responsive image optimizations from the earlier PR batch remain in place.

## Automated checks

- Frontend: production builds, lint, TypeScript, changed-file formatting and **28 Vitest tests** passed, including four entrance/response boundary regressions.
- Backend: build, TypeScript, lint, **2,933 unit tests** (two existing skips), **237 HTTP tests** and **34 architecture checks** passed. Unit tests used `--maxWorkers=2`. Four existing lint warnings in `money.vo.ts` remain; no new lint errors were introduced.
- Demo seed: migrations and repeated transaction-based seeding passed against the loopback-only demo database.

Camera scanning, payment collection, offline entry validation and financial reports are not part of this change. Entry accepts a pasted QR payload or an external reader. The existing platform analytics refresh issue remains outside this UI work.
