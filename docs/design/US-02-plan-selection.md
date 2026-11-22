# US-02 — Plan selection design

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-02-design-approval.md))  
**Basis** [Approved US-02 specification](../../spec/US-02.md), [ADR-004](../adr/ADR-004-plan-catalog-and-selection.md), and the [shared design system](US-01-design-system.md)

## Compare and choose

Keep the product-only header, centered wizard track, and centered Plans lane. Mark Datos complete and Plan current. Use **Elige tu plan** as the step heading and **Planes disponibles** as the visible group legend. Cards follow the published order. Pair consecutive cards across the wide lane and stack them in one column below the wide breakpoint. Match reading and focus order at every width. Let names, prices and lists wrap and grow vertically.

| Review specimen | Annotations |
| --- | --- |
| [Desktop comparison, Colombia](wireframes/US-02-plans-comparison-desktop.svg) | Esencial is checked and Ruta is recommended. The card separates short description, coverages and benefits. |
| [Existing mobile concept, Chile](wireframes/03-plans-mobile.svg) | Reuse the stacked layout. Apply the same card hierarchy as the desktop comparison and the price and action order below. |
| [Existing empty desktop](wireframes/10-no-plans-desktop.svg) · [mobile](wireframes/10-no-plans-mobile.svg) | Reuse the empty panel and **Volver a datos** action. Substitute the active country's name in the message. |

Lead each card with the radio and plan name, followed by the price and the short description. Show the published entries under **Coberturas** and **Beneficios**, omitting a heading if its list is empty. Use one final price from Strapi. Show the explicit currency code and local separators with `es-CO` and two fractional digits or `es-CL` and zero fractional digits. Examples are **COP 129.900,50** and **CLP 24.900**. Example amounts and plan copy are fictitious. Display the actual published plan content as plain text. Payment cadence is outside the current price contract.

Use native radios with a common group name inside a fieldset. Give each radio an explicit label containing its visible plan name. Associate its price and any **Recomendado** text as a description. Keep long coverage and benefit lists as readable content in the card. The radio and label row provide a 44 px minimum target. Use the checked mark and selected border and tint for selection, and a separate text tag for a recommendation. The fieldset starts unchecked unless an earlier explicit choice is restored and revalidated. [GOV.UK radios](https://design-system.service.gov.uk/components/radios/)

## States and actions

| State | Presentation and next action |
| --- | --- |
| Ready, unselected | Keep **Continuar** visibly disabled and place **Selecciona un plan para continuar** next to it. Offer **Volver a datos**. |
| Ready, selected | Enable **Continuar** when the current eligible choice and Details are valid. Selecting a different radio replaces the choice in place. Render Back before Continue in the visual and keyboard sequence. Stack actions on compact screens and use a full-width primary action. |
| Loading or retrying | Keep the Plans shell with **Cargando los planes…** and the shared [loading treatment](wireframes/07-loading-desktop.svg). Withhold cards and progression. Any placeholders are decorative and static with reduced motion. Keep Back available. |
| Revalidating before handoff | Keep Plan as the current step until the read succeeds. Show **Verificando tu plan…** in the same status area, with plan choices and further Continue activation unavailable. Back returns to Details and supersedes the read. |
| Empty | Show **No hay planes disponibles** and **Por ahora no hay planes para [país].** Offer Back. |
| Unavailable | Adapt the [shared recovery treatment](wireframes/08-unavailable-desktop.svg) with **Planes no disponibles**, **No pudimos cargar los planes. Intenta de nuevo.**, **Reintentar**, and Back. Keep progression blocked during retry and show only current results. |
| Reselection required | When a successful refresh removes or reprices the chosen plan, show the current choices unchecked and the message **Tu plan cambió o ya no está disponible. Selecciona un plan para continuar.** If no plans remain, use the empty state and explain the lost choice without instructing the user to choose. |

**Volver a datos** links to the same country's Details and leaves the draft intact. A valid unchanged selection can be restored after a fresh read. **Continuar** reaches the same-country Summary handoff only after successful revalidation. Use the existing step-navigation convention at the handoff. US-03 owns the summary content.

## Keyboard, focus and announcements

- Preserve native radio interaction. Tab and Shift+Tab enter and leave the group, arrows move and choose within it, and Space checks the focused choice. Keep focus on the radio after a choice. Use the shared visible focus ring and preserve the browser's checked mark in forced colors.
- Focus the step heading on route entry. If an activated control disappears during revalidation, move focus to the persistent step heading. When retry replaces its control with current results, return focus to the Plans heading. If a retry fails in place, retain focus on Retry. A user who moved focus to Back while waiting keeps it there.
- Use one polite status region for meaningful asynchronous changes, including loading, verification, successful retry and reselection. When moving focus to a recovery heading, let that focus movement communicate the recovery instead of announcing the same text twice. Native checked state conveys the radio change. [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

## Design review coverage

| Criteria | Review and later verification |
| --- | --- |
| AC-US02-01, AC-US02-02 | Confirm published order, copy placement and both price formats. Verify with long content and empty coverage or benefit lists. |
| AC-US02-03, AC-US02-04 | Confirm independent recommendation and selection, disabled unselected action, one checked radio, same-country Back and gated handoff. |
| AC-US02-05, AC-US02-06 | Confirm the empty, loading, retry, revalidation and reselection treatments. Verify a repriced or withdrawn plan cannot reach the handoff. |
| AC-US02-07 | Verify keyboard and accessible names and descriptions at desktop and mobile sizes, 320 CSS px reflow, 400% zoom, and focus through an unsuccessful and successful retry. |

The project owner approved the design on 2026-11-22.
