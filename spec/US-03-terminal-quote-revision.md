# US-03 — Terminal quote and restart proposal

**Status** Human approved on 2026-11-22 ([approval record](../docs/approvals/US-03-terminal-quote-spec-approval.md))

**Basis** [US-03 Draft 2](US-03.md), [ADR-005](../docs/adr/ADR-005-country-terms-and-simulated-payment.md), [approved design](../docs/design/US-03-summary-and-payment.md), and the project owner's follow-up request.

## Changes to approved decisions

| Approved decision | Proposed revision |
| --- | --- |
| AC-US03-07 and ADR-005 restore a terminal receipt on Summary. The other wizard routes currently remain reachable through history or direct navigation. | Make confirmation the only reachable wizard step for an approved quote until the user explicitly starts a new quote. |
| ADR-005 persists only the country and quote number. The approved confirmation shows the reference. | Preserve a frozen, masked review of the completed Details, chosen plan and final price with the receipt. Restore the same review after reload even if Strapi content changes. This requires revising the minimal receipt storage decision. |
| ADR-005 defines a future reset boundary. The approved design has no reset action. | Add one **Iniciar una nueva cotización** action on the confirmation screen and return to the current country's Details after reset. |

## Proposed acceptance criteria and regression coverage

| ID | Behavior | Regression verification |
| --- | --- | --- |
| AC-US03-R01 | After approval, opening the same country's Details or Plans URL or reaching either via Back or Forward redirects to confirmation without exposing editable fields or plan controls. The receipt and protection survive reload. The other country's wizard remains independent. | In CO and CL, approve a quote, exercise direct entry and browser history, and reload. Verify the same reference, no editable controls and country isolation. |
| AC-US03-R02 | Confirmation displays the approval, quote reference and read-only Details and plan/final price as captured at approval. The document remains masked. Changes to live form labels, plan prices or availability do not alter a completed quote. | In both countries, verify the approved projection and masked value, then reload after a changed or unavailable catalog and compare the receipt and projection. |
| AC-US03-R03 | Starting a new quote clears the current country's entered data, selected plan, consent, payment attempt and terminal receipt from memory and wizard persistence. It opens same-country Details with configured defaults. Subsequent reloads and old history entries cannot restore the previous approval. | In both countries, reset after approval, reload and revisit the old Summary URL. Verify the old reference and selection are absent, new Details can be entered, and a subsequent approval has a new reference. |
| AC-US03-R04 | Rejection preserves edit and plan navigation, terms checks, and retry with the entered values and selected plan retained. | In both countries, reject, return to Details and Plans, verify retained values and selection, and retry to approval. |

## Decisions for architecture and design review

- Propose persisting only the frozen display projection needed for the receipt, including the already masked document value. Keep the existing country- and tab-scoped boundary. Do not derive historical values from mutable drafts or live content after approval.
- Existing minimal-format receipts already in open tabs have no historical review projection. Propose restoring those receipts with the same reference, terminal route protection and restart action. Display the full read-only review on newly approved receipts. Do not reconstruct an older completed quote from mutable data.
- Preserve the approved principle of releasing the terminal lock last. Specify reset failure handling so a partial persistence failure does not report a successful restart and allow the old approval to return on reload.
- Extend the existing confirmation design with a read-only review and a keyboard-accessible restart action that moves focus to the same-country Details heading after success.

The specification revision is approved. ADR-005 and the confirmation design require their own revisions and approval before implementation.
