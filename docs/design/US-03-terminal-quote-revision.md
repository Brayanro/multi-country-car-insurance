# US-03 — Terminal quote and restart design

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-03-terminal-quote-design-approval.md))

**Basis** [Approved terminal quote revision](../../spec/US-03-terminal-quote-revision.md), [approved ADR-005 amendment](../adr/ADR-005-amendment-terminal-quote.md), [US-03 design](US-03-summary-and-payment.md) and [US-01 design system](US-01-design-system.md).

| View | Wireframe |
| --- | --- |
| Completed quote with captured review | [Desktop](wireframes/US-03-terminal-quote-desktop.svg) · [Mobile](wireframes/US-03-terminal-quote-mobile.svg) |
| Receipt and restart notices | [Legacy receipt, reload warning and retry excerpts](wireframes/US-03-terminal-quote-notices.svg) |

## Confirmation

- Preserve the completed stepper and centered checkmark, **Pago aprobado** heading and selectable **Número de cotización**. Use the opaque receipt reference as displayed at approval. The heading, reference, captured review and restart action follow the same reading order at every width.
- Place the captured **Titular y vehículo** definition list and **Plan elegido** card below the receipt header. Use the captured display labels and values in their original order, including the masked document value, and show the captured plan name and **Precio final** using the existing locale currency formatter. Treat every captured value as plain text. The receipt has only read-only content and one quote restart action. Use country-neutral app copy.
- Reuse the existing paper, border and context colors. At 64 rem and above, place the review beside the plan in the centered 58 rem wizard lane. At narrower widths stack the same panels in reading order with the existing side gutters. Use the bordered paper card for the review and allow long labels, document values, prices and references to wrap. Size the cards to their contents and keep the restart control in page flow. Use a full-width 48 px minimum restart button on compact screens, and a centered content-width button on wide screens. [US-01 design system](US-01-design-system.md)
- Put **Iniciar una nueva cotización** after the receipt content. Activation starts the same-country reset. Keep the receipt and its focusable restart control in place while the reset is in progress, with activation suppressed until it settles. After a successful reset, land on the current country's Details with configured defaults, and focus **Datos para cotizar**. Subsequent visits to old routes follow unfinished-quote prerequisites. Use the existing Details recovery if its configuration fails to load after the reset.

## Route and recovery behavior

| State | Design response |
| --- | --- |
| Approval, reload, direct entry or browser history | Render the same terminal confirmation for the completed quote. The same country's Details or Plans route resolves to canonical Summary before showing any editable UI. Focus **Pago aprobado** when confirmation becomes the visible screen, including from direct and history navigation. Keep the completed stepper informational. The other country's wizard follows its own state. |
| Legacy receipt with unavailable review | Keep the approval, original reference and restart action. In place of the captured review, show **El detalle de esta cotización no está disponible.** Omit the review and plan cards. Apply the same route protection and reset behavior. |
| Receipt available in memory only | Keep the complete confirmation. Below the reference, display **Si recargas la página, es posible que no puedas recuperar esta cotización.** The restart action still attempts the approved cleanup. |
| Restart fails before commit | Keep the receipt, reference and any captured review. Immediately before the existing button show **No pudimos iniciar una nueva cotización. Inténtalo de nuevo.** Announce the error once and keep focus on the restart button when it initiated the attempt. The same action is available for retry. |
| Payment rejected | Keep the existing editable Summary, **Pago rechazado.** alert and **Resultado de prueba** radio group. **Editar datos** and **Cambiar plan** continue to open the corresponding steps. **Pagar** retries with the chosen outcome and the fresh terms check. The quote draft and eligible plan candidate follow the existing rules. |

## Accessibility and verification

Use the existing main landmark and skip link. Use a single confirmation heading as the programmatic focus target and read the quote number as a labeled selectable value. The checkmark is decorative. Preserve the native button semantics, the shared visible focus treatment including forced colors, and normal document scroll. Use a stable polite status for a visible pending reset message if needed and an announced error for a failed reset. Preserve the user's focus on in-place retry and avoid announcing the heading twice when navigation takes focus. [WCAG focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

| Approved criterion | Checks for implementation and QA |
| --- | --- |
| AC-US03-R01 | In both countries, test Back, Forward, direct Details and Plans URLs and reload after approval. Confirm canonical Summary, a stable reference and confirmation focus, without exposure of editable controls. Check country independence and a restored legacy receipt. |
| AC-US03-R02 | Confirm the captured values, masking, labels, plan and price remain identical after content changes or outages. Test memory-only receipt messaging, 320 CSS px reflow, zoom and long content. |
| AC-US03-R03 | Activate restart by keyboard. Confirm Details focus and configured defaults on success, absence of the old receipt after reload and history navigation, and an announced, actionable failure with focus retained on retry. |
| AC-US03-R04 | After rejection, follow each edit link, return with the retained draft and eligible selection, and approve through the existing fresh terms and Pay flow. |
