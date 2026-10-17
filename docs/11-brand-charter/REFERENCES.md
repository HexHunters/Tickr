# Tickr · Porcelaine — reference register

Research checked **17 October 2026**. These primary sources informed the proposal;
their logos, screenshots, illustrations, layout code and marketing claims are not
included as Tickr assets. Observations describe the pages available on that date,
not a promise that the sites will retain those designs.

Porcelaine is a **proposed visual replacement for review in this PR**, including
the older cobalt direction and the audit's Chaux & Faïence direction. Its cool
canvas, muted pastel surfaces, deep petrol actions and Manrope typography are
original Tickr choices. Existing product scope and purchase requirements remain
the reference for implementation.

## Product and visual references

| Primary source                                                                                        | Verified observation                                                                                                                                                                                                               | Original translation for Tickr                                                                                                              | Exclude from this proposal                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [Luma homepage](https://luma.com/) and [Discover](https://luma.com/discover)                          | The homepage gives event artwork generous space around a short headline and separates event creation from discovery. Its browser rendering uses framed, floating event posters. Discovery provides browsable topics and locations. | Make the physical ticket and its artwork the memorable object; give the launch message one clear action and a quieter organizer route.      | Luma's multicolor headline, large soft shadows, copied poster art and rotating headline treatment.                                      |
| [Partiful](https://partiful.com/)                                                                     | The page explains a simple sequence: create an invite, collect RSVPs, then keep guests informed. City links and concrete occasions make the purpose easy to understand.                                                            | Use specific event language and explain a complete journey with a few clear examples. Keep launch copy human and short.                     | Its informal party voice and any implication that Tickr V1 already has guest comments, social attendance visibility, feeds or matching. |
| [Cosmos](https://www.cosmos.so/)                                                                      | Search, image discovery and personal collections organize the page. Brief feature descriptions support the imagery instead of replacing it.                                                                                        | Let event photography carry variety inside calm, consistent frames. Keep the surrounding interface visually quiet.                          | Borrowed photography, a generic inspiration collage, shopping or AI-filter features unrelated to ticketing.                             |
| [Linear](https://linear.app/)                                                                         | Navigation is compact and the page demonstrates the product through detailed interface examples alongside short descriptions of planning, intake and monitoring.                                                                   | Take the discipline of alignment, hierarchy and readable product detail into organizer tables, order summaries and documentation.           | Its software-development vocabulary, interface reproduction, charcoal aesthetic or decorative light effects.                            |
| [Spline](https://spline.design/)                                                                      | The page presents editable 3D scenes with explicit materials, lighting, states and publishing paths. Its examples show 3D as a designed object with controlled views.                                                              | Build one original ticket sculpture with matte material, soft daylight and restrained depth; keep headline, status and action as real HTML. | An embedded third-party demo, copied scene, heavy scene editor chrome, emissive materials, chrome blobs or a required WebGL experience. |
| [DICE: how fees work](https://dicefm.zendesk.com/hc/en-gb/articles/19919684020113-How-DICE-fees-work) | DICE states that the advertised ticket price includes its booking fee. The main DICE homepage rejected the research fetch, so this is a verified pricing reference rather than a visual audit.                                     | Show the payable total as early as Tickr's pricing contract permits, with a legible fee breakdown when a quantity is selected.              | Copying another provider's fee policy or claiming Tickr prices include fees when the API returns a base ticket price.                   |

## Typeface sources

| Role in Porcelaine                          | Specimen                                                              | Distribution and license                                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latin display, UI and numerals: **Manrope** | [Google Fonts specimen](https://fonts.google.com/specimen/Manrope)    | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/manrope), [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt)     |
| Arabic display and UI: **Readex Pro**       | [Google Fonts specimen](https://fonts.google.com/specimen/Readex+Pro) | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/readexpro), [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/readexpro/OFL.txt) |

The supplied font files retain their own license notices. Embed fonts locally for
the review document and subset by active script in a later product implementation.
Typeface selection does not establish that every required glyph or numeric feature
has been tested: review French diacritics, Arabic shaping, mixed-script strings and
tabular money figures in the final shipped files.

## Accessibility sources

- [W3C: contrast minimum, SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html):
  ordinary text needs 4.5:1; large text needs 3:1. Pastels therefore serve as
  surfaces paired with deep ink. A palette alone does not establish conformance.
- [W3C: non-text contrast, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html):
  meaningful control boundaries and graphical information need 3:1 against
  adjacent colors where required. Decorative hairlines are distinct tokens.
- [W3C: target size minimum, SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html):
  WCAG 2.2 AA specifies 24 × 24 CSS pixels with exceptions. Tickr retains its
  more generous product baseline of 44 × 44 px and 48 px primary actions.
- [W3C: animation from interactions, SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html):
  this is a Level AAA criterion, adopted here as a design policy. Disable
  nonessential parallax and ticket movement for reduced-motion preferences.

## Product constraints carried forward

These are repository requirements, not claims derived from the inspiration sites.
The detailed backend contract must be checked again before production work.

- **Market and language:** French-first `fr-TN` for V1; externalized strings;
  Arabic-ready logical properties and bidirectional isolation for prices and codes.
  Do not expose an unimplemented locale switch as a working feature.
- **Money and trust:** TND with three decimal places; local payment methods before
  international cards when available; visible total and fees, a real order
  reference and a confirmed payment state. A return from a gateway is not itself
  proof of payment.
- **Time:** a 15-minute reservation hold displayed in relative and absolute forms.
  A launch countdown needs an approved release date; otherwise use “Bientôt
  disponible” without a fabricated date or ticking timer.
- **Mobile:** design for a 390 px viewport and verify at 360 px on modest Android
  hardware; 16 px input text; usable keyboard focus; zoom and reduced motion.
- **Scope:** poster-led discovery, ticket selection, payment and QR entry are the
  core. Social matching, feeds, assigned seating and public organizer profiles
  need their own implemented contracts before appearing as product features.
- **Launch interest:** an email form in a concept is an interface specification.
  Production requires a real submission endpoint, clear consent language, privacy
  destination, failure state and truthful success confirmation.

Repository sources: [product design brief](../08-frontend/02-product-design-brief.md),
[design system](../08-frontend/08-design-system.md), and
[global design direction](../10-project-audit/08-global-design-direction.md).
