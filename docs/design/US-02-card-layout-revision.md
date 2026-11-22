# US-02 — Plan card layout and selection revision

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-02-card-layout-design-approval.md))  
**Basis** [Approved US-02 design](US-02-plan-selection.md), [US-02 specification](../../spec/US-02.md), and [ADR-004](../adr/ADR-004-plan-catalog-and-selection.md)

## Plan card layout

Set the centered Plans lane to a maximum of 58 rem. Base the card grid on the lane's available inline width after shell padding. Use 16 rem minimum tracks, 1.5 rem gaps, and one to three columns. Allow a single track to shrink below 16 rem when using a narrower lane.

| Available lane width | Capacity |
| --- | --- |
| Below 33.5 rem | One card per row |
| From 33.5 rem to below 51 rem | Two cards per row |
| 51 rem and above | Three cards per row |

Keep Esencial, Ruta and Integral together in one row at the widest size. Use the same rules for any published catalog size, collapse unused columns when the catalog is smaller, and place additional plans on the next row in published order. Match reading and keyboard order at every width. Reuse the existing card hierarchy and spacing, allow long plan names, prices, and list items to wrap, and let cards grow vertically. Test reflow without horizontal scrolling at 320 CSS px and the equivalent 400% zoom. [CSS Grid track repetition](https://drafts.csswg.org/css-grid/#auto-repeat) · [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

## Whole-card selection

A click or tap anywhere within a ready card selects its plan. Keep one native radio per card in the existing fieldset, and associate the visible plan name with its radio through an explicit `label`. Stretch that label's transparent pointer target across the card. Keep the actual radio directly operable and the coverage and benefit lists in the reading order. Associate the formatted price and, when present, the **Recomendado** tag with the radio through `aria-describedby`. The radio is the sole selectable control, with the visible plan name as its accessible name.

Preserve native Tab, arrow key and Space behavior and the visible checked indicator. Show the shared focus outline for keyboard focus and keep it visible in forced colors. Selection updates the checked state and card emphasis in place without shifting the layout. Selecting a card leaves the user on Plans and makes **Continuar** available when the quote can progress. [HTML label element](https://html.spec.whatwg.org/multipage/forms.html#the-label-element) · [Radio group keyboard interaction](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)

## Design review checks

- **AC-US02-01 and AC-US02-07.** Confirm all three seeded cards appear in order in a single row when 51 rem is available. Check just below and at 33.5 rem and 51 rem, plus compact reflow with long CMS content.
- **AC-US02-03, AC-US02-04 and AC-US02-07.** Click or tap the radio, plan title, price, list text and card padding. Each hit selects that plan, replaces any prior choice and keeps recommendation distinct. Confirm the group exposes one radio per plan with name, description and checked state, and can be operated by keyboard.
