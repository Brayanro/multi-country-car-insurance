# Auto insurance quote design system

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-01-design-approval.md))  
**Scope** US-01 and a shared visual language for later wizard steps  
**Approved inputs** [US-01](../../spec/US-01.md), [technology stack](../architecture/US-01-technology-stack.md), [country routing](../adr/ADR-001-multi-country-content.md), [dynamic form](../adr/ADR-002-dynamic-form-contract.md), and [wizard state](../adr/ADR-003-frontend-quote-state.md)

## Direction

A driver should be able to tell which country governs the quote, what information to supply, and what they can do next. Treat each step as part of one readable quote document. The global header carries the product identity. The progress track leads directly into the step content. On desktop, center the track and the active step composition. The country picker and URL establish the country, and each step shows the relevant business content for that country. Price and quote reference get strong typographic emphasis where they become a purchase decision or receipt.

White policy paper, pale blue tint, dark ink and the red print of a correction inform the palette. Use flat layers, simple document rules, and a single blue primary action. Georgia gives screen titles and milestones the rhythm of a document. Platform sans-serif keeps labels, entry fields and values easy to scan. The visual language is shared. Actual terminology and business content identify each country.

The review and plan patterns draw on GOV.UK's check-answers design and native radio grouping, with step-specific edit links and prices next to plan choices. [GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/), [GOV.UK radios](https://design-system.service.gov.uk/components/radios/)

## Foundations

Map the proposed tokens to the approved Tailwind CSS 4 theme during implementation. Use the colors on opaque surfaces.

| Token | Value and use |
| --- | --- |
| `surface-canvas` | `#F5F7FC` · background |
| `surface-panel` | `#FFFFFF` · controls, cards, header and focus gap |
| `surface-context` | `#EAF0FF` · selected plan and price block |
| `text-primary` | `#15243B` · headings, labels and values |
| `text-secondary` | `#344763` · explanatory copy |
| `text-muted` | `#405575` · help, placeholders and inactive progress labels |
| `action-primary` | `#2E6DF6` · primary and current-step fills with white foreground |
| `action-hover` | `#215BCC` · hovered or pressed primary fill |
| `action-inline` | `#1748AF` · inline links, emphasized blue text, and selected borders |
| `border-control` | `#586D91` · input, radio and checkbox outlines |
| `border-divider` | `#CCD8EE` · decorative rules |
| `focus-ring` | `#1746B4` · 2 px keyboard outline with 2 px offset. Preserve a white gap around saturated controls. |
| `intent-error` / `surface-error` | `#9E2F26` / `#FFF2EF` · invalid control, error text and recoverable panel |
| `intent-success` / `surface-success` | `#1F5B39` / `#E8F5EC` · success wording and icon |
| `surface-disabled` | `#E0E7F4` · disabled payment before consent and during processing |

| Foreground and background | Calculated contrast |
| --- | --- |
| Primary text on paper / canvas | 15.59:1 / 14.54:1 |
| Secondary text on paper / canvas | 9.43:1 / 8.80:1 |
| Muted text on paper / canvas / disabled fill | 7.57:1 / 7.06:1 / 6.09:1 |
| White text on primary / hovered primary | 4.53:1 / 6.12:1 |
| Inline action on paper / canvas / context tint | 8.13:1 / 7.59:1 / 7.13:1 |
| Control outline on paper / canvas | 5.24:1 / 4.88:1 |
| Focus outline on paper / canvas / context tint | 8.17:1 / 7.62:1 / 7.16:1 |
| Error on paper / error tint | 7.27:1 / 6.65:1 |
| Success on success tint | 7.16:1 |

