# Auto insurance quote wireframes

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-01-design-approval.md))  
**Companion** [Design system](US-01-design-system.md)  
**Scope** US-01 ready for design review. US-02 and US-03 illustrate future steps based on assessment pages 7–9.

These static frames show layout, reading order, controls and transitions. Open an SVG at its full size for small text. Mobile frames show scrollable document length. Plan prices, dates, identifiers, vehicle data and payment reference are illustrative and fictitious.

## Journey

| View | Desktop | Mobile | Design intent |
| --- | --- | --- | --- |
| Choose a country | [Desktop](wireframes/01-country-desktop.svg) | [Mobile](wireframes/01-country-mobile.svg) | Name both supported countries with an explicit link for each. The selection happens before wizard progress begins. |
| US-01 details | [Colombia](wireframes/02-details-desktop.svg) · [Chile](wireframes/02-details-alternate-desktop.svg) | [Chile](wireframes/02-details-mobile.svg) · [Colombia](wireframes/02-details-alternate-mobile.svg) | Show the selected country’s published fields in order, visible labels and help, and an active Continue in the ready form. |
| US-02 plans · concept | [Desktop](wireframes/03-plans-desktop.svg) | [Mobile](wireframes/03-plans-mobile.svg) | Compare published active plans in local currency. A single choice has its own selected state, separate from the recommendation. |
| US-03 summary · concept | [Desktop](wireframes/04-summary-desktop.svg) | [Mobile](wireframes/04-summary-mobile.svg) | Review country-specific details and masked identity, change data or plan, then read the terms and consent to the simulation. |
| US-03 confirmation · concept | [Desktop](wireframes/05-confirmation-desktop.svg) | [Mobile](wireframes/05-confirmation-mobile.svg) | Explain the simulation outcome and make the quote reference easy to find and copy. Confirmation is the completion of step 3. |

### Status variants

| View | Desktop | Mobile | Trigger and recovery |
| --- | --- | --- | --- |
| Unsupported country | [Desktop](wireframes/06-country-unsupported-desktop.svg) | [Mobile](wireframes/06-country-unsupported-mobile.svg) | Keep the attempted route and offer links to Colombia and Chile. Initial selection without a country uses the standard selector without an error. |
| Form retrieval | [Desktop](wireframes/07-loading-desktop.svg) | [Mobile](wireframes/07-loading-mobile.svg) | Initial request, reload, country change, or retry. Announce loading and withhold inputs and progression until the selected configuration is ready. |
| Unavailable or invalid form | [Desktop](wireframes/08-unavailable-desktop.svg) | [Mobile](wireframes/08-unavailable-mobile.svg) | Includes network failure, empty publication, malformed definitions, and required selects with no valid options. Display a local message and Retry. Keep the affected country's drafts in browser state. |
| Invalid details | [Desktop](wireframes/09-details-validation-desktop.svg) | [Mobile](wireframes/09-details-validation-mobile.svg) | Illustrates a failed Continue, first-invalid focus, per-field messages, age and year boundaries, and a required select with valid choices still unselected. |
| No available plans · concept | [Desktop](wireframes/10-no-plans-desktop.svg) | [Mobile](wireframes/10-no-plans-mobile.svg) | No active published plans for the current country. Explain the empty list and offer Back to details. |
| Processing simulation · concept | [Desktop](wireframes/11-payment-processing-desktop.svg) | [Mobile](wireframes/11-payment-processing-mobile.svg) | Announce processing and show the locked action. The summary and consent remain in quote state. |
| Failed simulation · concept | [Desktop](wireframes/12-payment-retry-desktop.svg) | [Mobile](wireframes/12-payment-retry-mobile.svg) | Announce failure and offer retry without asking the user to re-enter the quote. |

## Interaction annotations

