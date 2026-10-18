# Tickr · En scène — reference register

Research checked **17 October 2026**. These primary sources informed the proposal;
their logos, screenshots, illustrations, layout code and marketing claims are not
included as Tickr assets. Observations describe the pages available on that date,
not a promise that the sites will retain those designs.

En scène (18 October 2026) evolves the initial Porcelaine proposal in this PR:
acid-yellow brand emphasis, occasional coral, live photography and Readex Pro
headlines. The cool canvas, deep petrol utility actions and Manrope UI remain.
The observations below describe the initial research, not a new visual audit of
those sites. Existing product scope and purchase requirements remain authoritative.

## Photography in this revision

- Local asset: [live-crowd.jpg](assets/live-crowd.jpg).
- [Original Unsplash image endpoint](https://images.unsplash.com/photo-1501386761578-eac5c94b800a)
  and [Unsplash license](https://unsplash.com/license). Downloaded 18 October 2026,
  resized to 2200 px wide for this local design proposal.
- This is illustrative crowd photography, not a confirmed Tunisian venue,
  partner, customer endorsement or Tickr event. No such attribution is made.
- Before public release, replace it with commissioned or organizer-authorized
  local photography and record photographer credit and applicable permissions.
  The stock license does not establish every depicted person's publicity rights
  or clearance of visible third-party marks.
- The existing ticket sculpture is original secondary artwork; it is no longer
  the campaign hero. The logo has not been redesigned.

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

Revision 1.1 assigns Latin campaign headlines to Readex Pro 700 and retains
Manrope for Latin UI and numerals. The original distribution sources below
remain unchanged; both families are already supplied locally.

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
- **Money and trust:** TND with three decimal places. The approved launch target
  is reservation followed by cash payment to the organizer/seller, with zero
  offline commission. Tickr records payment; it does not transfer cash. Online
  gateways remain disabled. Only offer methods actually exposed by the backend;
  an empty list is an unavailable state, not permission to invent an offline API.
  Show the server total, fees and order reference. Never infer payment from a QR,
  a client action or a gateway return.
- **Time:** show the server reservation deadline in relative and absolute forms,
  with dates and the `Africa/Tunis` timezone. Do not hardcode a 15-minute hold.
  Offline timing recommendations and event caps belong to the backend plan,
  not the brand charter; display the deadline snapshotted for each reservation.
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

For launch/payment policy, the [approved backend plan](../backend-plan.md)
supersedes older online-checkout examples. Its implementation status remains a
release gate, not a claim that offline purchase is ready.

Repository sources: [product design brief](../08-frontend/02-product-design-brief.md),
[design system](../08-frontend/08-design-system.md), and
[global design direction](../10-project-audit/08-global-design-direction.md).