Contrast uses WCAG relative luminance. Normal text targets at least 4.5:1 and essential control outlines or state indicators at least 3:1 against their surroundings. Use opaque primary blue with a white foreground and the darker inline blue for text on tinted surfaces. Messages and checked states carry meaning alongside color. [Text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

| Scale | Proposed use |
| --- | --- |
| Page title | Georgia 48/56 px wide, 32/40 px compact, normal weight |
| Section title | Georgia 28/36 px wide, 22/30 px compact, normal weight |
| Receipt number or price | System sans 28/36 px, 700, tabular numerals |
| Default body / input | System sans 16/24 px, 400 |
| Control label / button | System sans 15/20 px, 700, sentence case |
| Help / inline feedback | System sans 14/20 px, 400 for help and 700 for feedback |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48 and 56 px. Use 8 px within a field, 20–24 px between fields, and 32–48 px between surfaces. |
| Shapes | 6 px controls, 8 px panels, 10 px receipt. Use tonal layers and borders. |
| Targets | At least 44 px for controls and padded link hit zones. The primary action is 48 px high. |
| Motion | At most 120 ms on fill or border changes. Reduced motion uses instant states and a static loading cue. |

## Layout and order

| Viewport | Layout |
| --- | --- |
| Compact, below 48 rem | Four-column shell with 16–20 px side padding. Fields span the content in published order. Use a compact three-label progress row. Allow copy to grow vertically. |
| Medium, 48–63.99 rem | Center one main flow. Pair consecutive fields where each gets at least 16 rem. Ancillary content follows its related block. |
| Wide, from 64 rem | Center the progress track, titles, and active step. Cap the main form and plan lane at 44.5 rem. Use a centered 58 rem composition for the summary’s paired review and price panels. Keep fields and reading text aligned to the start of their lanes. Fill the two form tracks row by row in DOM order. |

Keep the same reading order at every width and country. Labels, help, validation messages, prices and country links need room to wrap. Keep focus and errors fully visible. Verify vertical reflow at 320 CSS px and 400% zoom. The 390 px and 1200 px wireframes are review samples. [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

## Components and states

| Pattern | Design contract |
| --- | --- |
| Header and country selection | The global header shows product identity. The picker and recovery for unsupported routes offer links to supported countries. The URL sets the active country and its isolated quote state. Include a main landmark, skip link and unique heading. On wizard navigation, focus the new screen heading. |
| Progress track | An informational ordered list of Datos, Plan and Resumen, centered on desktop. Mark the current step with `aria-current="step"` and expose completed status as text to assistive technology. Use separate Back and Edit actions. |
| Field | Use a visible programmatically associated label. Explain the required marker and expose requiredness natively. Use native inputs, select and checkbox. Associate help and the visible error with stable `aria-describedby` IDs. |
| Field feedback | Neutral on initial render. Show the configured error on invalid blur or unsuccessful Continue. Update or clear it as touched values change. Set `aria-invalid` while showing the error and move focus to the first invalid field on Continue. |
| Required select | Start on an unselectable placeholder with valid options waiting for a choice. After blur or Continue, show the configured required error. A required select without valid options uses the unavailable-form state. |
| Buttons and links | Buttons handle Continue, Retry and Simulate. Links handle Back and Edit. Continue remains operable in a ready invalid form. Payment is disabled before consent and during processing, with an adjacent explanation or status. |
| Loading and failure | Announce a concise polite status during retrieval. Use decorative placeholders while reading configuration for the active URL country. For missing, invalid, or failed configuration, replace the fields with a recoverable message and retry. |
| Plans | Later concept uses a native radio group with a visible legend. Recommendation and checked status have separate indicators. Keep local price, coverage and benefits close to the option. |
| Summary and receipt | Later concept uses a readable definition list and contextual edit links. Apply partial document masking to visible and spoken values. Terms and consent precede payment. Success wording accompanies a selectable quote reference. |
| Icons | Use individual local Tabler SVGs with the upstream notice. Decorative icons stay hidden from assistive technology. The shield in these frames is schematic. |

Use Spanish as the demo shell language. Keep the design notes in English and change local language attributes only for content that needs them. No static example substitutes for published Strapi business copy. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [W3C form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/)

## Review and verification

The design check covers contrast, SVG accessible names, hierarchy, reading order and example wrapping. At implementation, verify both countries with keyboard and screen reader, invalid Continue, long Strapi fixtures, retry announcement, zoom, touch bounds and visible focus. Use automated accessibility checks and browser assertions alongside manual assistive-technology testing. [Wireframes and criteria map](US-01-wireframes.md)

The review draft incorporates the requested centered desktop steps and primary blue. Country selection appears on the picker and unsupported-route recovery screens. Approve the revised design or request changes. The neutral name “Seguro de auto” and Spanish shell copy remain design proposals.
