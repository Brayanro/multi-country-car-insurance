# US-03 — Summary and simulated payment design

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-03-design-approval.md))

**Basis** [Approved US-03](../../spec/US-03.md), [ADR-005](../adr/ADR-005-country-terms-and-simulated-payment.md), [US-01 design system](US-01-design-system.md) and [US-02 plan selection](US-02-plan-selection.md).

## Wireframes

| View | Review frames |
| --- | --- |
| Editable Summary | [Desktop · Colombia](wireframes/US-03-summary-desktop.svg) · [Mobile · Chile](wireframes/US-03-summary-mobile.svg) |
| Terms and payment states | [In-place variants on the compact lane](wireframes/US-03-terms-and-payment-states.svg) |
| Confirmation, including reload | [Desktop · Colombia](wireframes/US-03-confirmation-desktop.svg) · [Mobile · Chile](wireframes/US-03-confirmation-mobile.svg) |

Each country uses the same layouts and control order. The initial country selection supplies the context for the quote. Keep country names out of app-authored Summary, terms headings, payment states, confirmation and accessibility copy. Use the active country's approved currency formatting and show Strapi content as published or configured, including terms, plan names and form labels. The frames use fictitious quote values and short illustrative terms excerpts.

## Editable Summary

- Reuse the app header, main landmark, route-entry heading focus and informational **Datos / Plan / Resumen** stepper. A review heading identifies the step. The plan's currency follows the active country.
- Show **Titular y vehículo** in a white bordered card at every width, with a definition list in configured order and a nearby **Editar datos** link to same-country Details. Use the projected masked document in visible and accessible text. The **Plan elegido** card shows the current plan and final price with **Cambiar plan** linking to same-country Plans. Use the approved formatter with explicit **COP** or **CLP**. Both links preserve state under the existing Details and Plans rules. The wireframes show a shorter example field list. Show every configured, entered value in the review.
- Put **Términos y condiciones** next in reading order. Present the plain text inline with preserved paragraph breaks. The page scrolls as the text grows. The labeled, initially unchecked native consent checkbox follows the text. Its checked state reflects consent for the current quote and revision. Show **Acepta los términos para continuar.** beside the unavailable payment action while acceptance is outstanding.
- Use a native radio group with visible legend **Resultado del pago (solo demostración)** and the options **Aprobado** and **Rechazado**. Default to **Aprobado** on initial entry. Associate **No se realizará un cobro real.** with the group as help. **Simular pago** is the single Pay action for either outcome and every payment retry. Its eligibility follows ADR-005.
- At 64 rem and above, use the established centered 58 rem composition. Place the Details panel on the left and stack the selected plan, terms, consent, outcome and Pay in the right column. Align the Details panel with the price card at the top. Below 64 rem, stack the same content in one column using the same DOM order. At compact widths, retain 16–20 px side gutters and use a full-width Pay button. Use auto-height panels, wrapping labels and unbroken-value wrapping where needed. Keep the action in normal page flow.

Reuse the existing `app-wizard-progress` and status-panel pattern, Tailwind canvas/paper/context/ink/line tokens, existing input and focus utilities, and the approved success, error and disabled treatments. Section titles, price emphasis and the quote number follow the approved type scale. Keep 44 px link and control targets and the 48 px primary action. [US-01 design system](US-01-design-system.md), [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

## Terms and payment states

| State | Visible response and next action |
| --- | --- |
| Reading terms on entry or retry | Keep the review and price visible. In the terms region show **Cargando términos…** until usable content is ready. Consent is unavailable and Pay stays disabled. |
| Terms unavailable | For empty, invalid or failed reads, including the Pay refresh, show **No pudimos cargar los términos.** with **Reintentar carga** in the terms region. Keep Details and plan. Pay stays blocked. If a successful recovery returns the same terms revision, text and quote snapshot, previously accepted consent can remain checked. Recovery returns to the review without starting payment. |
| Checking terms on Pay | Keep the review visible and reserve the single Pay action. Show **Comprobando los términos…** and disable repeat activation. The simulator begins only after the fresh read confirms the accepted terms and quote. |
| Terms changed on Pay | Replace the terms with the new text, clear consent, and show **Los términos cambiaron. Léelos y acéptalos para continuar.** before the updated text. A new acceptance followed by another **Simular pago** is required. |
| Processing | Keep the review, plan, terms and consent visible. Show **Procesando el pago simulado…** and keep Pay locked until settlement. An interrupted reload returns to the editable review if its prerequisites pass. Fresh consent is required before retry. |
| Rejected | Show **Pago simulado rechazado.** by the payment controls with **Tu cotización se conservó. Elige un resultado y vuelve a simular el pago.** The chosen **Rechazado** option remains visible. The user can select **Aprobado** or retry the chosen outcome using the same action. Retain Details, plan and still-current consent. |
| Approved | Replace all editable content with a terminal receipt. Center the checkmark, **Pago simulado aprobado** heading and selectable **Número de cotización** in the receipt. Use an opaque reference without a country prefix. Keep the existing product header and completed stepper. On reload or return to the same completed quote, show the same reference even if published content changed. |
| Details or plan prerequisite missing | Reuse the existing redirect and recovery patterns for the earliest incomplete same-country step. Editable Summary is available after successful revalidation. |

## Keyboard, focus and announcements

- Use contextual anchor text for edits, an associated native checkbox label, and a native `fieldset` and `legend` for the radios. Keyboard order follows the review, terms, checkbox, radio group and Pay. Use standard Tab, Space, Enter and arrow-key behavior. Keep the disabled reason or status visible beside Pay. Preserve visible focus and the native outline in forced colors. [WAI grouping controls](https://www.w3.org/WAI/tutorials/forms/grouping/)
- Announce loading, fresh checks and processing through a stable polite status region. Announce actionable failures once, using the existing accessible feedback pattern. Keep focus where it is while async work runs, with the focused Pay control retained as a target during the busy state. Convey the disabled state programmatically and suppress both keyboard and pointer activation while it remains focusable. If changed terms interrupt an active Pay interaction, move focus to the updated terms heading so it precedes the new text and checkbox. On terms failure, use the recovery control as the focus destination if the initiating target disappeared or became unavailable. A failed recovery with a stable Retry control keeps focus there. A successful recovery that removes the Retry control returns focus to the terms heading. A user who moved to an edit link while waiting keeps their focus.
- On rejection, announce the result while keeping focus in place if its target is still present. The user can reach the outcome choices from Pay with Shift+Tab. On first confirmation or a restored receipt, focus its heading and expose the reference as nearby selectable text. The heading and receipt content communicate success without relying on icon or color. Use a static busy cue under reduced motion. [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

## Design verification map

| Approved criteria | Checks for implementation and QA |
| --- | --- |
| AC-US03-01, 02, 04 and 08 | Check both country projections, masked visible and spoken document values, option labels, currency, country-neutral app copy, edit links and prerequisite recovery. |
| AC-US03-03 and 09 | Check long published terms at narrow widths, missing/invalid content, fresh Pay checks, a changed revision with renewed acceptance, and terms retry with focus and draft retention. |
| AC-US03-05, 06 and 07 | Exercise both outcome choices in each country, locked activation through both busy phases, rejection-to-approval retry, interrupted reload and same-number terminal receipt restoration. |
| AC-US03-10 | Check keyboard order, visible and unobscured focus, announcements, target sizes, reduced motion, forced colors and reflow at 320 CSS px and 400% zoom. |

The project owner approved the wireframes and interaction guidance.