1. **Country.** At the root, the country tiles are links to canonical `/co/quote/details` and `/cl/quote/details`. They are identifiable by country name and ISO code. The selector and unsupported-route recovery expose the supported country links. The URL is the source of truth during the wizard, including when the user navigates Back or Forward. Opening a different country triggers a fresh read and restores only that country’s draft when available. The original country can be revisited in the same tab via its route.
2. **Ready details.** Example fields include text identity and plate, date, numeric year, select and Boolean checkbox. Colombia's document type and placa and Chile's RUT and patente represent one possible published configuration. The order in each example is illustrative. Take the real field sequence, labels, helper text and rules from Strapi. Center the progress track and active step lane on desktop. Arrange the same field sequence row by row in the wide lane and in one column on narrow screens. Continue leads to the configured US-01 handoff and Back restores compatible values. Real plan selection is future work.
3. **Validation.** The initial placeholder in a required select announces a choice is needed without an initial error. An invalid blur displays that field's first applicable configured message. A touched value is rechecked as it changes. An unsuccessful Continue evaluates the whole form, keeps the user in place, and focuses the first invalid control in DOM order. Use an accessible message association, a visible focus outline, and a single current error per field. Avoid announcing the same message again when focusing it. Age and year messages in the frame are illustrative.
4. **Loading and recovery.** On retrieval or refresh, the shell remains while the active URL country’s fields are unavailable. The same generic recovery panel handles the invalid and no-publication cases. Retry reloads the active country's content, does not use a stale or different-country form, and reconciles by stable ID on success. Recheck the form and block progression if a retained value no longer validates or a new required field is empty. Focus the new main heading on explicit route changes. After an in-place retry, announce the result and place focus on the restored form heading if Retry was removed. Keep focus visible if a repeated failure retains Retry.
5. **Plan comparison concept.** Use one native radio group. The option's accessible name includes its plan name, with the price and concise coverage and benefits available in the same choice. Mobile stacks options in published order. The recommended tag does not choose for the user. Only a chosen plan proceeds to the summary. Price cadence and example coverage names are for later specification.
6. **Summary and consent concept.** Group policyholder and vehicle values with a nearby Edit link. Mask the document value in both rendered and assistive-technology text. Show selected plan and final price in the selected country's currency. The terms affordance can expand an inline section for current country terms. Place the native checkbox before Simular pago. Show why the action is unavailable until checked. Concepts use no real payment forms or card inputs. Processing locks repeated activation, failure preserves details and offers retry, and success shows one fictitious quote number under the same country.

Future steps use the same country and progress shell. Accessible loading and empty status placement, source-labeled content, and language are consistent across frames. The later payment status frames isolate the changed panel for review. A complete later-flow screen can keep the review context around it under its own approval.

## US-01 design traceability

| Acceptance criteria | Wireframe or annotation |
| --- | --- |
| AC-US01-01, AC-US01-07, AC-US01-09, AC-US01-12, AC-US01-15 | Both country details examples and annotation 2. Strapi owns the labels, control set and sequence. Stable IDs, typed value shapes and updates are verified once implemented. |
| AC-US01-02, AC-US01-03, AC-US01-04, AC-US01-16 | Ready, invalid and unavailable frames plus annotations 2–4. See focus, configured messaging, age/year and the distinction between an unselected select and an invalid configuration. |
| AC-US01-05, AC-US01-08, AC-US01-14 | Loading and unavailable variants, plus annotation 4 for fresh reads, quote retention and recovery reconciliation. |
| AC-US01-06 | Details and future plan back link, plus annotation 2. Verify the production US-01 handoff restores values before exercising the later screens. |
| AC-US01-10 | All responsive pairs and the [layout and component guidance](US-01-design-system.md#layout-and-order). Verify target size, focus order, reflow, accessible names and keyboard completion in the application. |
| AC-US01-11, AC-US01-13 | Standard and unsupported country selection plus annotation 1. Verify URL normalization and state isolation in the browser. |

## Review decisions

- Review the centered desktop steps and blue primary actions. The picker and unsupported-route recovery remain available for country selection.
- Confirm the document-like density, including a two-column desktop field layout and one-column mobile layout.
- Confirm the proposed Spanish shell labels and messages. Country-specific fields, labels, options, validations and product copy remain supplied by Strapi.
- Review later concepts for continuity. Their step behavior, quote calculations, consent, and simulation details remain subject to US-02 and US-03 specifications and approval.
