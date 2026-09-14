# Tickr — Global Design Direction

**Scope:** the visual and interaction foundation for Tickr as a **multi-market product**, superseding
the Tunisia-only assumptions in [Phase 1](../08-frontend/02-product-design-brief.md) where they
conflict, and extending everything else.
**Stance:** one global design system, **activated market by market** — matching the roadmap in
[§A.5 of the brief](../08-frontend/02-product-design-brief.md#a5-product-horizon--from-tunisian-ticketing-to-a-global-event-network)
and [§9 of the product handoff](../09-product-and-growth/01-executive-product-growth-handoff.md).
Nothing here asks the team to launch worldwide; it asks that nothing built for Tunisia has to be
torn down when the second market opens.
**Status:** Proposed — every contrast ratio below is computed, not estimated.
**Date:** 2026-09-15

---

## Contents

| | Section |
|---|---|
| 1 | [What changes when the product is global](#1-what-changes-when-the-product-is-global) |
| 2 | [Brand core that does not change](#2-brand-core-that-does-not-change) |
| 3 | [Typography — a script-complete stack](#3-typography--a-script-complete-stack) |
| 4 | [Colour — global core, full dark theme, accent slots](#4-colour--global-core-full-dark-theme-accent-slots) |
| 5 | [Direction, layout and RTL](#5-direction-layout-and-rtl) |
| 6 | [Money, numbers, dates and time](#6-money-numbers-dates-and-time) |
| 7 | [Language, copy and text expansion](#7-language-copy-and-text-expansion) |
| 8 | [Imagery across markets](#8-imagery-across-markets) |
| 9 | [Payment presentation per market](#9-payment-presentation-per-market) |
| 10 | [Accessibility as a global baseline](#10-accessibility-as-a-global-baseline) |
| 11 | [The market configuration](#11-the-market-configuration) |
| 12 | [Token additions (TailwindCSS 4)](#12-token-additions-tailwindcss-4) |
| 13 | [Decisions locked · decisions open](#13-decisions-locked--decisions-open) |

---

## 1. What changes when the product is global

The Tunisia-first brief got the hard part right: a **poster-first gallery** with a calm, warm frame,
one action colour, and trust engineered into the money path. None of that is Tunisian. What *is*
Tunisian in the current foundation, and has to become a market setting rather than a constant:

| Assumption baked into V1 | Where it lives today | What it becomes |
|---|---|---|
| French is the only UI language | `layout.tsx` `lang="fr"`, all copy examples | A locale per market, with **English as the system default** and French/Arabic as first-class locales |
| Left-to-right only | Physical CSS (`ml-`, `pl-`, `left-`) allowed | **Logical properties only**; RTL is a first-class mode, not a later flip |
| Display type is Latin-only (Archivo) | Phase 1 §D.3 | A **script-complete stack**: a display face and a UI face *per script*, with a universal fallback |
| One currency, three decimals | `currency.vo.ts` (TND/EUR/USD), millime rules | Formatting driven entirely by `Intl` and the currency's minor-unit count; no hard-coded "DT" |
| Konnect/Paymee first, Stripe third | Phase 1 §F.5 | A **provider order per market** — local rails first *in that market* |
| Light theme only; dark used as accent surfaces | Phase 1 §D.2 | A **full, validated dark theme** — dark mode is the default on a large share of phones worldwide |
| One timezone | Implicit | Times shown in the **event's** timezone, labelled, with the viewer's offset when it differs |
| WCAG 2.1 AA | Phase 1 §H | **WCAG 2.2 AA** as the global floor (adds target size, focus-not-obscured, dragging alternatives) |
| "vous" register, French idiom | Phase 1 §C.3 | A **tone guide per locale**, translated by people, never machine-only, with a glossary |

The rule that keeps this manageable: **markets configure; they do not fork.** A new market is a
configuration file plus translated strings plus a payment-provider order, never a new component
tree.

---

## 2. Brand core that does not change

These carry across every market and are the identity of the product:

- **The governing idea** — *the poster is the product, the interface is the frame.* Colour enters a
  screen through event imagery; the chrome stays quiet. This is the single most portable decision in
  the system, because it makes the interface neutral to whatever culture's posters hang in it.
- **One action colour** — Cobalt `#2E3DE8` remains the sole interactive colour, everywhere. It is
  saturated enough to read as "the product" and neutral enough to carry no strong cultural meaning.
- **Warm neutrals** — the off-white gallery ground `#F8F7F4` and the ink scale. Warm paper reads as
  premium and photographic in every market tested; cool grey reads as "software".
- **The five UX principles** ([Phase 1 §E](../08-frontend/02-product-design-brief.md#e-ux-principles))
  — two taps to checkout and no login before the price; availability stated in words and numbers;
  fees disclosed the instant a quantity exists; the hold as a visible contract in relative and
  absolute form; every failure names its cause, its money implication and one way forward.
- **Trust through structure, not badges** — persistent price breakdown, named provider, visible
  countdown, quotable order reference. This matters *more* in markets with high online-payment
  trust, not less: those users notice missing structure faster.
- **Sober money, loud events** — the transactional surfaces are still and neutral; discovery is
  energetic. The separation is by surface, never a compromise in the middle.

What does *not* travel unchanged is the accent (see §4.4) and the tone of voice (see §7).

---

## 3. Typography — a script-complete stack

The V1 pairing — **Archivo** (display) + **Inter** (UI/body) — is kept for Latin script. Archivo
covers Latin and Latin-Extended only; Inter covers Latin, Cyrillic and Greek. Neither covers
Arabic, Hebrew, Devanagari or CJK. A global product therefore needs a *pairing per script*, chosen
so the page never changes character when the script changes.

### 3.1 The stack

| Role | Latin · Cyrillic · Greek | Arabic (incl. Persian/Urdu forms) | Hebrew | Everything else |
|---|---|---|---|---|
| **Display** — event titles, page heroes | **Archivo** 600–800, tracking −1.5 % to −2 % | **Cairo** 700–800 — geometric, high-impact, widely used in MENA, sits well beside Archivo's width and weight | **Heebo** 700–800 — designed as a Hebrew companion to a grotesque | `Noto Sans` display weight from the system |
| **UI / body** — everything else, all money | **Inter** 400–600, tabular figures | **IBM Plex Sans Arabic** 400–600 — the most legible Arabic UI face at small sizes on low-density screens, with a Latin x-height match to Inter that keeps mixed strings level | **Heebo** 400–500 | `Noto Sans` |
| **Universal fallback** | `Noto Sans` → `system-ui` | `Noto Sans Arabic` → `system-ui` | `Noto Sans Hebrew` → `system-ui` | `Noto Sans <Script>` → `system-ui` |

All are on Google Fonts, all are variable or multi-weight, all load via `next/font/google` with
`display: 'swap'`. **CJK markets are explicitly out of scope until one is planned**; when it is,
the answer is `Noto Sans JP/SC/KR` from the system, never a bundled webfont.

### 3.2 Loading budget

The V1 rule — *two families, variable* — becomes **two families per active script, loaded only
for locales the market enables.** A Tunisian page loads Archivo + Inter for French, and adds Cairo +
Plex Arabic only when the user switches to Arabic. Subsetting is by `unicode-range`, so a French
page in Tunisia never downloads Arabic glyphs.

```ts
// app/fonts.ts — one place, per-script, subset-scoped
import { Archivo, Inter, Cairo, IBM_Plex_Sans_Arabic } from 'next/font/google';

export const archivo = Archivo({ subsets: ['latin', 'latin-ext'], variable: '--font-display-latin', display: 'swap' });
export const inter   = Inter({   subsets: ['latin', 'latin-ext', 'cyrillic', 'greek'], variable: '--font-ui-latin', display: 'swap' });
export const cairo   = Cairo({   subsets: ['arabic'], weight: ['700', '800'], variable: '--font-display-arabic', display: 'swap' });
export const plexAr  = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600'], variable: '--font-ui-arabic', display: 'swap' });
```

```css
/* Font stacks resolve per script automatically — the browser picks the first face with the glyph */
--font-display: var(--font-display-latin), var(--font-display-arabic), 'Noto Sans', system-ui, sans-serif;
--font-sans:    var(--font-ui-latin),      var(--font-ui-arabic),      'Noto Sans', system-ui, sans-serif;
```

### 3.3 Script-specific type rules

| Rule | Latin | Arabic | Why |
|---|---|---|---|
| Body minimum | 16 px | **17 px** | Arabic letterforms are shorter and denser; one size step keeps effective legibility equal |
| Body line-height | 1.5 | **1.7** | Arabic ascenders/descenders and diacritics need vertical room |
| Display tracking | −1.5 % to −2 % | **0** — never negative | Tightening Arabic breaks connected letterforms |
| Uppercase overlines | allowed | **not applicable** — use weight and size | Arabic has no case |
| Italic | allowed for emphasis | **never** — use weight | Slanted Arabic is a Latin habit, not an Arabic convention |
| Tabular figures for money | mandatory | mandatory — with the **digit system fixed per locale** (see §6.2) | A countdown must not jitter in any script |
| Truncation | ellipsis `…` | ellipsis `…` on the **logical end** | Handled by `text-overflow` + logical direction |

The nine-step scale from Phase 1 stays, with Arabic applying the +1 px body rule via the locale
class, not by re-declaring tokens.

---

## 4. Colour — global core, full dark theme, accent slots

### 4.1 The core does not move

Cobalt, Sun, the warm neutrals and the semantic triad are kept exactly as locked in Phase 1 §D.2 —
every ratio there was computed and the two hard rules (`ink-400` never text on light; `ink-500`
never on `surface-2`) still stand.

### 4.2 Cultural colour — what to know, what to do

Colour meaning varies enough across markets that a global product should never let colour carry a
meaning *alone*. The system already forbids that (every status pairs colour with a label and an
icon). Beyond that rule:

| Colour | Where it reads differently | What Tickr does |
|---|---|---|
| **Red** | Danger in the West; luck and celebration in China; mourning in parts of Africa | Danger stays `danger-*` **with a label**; red is never used as a festive accent |
| **Green** | Success in most markets; religious weight in parts of MENA; currency/"go" in the US | Success only, always labelled; never a brand or accent colour |
| **White** | Purity in the West; mourning in parts of East and South Asia | The canvas is warm off-white, not pure white, which sidesteps the association |
| **Yellow / gold** | Warmth and sun in the Mediterranean; caution in the US; royalty in Asia | Sun stays an *attention* accent tied to scarcity, never a warning — that is `warning-*` |
| **Purple** | Luxury in the West; mourning in parts of Latin America and Thailand | Offered only as an optional accent slot (§4.4), never a default |

### 4.3 The full dark theme — validated

Dark mode is the default on a majority of Android phones in many of Tickr's future markets. V1
deferred it; the global system ships it, on the same warm-ink family so the brand does not shift.

| Token | Hex | Role | Verified contrast |
|---|---|---|---|
| `dk-canvas` | `#0B0F1A` | Page ground (= `ink-950`) | — |
| `dk-surface` | `#141926` | Cards, sheets | — |
| `dk-surface-2` | `#1C2233` | Inset blocks, order summary | — |
| `dk-text` | `#E8E6E1` | Primary text (= `ink-100`) | on canvas **15.34 : 1** · surface **14.07 : 1** · surface-2 **12.70 : 1** ✅ AAA |
| `dk-text-2` | `#B8BDC7` | Body / supporting | on surface-2 **8.40 : 1** ✅ AAA |
| `dk-text-3` | `#9CA3AF` | Metadata (= `ink-400`) | on canvas **7.54 : 1** · surface **6.91 : 1** · surface-2 **6.24 : 1** ✅ AA — *the one place `ink-400` is text* |
| `dk-border` | `#2A3145` | Decorative hairline | 1.36 : 1 — decorative only, like light `border` |
| `dk-border-strong` | `#8A9099` | **Control boundaries** | on surface **5.46 : 1** · surface-2 **4.92 : 1** ✅ clears 3 : 1 non-text |
| `dk-action` | `#8F9BFF` (cobalt-300) | Links, active states, focus ring on dark | on surface **6.94 : 1** · surface-2 **6.26 : 1** ✅ AA; ink text on it **7.56 : 1** ✅ AAA |
| `dk-action-fill` | `#2E3DE8` (cobalt-600) | Primary button fill — unchanged | white on it **7.12 : 1** ✅ AAA |
| `dk-accent` | `#FFD23F` (sun-400) | Scarcity, countdown attention | on canvas **13.25 : 1** · surface-2 **10.97 : 1** ✅ AAA |
| `dk-success` | `#34D399` | Success text/icon | on canvas **9.95 : 1** · surface-2 **8.24 : 1** ✅ AAA |
| `dk-warning` | `#FBBF24` | Warning text/icon | on canvas **11.46 : 1** ✅ AAA |
| `dk-danger` | `#F87171` | Danger text/icon | on canvas **6.92 : 1** · surface-2 **5.73 : 1** ✅ AA |

Two rules that fall out of the numbers: **dark surfaces separate by a hairline, never by value**
(surface vs surface-2 is 1.2 : 1 — invisible), and **the primary button keeps its cobalt-600 fill on
dark** rather than switching to a tint, so the one action colour is literally the same pixel in
both themes.

Theme selection: `prefers-color-scheme` by default, with an explicit user override stored per
device. The ticket pass and scanner, which were "dark surfaces" in V1, become simply *the dark
theme applied locally* — one system, not two.

### 4.4 Accent slots — how a market or campaign gets its own energy without a fork

Sun is the global accent. Some markets and some event categories will want a different energy —
a nightlife-heavy market, a sports partnership, a festival season. Rather than let every market
repaint the product, the system defines **one accent slot** with a **validated set of alternates**.
A market configuration may pick one; a component only ever references `--color-accent-*`.

| Slot value | 500 (fills, with **ink** text) | 600 (fills, with **white** text) | 700 (text on light) | 100 (tint) | Verified |
|---|---|---|---|---|---|
| **Sun** *(default)* | `#FFD23F` — ink **13.25 : 1** | — (never white on sun) | `#8A5B00` — **5.87 : 1** | `#FFF8E1` | ✅ |
| **Coral** | `#FF5C4D` — ink **6.28 : 1** | `#D6341E` — white **4.81 : 1** | `#B3261E` — **6.54 : 1**; on tint **5.39 : 1** | `#FFE3DF` | ✅ |
| **Mint** | `#1FBFA5` — ink **8.25 : 1** | *(no 600 — mint fails with white text)* | `#0B6657` — **6.88 : 1**; on tint **6.22 : 1** | `#E3F8F3` | ✅ |
| **Violet** | `#7C5CFF` — ink 4.40 : 1 *(large text/UI only)* | `#5F3DF5` — white **6.05 : 1** | `#4B2FC9` — **8.24 : 1**; on tint **6.63 : 1** | `#E9E3FF` | ✅ with the 500 caveat |

On dark surfaces the 500 values are used as text/icon directly: coral **6.28 : 1**, mint
**8.25 : 1** on `dk-canvas` ✅; violet 4.40 : 1 is **large-text only** on dark.

**Accent rules, unchanged from Phase 1 and now global:** the accent is never the primary button
(that is cobalt), never an error, never a large background. It marks scarcity, momentum and brand
moments. Coral is the one alternate that visually neighbours `danger` — a market choosing it must
keep danger's icon + label pairing strictly, which the system already mandates.

---

## 5. Direction, layout and RTL

RTL is not a flip applied late; it is a constraint on how every component is written from the
first line.

1. **Logical properties only.** `ps-4` not `pl-4`, `ms-auto` not `ml-auto`, `start-0` not
   `left-0`, `text-start` not `text-left`, `border-s` not `border-l`. Tailwind 4 supports all of
   these; a lint rule bans the physical forms outside explicitly-exempt files.
2. **`dir` is set on `<html>` from the locale**, never per component. Components read direction
   from CSS, not from props.
3. **What mirrors and what does not.** Navigation and progress arrows mirror. Back chevrons mirror.
   Carousel direction mirrors. **Clocks, play buttons, checkmarks, brand marks, QR codes and
   photographs do not.** Heroicons that imply direction are wrapped once with an `rtl:-scale-x-100`
   helper; the list of *which* icons is a maintained allowlist, not a per-use decision.
4. **Bidirectional text.** Mixed strings — an Arabic sentence containing a Latin event title or a
   number with a currency code — are wrapped with `unicode-bidi: isolate` (`<bdi>`), so a Latin
   title does not drag the punctuation around it. Prices are always rendered inside `<bdi>`.
5. **Layout does not mirror gratuitously.** The event page's desktop *right rail* becomes a *start
   rail* — it sits at the inline-end in both directions. Sticky bars, bottom tabs and sheets are
   direction-neutral by construction.
6. **Numerals** follow §6.2. The countdown, the stepper and the price never change digit system
   mid-screen.
7. **Text expansion** budgets from §7 apply to buttons and tabs, which are the first things to
   break under a longer language.

A **visual QA gate**: every component's story is rendered in `ltr` and `rtl`, in light and dark,
before it is accepted. Four screenshots per component, automated.

---

## 6. Money, numbers, dates and time

### 6.1 Money

Formatting is **entirely `Intl`-driven from the market locale and the order's currency** — the
hard-coded "DT" and the millime rule become properties of the currency, not of the component.

| Currency | Minor units | V1 display rule | Formatted by `Intl.NumberFormat(locale, { style: 'currency', currency })` |
|---|---|---|---|
| **TND** | **3** (millimes) | Minor units only when non-zero: `50 DT` · `52,500 DT`; totals always full precision | `fr-TN` → `52,500 DT` · `ar-TN` → `52٫500 د.ت.` · `en` → `TND 52.500` |
| **EUR** | 2 | Always 2 decimals | `fr-FR` → `52,50 €` · `de-DE` → `52,50 €` · `en-IE` → `€52.50` |
| **USD** | 2 | Always 2 decimals | `en-US` → `$52.50` |
| *(future)* JPY, KRW | 0 | No decimals | `ja-JP` → `￥5,250` |

Rules that survive every locale: `tabular-nums` always; the amount inside `<bdi>`; a non-breaking
space where the locale puts one; the total the heaviest number on screen; **the value comes from
the API, never computed on the client** — and the currency code comes with it. The backend's
`Currency` enum (TND, EUR, USD — `currency.vo.ts`) is the source of the supported list; the
frontend must not format a currency the enum does not carry.

The V1 "millimes only when non-zero" rule is the correct default for **any** 3-minor-unit currency
(TND, KWD, BHD, OMR, JOD) and is expressed as `minimumFractionDigits: hasFraction ? 3 : 0`, not as
a TND special case.

### 6.2 Numerals and digit systems

Default is **Western Arabic digits (0–9) in every locale**, including `ar`. This is the safer
default for a ticketing product: prices, countdowns and reference codes must match what a bank
statement, a card terminal and a door scanner show. A locale may opt into Eastern Arabic digits
(`٠–٩`) via `Intl` numbering-system extension (`ar-TN-u-nu-arab`) **only for editorial text**,
never for money, codes or timers.

### 6.3 Dates and time

- Events are displayed in **the event's own timezone**, always with an explicit zone label when it
  differs from the viewer's (`21:00 CET · 20:00 chez vous`). A viewer in Paris buying a Tunis event
  must never be off by an hour.
- The backend stores instants; the event must carry a `timezone` (see the readiness audit) —
  without it, "21:00" is ambiguous the moment a second market exists.
- Formatting via `Intl.DateTimeFormat` / `date-fns` with the market locale: `ven. 12 sept., 21:00`
  (fr) · `Fri 12 Sep, 21:00` (en-GB) · `Fri, Sep 12, 9:00 PM` (en-US) · `الجمعة 12 سبتمبر، 21:00` (ar).
  12/24-hour is a locale property, never a global setting.
- **Relative time is capped**: "in 3 days" is fine; "in 2 months" is not — beyond 7 days the
  absolute date is shown, because relative phrasing hides the weekday, which is what an event-goer
  actually decides on.
- The reservation countdown keeps its dual form — `Il reste 12:34` **and** `jusqu'à 21:45` — and the
  absolute form is rendered in the *viewer's* timezone, since it is the viewer's clock they will
  check.

---

## 7. Language, copy and text expansion

- **Every string is externalised** (already a V1 rule). The message catalogue uses ICU MessageFormat
  for plurals and gender — French, Arabic and English pluralise differently (Arabic has six plural
  forms), and `n === 1 ? 'billet' : 'billets'` is a bug in two of the three.
- **English is the source language** for the catalogue, even though French ships first: it is the
  language most translators work *from*, and it keeps keys readable. French and Arabic are
  translations *by people*, reviewed by a native speaker of the *market's* variety (Tunisian Arabic
  register is not Gulf Arabic register).
- **Tone per locale**, not one tone translated. The V1 "warm *vous*" is a French decision. English
  is direct and second-person; Arabic uses the standard polite register with Tunisian colloquial
  allowed only in editorial surfaces, never in money or error copy.
- **Money and error copy is never colloquial in any language** — the three-part failure shape (what
  happened · what it means for your money · what to do) is preserved verbatim in structure.
- **Text expansion budget**: components are designed at English width and must survive
  **+35 %** (French, German, Portuguese) without truncating a primary action, and **−15 % / different
  height** (Arabic, which is often shorter but taller). Buttons wrap to two lines before they
  truncate; tabs never truncate — a tab label that does not fit is a label that must be shortened
  in the catalogue.
- **Names are free text, Unicode-safe, one field where the market allows.** "First / last name" is
  a Western assumption; the market configuration decides the name shape, and the ticket shows what
  the holder typed.

---

## 8. Imagery across markets

The V1 rules hold — fixed aspect ratios, a scrim behind any overlaid text, no filters on organizer
art, a deterministic category-tinted fallback — and three more become necessary:

1. **Never rely on text inside a poster.** Organizers in every market bake titles, dates and prices
   into their artwork in their own language. The interface must repeat the facts in structured
   fields, and must never assume the poster's text is readable by the viewer.
2. **Fallback and empty-state artwork is culture-neutral**: abstract, typographic, or built from the
   category glyph. No illustrated people, no landmarks, no holidays.
3. **Alt text is the event title in the event's language**, not translated — a screen reader user
   in Paris should hear the Arabic title of a Tunis event as it is, because that is what is on the
   ticket.

---

## 9. Payment presentation per market

The three-provider radio-card pattern from Phase 1 §F.5 is kept; **the order and the labels come
from the market configuration**, not from the component.

| Market (example) | Provider order | Label (localised) | Mechanism |
|---|---|---|---|
| Tunisia | Konnect → Paymee → Stripe | « Carte bancaire tunisienne » · « Carte internationale » | `paymentUrl` redirect ×2 · `clientSecret` in-page |
| France / EU | Stripe (cards, Apple Pay, Google Pay via Stripe) | "Card" · "Apple Pay" | `clientSecret` in-page |
| United States | Stripe | "Card" · "Apple Pay" · "Google Pay" | `clientSecret` in-page |
| *(any new market)* | from config; **local rail first if one exists** | from catalogue | as returned by the API |

Two invariants hold in every market: the **redirect is announced before it happens** and the
**return screen polls, never guesses**. Wallet buttons (Apple/Google Pay) are shown only when the
device reports availability — they are never a greyed placeholder.

The backend's `PaymentMethod` enum today is `STRIPE | KONNECT | PAYMEE`; the readiness audit records
what each adapter actually supports. Until a provider is verified for a currency, the market config
must not list it.

---

## 10. Accessibility as a global baseline

**WCAG 2.2 Level AA** is the floor for every market (it is the reference for the EU's EN 301 549
and for most public-sector procurement worldwide). Beyond the Phase 1 §H obligations, 2.2 adds:

- **Target size (2.5.8)** — minimum 24 × 24 CSS px; the system's 44 px baseline already exceeds it.
- **Focus not obscured (2.4.11)** — sticky bars and bottom sheets must never cover a focused control;
  the sticky purchase bar reserves its height in the scroll padding.
- **Dragging movements (2.5.7)** — every swipe (carousel, sheet dismiss) has a tap alternative.
- **Consistent help (3.2.6)** and **redundant entry (3.3.7)** — support links sit in the same place
  on every screen; holder details are never asked twice in one checkout.
- **Accessible authentication (3.3.8)** — no cognitive-function tests; password managers and
  paste are never blocked.

Script-specific: Arabic and Hebrew screen-reader testing (VoiceOver / TalkBack in `ar`) is part of
the RTL QA gate, because a mirrored layout with an LTR reading order is a common, invisible failure.

---

## 11. The market configuration

Everything market-specific lives in **one typed configuration object per market**, versioned in the
repo, loaded by locale. Components never branch on "Tunisia"; they read the config.

```ts
// config/markets/tn.ts
export const TN: MarketConfig = {
  code: 'TN',
  locales: ['fr-TN', 'ar-TN'],          // first = default for the market
  defaultLocale: 'fr-TN',
  currency: 'TND',                      // must exist in the backend Currency enum
  numberingSystem: 'latn',             // digits — never 'arab' for money
  timeZone: 'Africa/Tunis',            // display fallback when an event carries none
  hourCycle: 'h23',
  paymentOrder: ['KONNECT', 'PAYMEE', 'STRIPE'],
  accent: 'sun',                       // one of the validated accent slots
  nameShape: 'first-last',             // or 'single'
  phone: { country: 'TN', example: '+216 20 000 000' },
  legal: { terms: '/legal/cgu', privacy: '/legal/confidentialite', refunds: '/legal/remboursements' },
  support: { email: 'support@tickr.tn', hours: 'Lun–Sam 9h–19h' },
  taxDisplay: 'inclusive',             // prices shown tax-inclusive
  features: { arabicUi: true, walletPay: false },
};
```

```ts
// config/markets/fr.ts — the second market is a file, not a fork
export const FR: MarketConfig = {
  code: 'FR', locales: ['fr-FR', 'en-GB'], defaultLocale: 'fr-FR', currency: 'EUR',
  numberingSystem: 'latn', timeZone: 'Europe/Paris', hourCycle: 'h23',
  paymentOrder: ['STRIPE'], accent: 'sun', nameShape: 'first-last',
  phone: { country: 'FR', example: '+33 6 12 34 56 78' },
  legal: { terms: '/legal/cgv', privacy: '/legal/confidentialite', refunds: '/legal/remboursements' },
  support: { email: 'support@tickr.fr', hours: 'Lun–Ven 9h–18h' },
  taxDisplay: 'inclusive', features: { arabicUi: false, walletPay: true },
};
```

The market is resolved from the URL (`/tn/…`, `/fr/…`) or a domain, **never from IP geolocation
alone** — a Tunisian in Paris buying a Tunis event must land in the Tunisia market. Locale is a
separate, user-changeable choice within the market's allowed list.

---

## 12. Token additions (TailwindCSS 4)

Additions to the Phase 7 `@theme`; nothing there is removed or renamed.

```css
@theme {
  /* ── Fonts, per script (resolved by unicode-range; see §3.2) ─────── */
  --font-display: var(--font-display-latin), var(--font-display-arabic), 'Noto Sans', system-ui, sans-serif;
  --font-sans:    var(--font-ui-latin),      var(--font-ui-arabic),      'Noto Sans', system-ui, sans-serif;

  /* ── Accent slot — a market sets these; components use only these ── */
  --color-accent-500: var(--accent-500, #FFD23F);
  --color-accent-600: var(--accent-600, #F5B80B);
  --color-accent-700: var(--accent-700, #8A5B00);
  --color-accent-100: var(--accent-100, #FFF8E1);

  /* ── Dark theme (validated — see §4.3) ──────────────────────────── */
  --color-dk-canvas:        #0B0F1A;
  --color-dk-surface:       #141926;
  --color-dk-surface-2:     #1C2233;
  --color-dk-text:          #E8E6E1;   /* 15.34:1 on canvas  */
  --color-dk-text-2:        #B8BDC7;   /*  8.40:1 on surface-2 */
  --color-dk-text-3:        #9CA3AF;   /*  6.24:1 on surface-2 */
  --color-dk-border:        #2A3145;   /* decorative only     */
  --color-dk-border-strong: #8A9099;   /*  4.92:1 on surface-2 — controls */
  --color-dk-action:        #8F9BFF;   /*  6.26:1 on surface-2 */
  --color-dk-success:       #34D399;
  --color-dk-warning:       #FBBF24;
  --color-dk-danger:        #F87171;
}

/* Theme + direction are set on <html>, read everywhere, branched on nowhere */
:root                              { color-scheme: light; }
:root[data-theme="dark"]           { color-scheme: dark; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; } }

/* Accent slot — a market overrides the four variables; e.g. data-accent="coral" */
:root[data-accent="coral"]  { --accent-500:#FF5C4D; --accent-600:#D6341E; --accent-700:#B3261E; --accent-100:#FFE3DF; }
:root[data-accent="mint"]   { --accent-500:#1FBFA5; --accent-600:#1FBFA5; --accent-700:#0B6657; --accent-100:#E3F8F3; }
:root[data-accent="violet"] { --accent-500:#7C5CFF; --accent-600:#5F3DF5; --accent-700:#4B2FC9; --accent-100:#E9E3FF; }

/* Script-specific type metrics — applied by lang, not by re-declaring tokens */
:lang(ar) { --text-body: 1.0625rem; --text-body--line-height: 1.7; letter-spacing: 0; font-style: normal; }

/* Focus ring already swaps per surface (Phase 7); dark theme reuses the sun ring */
:root[data-theme="dark"] { --ring: var(--color-dk-accent, #FFD23F); --ring-offset: var(--color-dk-canvas); }
```

Lint rules added to the Phase 11 list: **no physical-direction utilities** (`ml-`, `pl-`, `left-`,
`text-left`, `border-l`…) outside an allowlist; **no `font-style: italic` under `:lang(ar)`**;
**no currency symbol or decimal count in source** — only `Intl`.

---

## 13. Decisions locked · decisions open

### Locked by this document

1. **One global design system, activated market by market** via a typed `MarketConfig`. Markets configure; they never fork.
2. **Brand core is invariant**: poster-first gallery, cobalt as the sole action colour, warm neutrals, the five UX principles, structural trust.
3. **Typography is script-complete**: Archivo + Inter (Latin/Cyrillic/Greek), Cairo + IBM Plex Sans Arabic (Arabic), Heebo (Hebrew), Noto Sans as the universal fallback; two families per active script, subset by `unicode-range`.
4. **Arabic type metrics**: body 17 px / 1.7, zero tracking, no italics, no uppercase — applied by `:lang(ar)`.
5. **A full dark theme ships**, on the validated tokens in §4.3; the primary button keeps its cobalt-600 fill in both themes; dark surfaces separate by hairline.
6. **One accent slot**, four validated values (sun default, coral, mint, violet); the accent is never a primary button, never an error, never a large fill.
7. **Colour never carries meaning alone** — already a rule, now the answer to every cross-cultural colour question.
8. **Logical CSS properties only**; RTL is a first-class mode gated by a four-way visual QA (ltr/rtl × light/dark).
9. **Money is `Intl`-formatted from locale + currency**; Western digits for all money, codes and timers in every locale; the API supplies value and currency.
10. **Times display in the event's timezone, labelled**, with the viewer's offset when different.
11. **English is the catalogue source language**; French and Arabic are human translations in the market's register; ICU plurals throughout.
12. **WCAG 2.2 AA** is the global floor; RTL screen-reader testing is part of the gate.
13. **Payment provider order comes from the market config**, local rail first; redirect announced, return polled.
14. **Market resolves from URL/domain, never IP alone.**

### Open — needs a product or backend decision

Each of these was checked in code by the readiness audit ([05](05-gaps-global-readiness.md)); none is
a guess.

- **Event `timezone` does not exist** and every timestamp column is `timestamp` *without* time zone
  (`event.orm-entity.ts:97-101`). Before any second-market event: `timestamptz`, an IANA
  `events.timezone`, and `TZ=UTC` pinned in the runtime ([05 G-04](05-gaps-global-readiness.md)).
- **Konnect and Paymee are TND-only in code** — Konnect multiplies by 1 000 and labels `'TND'`
  (`konnect.adapter.ts:59,70`); the provider port has no capability API, and the client chooses the
  provider. The market config must not list a provider for a currency it cannot settle, and the
  backend needs `supports(currency, country)` ([05 G-01](05-gaps-global-readiness.md)).
- **No user `preferredLocale` and a single-language template schema** — emails and SMS cannot be
  sent in the user's language until `users.locale` and a `(slug, locale)` template key exist
  ([05 G-03](05-gaps-global-readiness.md)).
- **The PDF ticket cannot render Arabic** — Helvetica has no Arabic glyphs, dates are `en-US`
  without a timezone, and `toFixed(2)` drops millimes ([05 G-08](05-gaps-global-readiness.md)).
  The PDF is a backup artefact; the web pass is the primary ticket, which is why §3 matters more.
- **Name shape per market** (`first-last` vs `single`) and a Unicode-safe name rule — the current
  regex rejects Arabic letters (`update-profile.dto.ts:19,28`).
- **Tax display** (inclusive vs exclusive) is a legal decision per market that the config expresses
  but does not decide; no tax fields exist yet ([05 G-12](05-gaps-global-readiness.md)).
- **Trademark and domains** — `tickr.tn` is the launch domain (and `.env.example` still references
  `api.tick-r.tn`); the name and domains for other markets are a business decision this document
  does not make.

---

**Prev:** [07 — Documentation gaps](07-gaps-documentation.md) · **Index:** [README](README.md)
