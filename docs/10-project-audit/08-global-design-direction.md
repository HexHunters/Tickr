# Tickr — Global Design Direction · *Chaux & Faïence*

**Scope:** the visual and interaction foundation for Tickr as a **multi-market product**. This edition
replaces the rejected cobalt/sun palette with a pastel direction, **Chaux & Faïence**, chosen from four
independent concepts by a three-judge panel and then hardened: every text and control pair below was
**computed** (WCAG 2.2), not eyeballed — 124 pairs, 0 failures.
**Stance:** one global design system, **activated market by market** — as the roadmap in
[§A.5 of the brief](../08-frontend/02-product-design-brief.md#a5-product-horizon--from-tunisian-ticketing-to-a-global-event-network)
and [§9 of the product handoff](../09-product-and-growth/01-executive-product-growth-handoff.md) require.
**Supersedes:** Phase 1 §D.2 / §K colour tokens and Phase 7's colour block ([notes added there](../08-frontend/README.md)).
Everything non-colour in those phases — UX principles, purchase flow, error UX, accessibility, responsive strategy — stands.
**Visual edition:** [10 — with images](10-global-design-direction-visual.md).
**Date:** 2026-09-15.

---

## Contents

| | Section |
|---|---|
| 1 | [The idea — an afternoon walk down from Sidi Bou Saïd](#1-the-idea--an-afternoon-walk-down-from-sidi-bou-saïd) |
| 2 | [What stays from the earlier brief](#2-what-stays-from-the-earlier-brief) |
| 3 | [Colour — chalk, glaze, ink, one door](#3-colour--chalk-glaze-ink-one-door) |
| 4 | [The ten glazes — category colour](#4-the-ten-glazes--category-colour) |
| 5 | [Night — the same wall, lamplit](#5-night--the-same-wall-lamplit) |
| 6 | [Signature motifs](#6-signature-motifs) |
| 7 | [Typography — sun-bleached print, script-complete](#7-typography--sun-bleached-print-script-complete) |
| 8 | [Direction, layout and RTL](#8-direction-layout-and-rtl) |
| 9 | [Money, numbers, dates and time](#9-money-numbers-dates-and-time) |
| 10 | [Language, imagery, payments, accessibility, market config](#10-language-imagery-payments-accessibility-market-config) |
| 11 | [Token block (TailwindCSS 4)](#11-token-block-tailwindcss-4) |
| 12 | [Why it is not generic](#12-why-it-is-not-generic) |
| 13 | [Decisions locked · decisions open](#13-decisions-locked--decisions-open) |

---

## 1. The idea — an afternoon walk down from Sidi Bou Saïd

The palette is one afternoon walk down from Sidi Bou Saïd to the water: limewashed walls so bright at noon they turn faintly blue in shadow, the door blue seen through sea haze until it powders down to a tint, Djerba clay and jasmine and sea glass picked up on the way, and a festival poster that has been sun-bleaching on stucco for three summers. In the product that walk becomes a chalk canvas that is never pure white, one deep "door blue" that is the only thing on the screen you can press, ten pastel glazes borrowed from Nabeul ceramics that colour-code the categories, and a warm clay accent reserved strictly for scarcity. The organiser's poster is the only saturated object on any screen; everything around it is chalk, glaze and ink, so a loud poster reads as art hung on a whitewashed wall rather than a banner in a dashboard. Checkout drops the glazes entirely and keeps only chalk, ink and the door blue — money is handled on a bare wall — and the glaze returns only on the ticket stub once it is paid. At night the same wall becomes the night-blue of the Gulf of Tunis with lamplight on the ceramics: the darks are ink-tinted, the pastels are brightened to keep contrast, and nothing is a simple inversion.

**How the judges chose it.** Four concepts were developed independently — this one, a risograph
zine, a "calm candy" soft-tech palette and a dark-first nightlife scheme. Three judges (brand,
accessibility, shipping) scored them; two of three put *Chaux & Faïence* first, on the strength of a
story made of things that exist and that only Tunisia can claim, and a structural answer to the
pastel-versus-contrast problem. The runners-up contributed: the interactive-chip outline rule, the
density-based selected states, the documented forbidden pairs, the tile-frieze eyebrow, the kernel
dot, the lit-door dark button, and the "visible calm-down" at checkout. All are folded in below.

---

## 2. What stays from the earlier brief

- **The poster is the product, the interface is the frame.** This palette exists to make that true:
  the chrome is chalk, glaze and ink, so the organizer's artwork is the only saturated thing on screen.
- **One action colour, one accent, colour never alone.** The door blue is the only pressable fill;
  the clay accent marks scarcity only; every status is a label + icon + colour, never colour alone.
- **Energetic discovery, sober checkout.** Checkout is a bare wall — chalk, ink, one blue button —
  and the glaze returns only on the paid stub. The swap is *visible*: the section header's sun-fade
  turns to the neutral chalk-stone glaze, so the calm reads as a designed moment, not an absence.
- **The five UX principles, the purchase flow, the error shapes, the accessibility obligations**
  ([Phase 1 §E–§H](../08-frontend/02-product-design-brief.md)) — unchanged.
- **Full dark theme, script-complete type, logical-properties RTL, `Intl` money, WCAG 2.2 AA,
  market-by-market activation** — unchanged in principle; re-specified below on the new tokens.

---

## 3. Colour — chalk, glaze, ink, one door

The structural rule that makes pastel and AA coexist, applied once and everywhere:
**pastels are surfaces, chips and stubs; text on a pastel is always a deep ink computed for it;
white text exists on exactly three fills** — `action`, `action-pressed` and the `poster-plate`.

| Token | Hex | Role | Verified contrast |
|---|---|---|---|
| `canvas` | `#F6F1E8` | Page ground — chalk, never pure white | — |
| `surface` | `#FFFDF9` | Cards, sheets, the chalk mat | — |
| `surface-2` | `#EEE7DA` | Inset blocks, order summary, disabled fields | — |
| `ink-primary` | `#1B2A35` | Headlines, totals, the poster plate | on surface **14.46 : 1** · on canvas **13.06 : 1** ✅ AAA |
| `ink-body` | `#34434E` | Body copy; the ink for supporting text **on glazes** | on surface **10.04 : 1** · on surface-2 **8.29 : 1** ✅ AAA |
| `ink-support` | `#52606A` | Metadata, captions — tuned to clear 4.5 : 1 on **every** glaze | on surface **6.38 : 1** · on surface-2 **5.27 : 1** · worst glaze **4.68 : 1** ✅ AA |
| `border` | `#E2DACB` | Decorative hairline — tinted stone, not grey | decorative only |
| `border-strong` | `#707C84` | **Control boundaries** — inputs, steppers, chip outlines | on surface **4.21 : 1** · worst glaze **3.09 : 1** ✅ ≥ 3 : 1 |
| `action` | `#24619A` | **The door blue — the only fill you can press** | white on it **6.46 : 1** ✅ AA · edge on surface **6.36 : 1** |
| `action-pressed` | `#1A4C7B` | Pressed | white on it **8.88 : 1** ✅ AAA |
| `action-tint` | `#D9E7F3` | Selected state only, with an `action` hairline | hairline **5.13 : 1** ✅ |
| `accent` | `#E8A170` | **Djerba clay — scarcity and attention only**, always with an `accent-ink` hairline | `accent-text` on it **6.94 : 1** ✅ · hairline on canvas **6.50 : 1** |
| `accent-tint` / `accent-ink` | `#F8E1CF` / `#8A4218` | Scarcity callouts, the ink-stamp outline | ink on tint **5.80 : 1** ✅ AA |
| `success` | `#146B52` on `#D6EDE2` | Paid · checked-in — sea glass | **5.25 : 1** on tint · **6.35 : 1** on surface ✅ |
| `warning` | `#6E4E06` on `#FBEEC4` | Expiring · limited — saffron | **6.58 : 1** · **7.50 : 1** ✅ |
| `danger` | `#A3301F` on `#F9DBD3` | Failed · expired — dried harissa | **5.37 : 1** · **6.89 : 1** ✅ |
| `poster-plate` | `#1B2A35` | The only thing text may sit on over artwork | white on it **14.69 : 1** ✅ AAA |

**Three hard rules the numbers force:** `ink-support` was darkened from the proposal's `#5B6870` to
`#52606A` so it clears 4.5 : 1 on every glaze (the original failed six of ten);
`border-strong` was moved to `#707C84` so it clears 3 : 1 on every glaze; and **nothing
that is not pressable is ever filled with the door blue** — `action-tint` marks a selected state and
always carries the `action` hairline, so the state does not depend on the tint.

**Interactive chips carry a 1.5 px outline in their own ink**; non-interactive category tags do not.
That single rule is the control boundary for every filter, and it costs no new token.

### Documented forbidden pairs

Named, so they are avoided by rule rather than by luck:

| Pair | Values | Ratio |
|---|---|---|
| white on a glaze — FORBIDDEN | `#FFFFFF` on `#D3E2F1` | **1.32 : 1** ✗ |
| white on accent — FORBIDDEN | `#FFFFFF` on `#E8A170` | **2.15 : 1** ✗ |
| accent fill edge without hairline — FORBIDDEN | `#E8A170` on `#F6F1E8` | **1.91 : 1** ✗ |
| dark action on light canvas — FORBIDDEN | `#8CC0EE` on `#F6F1E8` | **1.71 : 1** ✗ |

---

## 4. The ten glazes — category colour

Borrowed from Nabeul ceramics; each glaze carries its own computed ink, light and dark. They colour
chips, the chalk mat's skirting, the stub, section sun-fades and the poster fallback — and **never the
category alone**: the label, the icon and the kernel dot are always present.

| Category | Glaze | Light tint | Ink | Ratio | Dark tint | Dark ink | Ratio |
|---|---|---|---|---|---|---|---|
| **Concert** | Sidi Bou blue through haze | `#D3E2F1` | `#1E4A78` | **6.90 : 1** | `#1B324A` | `#A9CCF0` | **7.86 : 1** |
| **Conference** | Stone slate of the medina steps | `#D9E0D8` | `#2E434D` | **7.70 : 1** | `#243540` | `#C2D0D8` | **8.03 : 1** |
| **Sport** | Sea glass | `#CFEBDD` | `#0F5A44` | **6.46 : 1** | `#153A30` | `#8ADBBB` | **7.70 : 1** |
| **Theater** | Bougainvillea on whitewash | `#F5D6E3` | `#7A2450` | **7.11 : 1** | `#432434` | `#F0B7CE` | **8.03 : 1** |
| **Workshop** | Djerba clay | `#F1D9BB` | `#7A3B1C` | **6.23 : 1** | `#43301F` | `#F1C4A3` | **7.83 : 1** |
| **Festival** | Saffron and jasmine | `#F8E8B8` | `#6A4A06` | **6.64 : 1** | `#3F3410` | `#F0D37A` | **8.36 : 1** |
| **Exhibition** | Olive and lichen on stucco | `#E3EBCB` | `#43561A` | **6.58 : 1** | `#2E3A1C` | `#CBD9A0` | **8.04 : 1** |
| **Networking** | Jasmine at dusk | `#E3D7F2` | `#4C337A` | **7.41 : 1** | `#312744` | `#CDBDEA` | **8.02 : 1** |
| **Comedy** | Dried harissa, faded | `#F8D3CA` | `#8B2E21` | **6.04 : 1** | `#472420` | `#F3B3A6` | **7.66 : 1** |
| **Other** | Chalk-stone | `#EAE0CC` | `#4A4640` | **7.15 : 1** | `#2A2E30` | `#C9C6BF` | **8.04 : 1** |

**Separation.** Judges asked for a pairwise Lab ΔE ≥ 9 between light tints. After moving Comedy
toward harissa-rose, Workshop toward tan clay, Networking toward lavender and Exhibition toward
olive, the minimum is **ΔE 7.9** (Workshop vs the neutral Other), up from 6.1 in the raw
proposal. The remaining closeness sits between the deliberately neutral `Other` and its warm
neighbours — acceptable because the label, icon and kernel dot always accompany the tint, and
because `Other` is the fallback nobody is meant to recognise by colour.

**States by density, not hue.** Hover / selected / pressed on a glazed chip or tile are the same glaze
mixed 20 % / 40 % / 100 % toward its ink — one rule instead of ten hover colours. The 20 % selected
state, computed:

| Category | Rest | Selected (20 % toward ink) | Ink | Ink on selected |
|---|---|---|---|---|
| Concert | `#D3E2F1` | `#AFC4D9` | `#1E4A78` | **5.08 : 1** |
| Conference | `#D9E0D8` | `#B5C3C3` | `#2E434D` | **5.7 : 1** |
| Sport | `#CFEBDD` | `#A9CEBE` | `#0F5A44` | **4.78 : 1** |
| Theater | `#F5D6E3` | `#DCB2C6` | `#7A2450` | **5.11 : 1** |
| Workshop | `#F1D9BB` | `#D9B99A` | `#7A3B1C` | **4.6 : 1** |
| Festival | `#F8E8B8` | `#DCC894` | `#6A4A06` | **4.91 : 1** |
| Exhibition | `#E3EBCB` | `#C5CCAB` | `#43561A` | **4.87 : 1** |
| Networking | `#E3D7F2` | `#C7BBD9` | `#4C337A` | **5.6 : 1** |
| Comedy | `#F8D3CA` | `#E1AFA4` | `#8B2E21` | **4.33 : 1** |
| Other | `#EAE0CC` | `#CCC6BB` | `#4A4640` | **5.52 : 1** |

---

## 5. Night — the same wall, lamplit

Not an inversion. The darks are the night-blue of the Gulf of Tunis, text is chalk, the glazes are
brightened only as far as contrast needs. **The door at night is lit, not painted:** a mid-blue button
with white text fails as a *boundary* on the night surfaces (the judges' sweep found no mid-blue that
passes both white text and a 3 : 1 edge), so the dark button becomes the pale door-blue with night-ink
text — which passes everything at once.

| Token | Hex | Role | Verified contrast |
|---|---|---|---|
| `dk-canvas` | `#101C26` | Night-blue of the Gulf — never black | — |
| `dk-surface` / `dk-surface-2` | `#172631` / `#20323F` | Cards / inset — separated by hairline `#2B3D4A`, never by value | — |
| `dk-ink-primary` | `#F1ECE2` | Chalk text — **never pure white on the night canvas** | on canvas **14.67 : 1** · surface-2 **11.22 : 1** ✅ AAA |
| `dk-ink-body` / `dk-ink-support` | `#D3CEC4` / `#9EAAB2` | Body / metadata | on surface-2 **8.43 : 1** / **5.57 : 1** ✅ |
| `dk-border-strong` | `#75868F` | Control boundaries | on surface-2 **3.50 : 1** ✅ |
| `dk-action` | `#8CC0EE` | **The door at night is lit, not painted** — the pale door-blue button carries night-ink text | night ink on it **8.95 : 1** ✅ AAA · edge on surface-2 **6.85 : 1** ✅ |
| `dk-action-pressed` | `#6FAEE3` | Pressed | night ink **7.27 : 1** ✅ |
| `dk-action-tint` | `#1E3B55` | Selected wash | `dk-action` hairline **6.01 : 1** ✅ |
| `dk-accent` | `#F0AE82` | Clay under lamplight — scarcity only | `dk-accent-text` on it **8.84 : 1** ✅ |
| `dk-success` / `dk-warning` / `dk-danger` | `#7FD6B4` / `#F2CF6B` / `#F49A8A` | Status text on `dk-surface-2` | **7.66** / **8.75** / **6.19 : 1** ✅ |

**Pinned surfaces.** The ticket pass and the door scanner render in **fixed tokens regardless of the
user's theme**, and the QR always sits on a chalk tile with a 16 px quiet zone — so scanning at a venue
never depends on a phone setting.

---

## 6. Signature motifs

Each is drawable in SVG; each is used in the mockups. Together they are what a competitor could not
copy without looking like Tickr.

1. **THE CHALK MAT** — every poster sits in an 8px `surface` chalk mat with a 1px `border` hairline, and a single 3px category-glaze rule along the BOTTOM edge only (a tile skirting), never a coloured border all round. Corner radius 12px on the mat, 6px on the artwork. This is how any poster, however ugly, is made to look hung rather than embedded.
2. **THE TORN STUB** — the ticket pass and the order card are split by a die-cut perforation: 10px semicircular notches punched at both edges plus a 1px dashed `borderStrong` line. Above the line: chalk `surface` with event title (Fraunces) and poster thumb; below: the stub filled with the event's category glaze, carrying the QR on a 16px-padded chalk tile and the order reference in tabular Manrope. In dark theme the stub uses the dark glaze and the QR tile stays chalk.
3. **THE FAÏENCE STAR** — a Nabeul 8-point star drawn as four rotated squares in a 1px line grid (48px cell), rendered at 6–8% `inkPrimary` opacity. Used as the texture of empty states, the pass background above the perforation, and the 24px hairline band under section headers. Never beneath text, never above 8%.
4. **THE DOOR ARCH** — organiser avatars, venue thumbnails and the loading indicator are masked as a horseshoe arch: top corners radius 999px, bottom corners 4px, aspect 5:6. Replaces the circle avatar everywhere. The loading state is the arch outline drawn in `action` blue with a chalk fill that 'whitewashes' upward.
5. **IRON STUDS** — after the nail-stud patterns on Sidi Bou doors: step indicators, pagination dots and the quantity stepper are 6px `inkPrimary` studs (chalk `inkPrimary`-on-dark at night); the active step is a diamond of four studs, completed steps are single studs, upcoming steps are `borderStrong` rings. No progress bars in checkout.
6. **SUN-FADE** — hero and section-header backgrounds are a 12° linear fade from a category glaze into `canvas` (tint → chalk, always in one direction, never colour → colour, never with the action blue). It reads as a poster bleached from the sunlit side and is the only gradient permitted in the system.
7. **THE INK STAMP** — status labels (SOLD OUT / LAST TICKETS / FREE / PAID / REFUNDED) are Fraunces 700 uppercase, letter-spacing +4%, rotated −3°, 1.5px outline in `accentInk` (attention) or `inkPrimary` (neutral), no fill, with a 1px inner blur so the edge is chalky. Always paired with an icon and the same word in the body copy, so colour never carries the meaning.
8. **The tile frieze** — a 28 px band of repeating micro-text (`TICKR · CONCERT · VEN 12 SEPT · 21:00 ·`)
   in the UI face at 11 px / 700 / uppercase, glaze fill with the category ink, the faïence star as the
   separator glyph. The category eyebrow on event pages and the pass header. **Static** — never a marquee.
9. **The kernel dot** — a 10 px disc in the category ink ringed by 2 px of its glaze, before every
   category label in lists, filters and calendar cells, so category identity survives outside a chip.

**Motion.** Elements *come into register* — a 2 px translate to 0 over 160 ms, never a fade-and-bounce.
Under `prefers-reduced-motion` the translate is removed and only opacity remains.

---

## 7. Typography — sun-bleached print, script-complete

The concept is print that has lived outdoors on a whitewashed wall, so the display face is an
old-style **soft serif**, not a tech grotesque, and the UI face reads as painted signage rather than
software.

| Role | Latin · Cyrillic · Greek | Arabic | Hebrew | Fallback |
|---|---|---|---|---|
| **Display** | **Fraunces** (variable: wght, opsz 9–144, SOFT, WONK) — titles 600–700, SOFT 70 and WONK 1 above 32 px; card titles 600 / opsz 18 / SOFT 30. *Fraunces has no Cyrillic or Greek:* those locales declare **Literata** (variable, Cyrillic + Greek) as the display face | **El Messiri** (variable 400–700) — Kufi-derived; its squared rhythm echoes the faïence grid and its Latin glyphs sit level with a Latin serif, so a bilingual title keeps one baseline | **Frank Ruhl Libre** | `Rubik` → `Noto Sans <Script>` → `system-ui` |
| **UI / body** — and all money | **Manrope** (variable 200–800; Latin, Cyrillic, Greek) — 400–500 body, 600 labels, `tabular-nums` on every price, countdown and reference | **Readex Pro** (variable + HEXP) — 17 px / 1.7 body, HEXP 30 on low-density phones | **Assistant** | same |

**Bitter numerals.** Prices, dates, counts and seat numbers are set in **Fraunces** (opsz 72, wght 500,
SOFT high, WONK 0) in `ink-primary`, with the currency code in Manrope caps at 60 % size, +0.08 em,
`ink-support`. It is what gives the money screens a calm, unmistakable voice — and it only works
because Manrope's tabular figures carry the *arithmetic* while Fraunces carries the *headline* number.

Script rules unchanged from the earlier brief: Arabic body 17 px / 1.7, zero tracking, no italics, no
uppercase, applied by `:lang(ar)`; two families per active script, subset by `unicode-range`;
Fraunces never below 16 px.

---

## 8. Direction, layout and RTL

Logical properties only; `dir` on `<html>` from the locale; the icon-mirror allowlist; `<bdi>` around
every price; the four-way visual QA (ltr/rtl × light/dark) — all unchanged. Two rules added for this
concept: **the sun-fade always starts at inline-start** (so it mirrors with the layout), and **the ink
stamp's −3° rotation flips sign in RTL**. Arches and studs are direction-neutral.

---

## 9. Money, numbers, dates and time

Unchanged: `Intl`-formatted from locale + currency, minor units from the currency (TND 3, EUR/USD 2),
Western digits for money, codes and timers in every locale, values and currency from the API, the
total as the heaviest number, times in the event's timezone with the viewer's offset when different,
the dual-form countdown. New: the bitter-numeral treatment above, and the countdown under two minutes
turns `accent` (clay) — the only time the accent appears on a money screen.

---

## 10. Language, imagery, payments, accessibility, market config

These sections of the earlier edition stand without change and are not repeated here: English as the
catalogue source with human translations in the market's register and ICU plurals; the +35 % text
expansion budget; culture-neutral fallback artwork; no text over posters except on the solid
`poster-plate`; provider order from the market config with the local rail first; WCAG 2.2 AA with RTL
screen-reader testing; a typed `MarketConfig` resolved from URL or domain, never IP. The accent-slot
mechanism of the earlier edition is **retired** — a market's energy now comes from which glazes its
events use, not from a swappable accent.

---

## 11. Token block (TailwindCSS 4)

Replaces the colour part of Phase 7's `@theme`; type, spacing, radius, shadow, motion and focus-ring
mechanics there remain.

```css
@theme {{
  /* ── Chaux & Faïence · light ────────────────────────────────────── */
  --color-canvas: {L['canvas']};  --color-surface: {L['surface']};  --color-surface-2: {L['surface2']};
  --color-ink-primary: {L['inkPrimary']};  --color-ink-body: {L['inkBody']};  --color-ink-support: {L['inkSupport']};
  --color-border: {L['border']};  --color-border-strong: {L['borderStrong']};
  --color-action: {L['action']};  --color-action-text: #FFFFFF;  --color-action-pressed: {L['actionPressed']};  --color-action-tint: {L['actionTint']};
  --color-accent: {L['accent']};  --color-accent-text: {L['accentText']};  --color-accent-tint: {L['accentTint']};  --color-accent-ink: {L['accentInk']};
  --color-success: {L['successText']};  --color-success-tint: {L['successTint']};
  --color-warning: {L['warningText']};  --color-warning-tint: {L['warningTint']};
  --color-danger: {L['dangerText']};    --color-danger-tint: {L['dangerTint']};
  --color-poster-plate: {L['posterPlate']};  --color-disabled-text: {L['disabledText']};

  /* ── glazes (light) · each with its ink ─────────────────────────── */
  --color-glaze-concert: #D3E2F1;  --color-glaze-concert-ink: #1E4A78;
  --color-glaze-conference: #D9E0D8;  --color-glaze-conference-ink: #2E434D;
  --color-glaze-sport: #CFEBDD;  --color-glaze-sport-ink: #0F5A44;
  --color-glaze-theater: #F5D6E3;  --color-glaze-theater-ink: #7A2450;
  --color-glaze-workshop: #F1D9BB;  --color-glaze-workshop-ink: #7A3B1C;
  --color-glaze-festival: #F8E8B8;  --color-glaze-festival-ink: #6A4A06;
  --color-glaze-exhibition: #E3EBCB;  --color-glaze-exhibition-ink: #43561A;
  --color-glaze-networking: #E3D7F2;  --color-glaze-networking-ink: #4C337A;
  --color-glaze-comedy: #F8D3CA;  --color-glaze-comedy-ink: #8B2E21;
  --color-glaze-other: #EAE0CC;  --color-glaze-other-ink: #4A4640;

  /* ── Chaux & Faïence · night ────────────────────────────────────── */
  --color-dk-canvas: #101C26;  --color-dk-surface: #172631;  --color-dk-surface-2: #20323F;
  --color-dk-ink-primary: #F1ECE2;  --color-dk-ink-body: #D3CEC4;  --color-dk-ink-support: #9EAAB2;
  --color-dk-border: #2B3D4A;  --color-dk-border-strong: #75868F;
  --color-dk-action: #8CC0EE;  --color-dk-action-text: #101C26;  --color-dk-action-pressed: #6FAEE3;  --color-dk-action-tint: #1E3B55;
  --color-dk-accent: #F0AE82;  --color-dk-accent-text: #2A1A10;  --color-dk-accent-tint: #43291B;  --color-dk-accent-ink: #F5C9A8;
  --color-dk-success: #7FD6B4;  --color-dk-warning: #F2CF6B;  --color-dk-danger: #F49A8A;
  --color-dk-glaze-concert: #1B324A;  --color-dk-glaze-concert-ink: #A9CCF0;
  --color-dk-glaze-conference: #243540;  --color-dk-glaze-conference-ink: #C2D0D8;
  --color-dk-glaze-sport: #153A30;  --color-dk-glaze-sport-ink: #8ADBBB;
  --color-dk-glaze-theater: #432434;  --color-dk-glaze-theater-ink: #F0B7CE;
  --color-dk-glaze-workshop: #43301F;  --color-dk-glaze-workshop-ink: #F1C4A3;
  --color-dk-glaze-festival: #3F3410;  --color-dk-glaze-festival-ink: #F0D37A;
  --color-dk-glaze-exhibition: #2E3A1C;  --color-dk-glaze-exhibition-ink: #CBD9A0;
  --color-dk-glaze-networking: #312744;  --color-dk-glaze-networking-ink: #CDBDEA;
  --color-dk-glaze-comedy: #472420;  --color-dk-glaze-comedy-ink: #F3B3A6;
  --color-dk-glaze-other: #2A2E30;  --color-dk-glaze-other-ink: #C9C6BF;

  /* ── type ───────────────────────────────────────────────────────── */
  --font-display: var(--font-fraunces), var(--font-el-messiri), var(--font-frank-ruhl), 'Literata', Rubik, 'Noto Sans', system-ui, serif;
  --font-sans:    var(--font-manrope),  var(--font-readex-pro),  var(--font-assistant),  Rubik, 'Noto Sans', system-ui, sans-serif;
}

/* Focus ring — door blue by day, lit door by night */
:root { --ring: #24619A; --ring-offset: #F6F1E8; }
:root[data-theme="dark"] { --ring: #8CC0EE; --ring-offset: #101C26; }

/* The faïence star — 48 px cell, ≤ 8 % ink, never under text */
.faience { background-image: url("data:image/svg+xml,..."); opacity: .07; }

/* Sun-fade — one glaze into chalk, from inline-start only */
.sun-fade { background: linear-gradient(102deg, var(--glaze) 0%, var(--color-canvas) 100%); }
[dir="rtl"] .sun-fade { background: linear-gradient(-102deg, var(--glaze) 0%, var(--color-canvas) 100%); }
```

Lint rules: no `#FFFFFF`/`#000000` as a surface; no fill in the action colour on a non-pressable
element; no `ink-support` on a glaze **except** through this token set (it now passes); physical
direction utilities banned; `font-style: italic` banned under `:lang(ar)`.

---

## 12. Why it is not generic

Three current defaults are deliberately refused. (1) Linear/Vercel grey-on-black: there is no neutral grey scale anywhere in this system — the light ground is chalk (#F6F1E8, warmer and more pigmented than the rejected #F8F7F4), the dark ground is the night-blue of the Gulf (#101C26), text is chalk #F1ECE2 rather than white, and even the hairlines are tinted stone (#E2DACB) or night ink (#2B3D4A); the dark theme is ink-tinted and lamplit, not an inverted grey. (2) The 'AI gradient' / Stripe-purple / cobalt-SaaS family: the only gradient is a one-directional sun-fade from a glaze into chalk, there is no violet, no mesh and no two-colour blend, and the single action colour is a door blue (#24619A) that is greener, deeper and duller than any SaaS blue — chosen because it is what Sidi Bou's doors look like through haze, not because it is 'brand blue' — and it is used for nothing that cannot be pressed. (3) Airbnb coral / Duolingo green / discount-aggregator red-and-yellow: the accent is a muted Djerba clay (#E8A170) with deep-brown text and an ink hairline, never a saturated coral fill with white type; success is sea glass, warning is saffron-jasmine, danger is dried harissa — all desaturated, all carried by deep ink text on pale tints, never by a coloured fill with white on it. Structurally, the pastel-vs-AA problem is solved once and the same way everywhere: pastels are surfaces, chips and stubs only; every pastel gets its own computed deep ink (6.3–8.4:1); white text exists on exactly three fills (action, pressed, ink plate). Finally, the type does the same work the colour does: a soft old-style serif with a 'wonk' axis (Fraunces) and Kufi-derived El Messiri, instead of the Inter/Archivo/Cairo grotesque stack that makes every event app look like the same dashboard.

---

## 13. Decisions locked · decisions open

### Locked by this edition

1. **Chaux & Faïence** replaces cobalt/sun. Chalk canvas `#F6F1E8`, door-blue action `#24619A`, clay accent `#E8A170`, ten Nabeul glazes with computed inks.
2. **Pastels are surfaces, chips and stubs; white text exists on three fills only** (action, pressed, poster plate). Every pastel carries a computed deep ink.
3. **`ink-support` = `#52606A` and `border-strong` = `#707C84`** — the values that pass on every glaze.
4. **Night theme: ink-tinted darks, chalk text, the lit-door button** (`#8CC0EE` with `#101C26` text).
5. **Ten glazes, minimum ΔE 7.9, always with label + icon + kernel dot.** States by density (20/40/100 % toward ink), never a new hue.
6. **Interactive chips carry a 1.5 px own-ink outline; non-interactive tags do not.**
7. **Checkout is chalk-only with a visible calm-down** (section sun-fade → chalk-stone); the glaze returns on the paid stub.
8. **Pass and scanner render in fixed tokens; QR on a chalk tile with a 16 px quiet zone.**
9. **Nine motifs** (§6) are the brand's drawable vocabulary; the sun-fade is the only gradient; the ink stamp is decoration on top of a labelled status.
10. **Type: Fraunces + Manrope · El Messiri + Readex Pro · Frank Ruhl Libre + Assistant**; Literata as display for Cyrillic/Greek locales; Rubik → Noto as last resort. Bitter numerals for headline money.
11. **The accent-slot mechanism is retired**; market energy comes from the glazes events carry.
12. Everything else in the earlier edition — RTL, money/time, language, imagery, payments, WCAG 2.2, `MarketConfig` — stands, with the sun-fade inline-start and stamp-rotation RTL rules added.

### Open — needs a product or backend decision

Unchanged from the earlier edition and still verified in code: no event `timezone`; Konnect/Paymee are
TND-only; no user `preferredLocale`; the PDF cannot render Arabic; name shape per market; tax display;
trademark and domains ([05 — Global readiness](05-gaps-global-readiness.md)). One new item: the two
closest glaze pairs (Workshop/Other, Conference/Sport) should be checked on real device screens before
the tint values are frozen in Phase 7 — ΔE predicts, it does not replace looking.

---

**Visual edition:** [10](10-global-design-direction-visual.md) · **Fixes:** [09](09-remediation-plan.md) · **Index:** [README](README.md)
