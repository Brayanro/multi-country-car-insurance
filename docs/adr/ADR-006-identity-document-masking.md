# ADR-006 — Identity document masking across form revisions and receipt versions

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-03-identity-masking-architecture-approval.md))  
**Applies to** US-01 form contract and US-03, AC-US03-M01 through AC-US03-M04  
**Basis** [Approved masking correction](../../spec/US-03-identity-masking-correction.md), [owner approval](../approvals/US-03-identity-masking-spec-approval.md), and [technical assessment](../../requirements/technical-assessment.pdf), page 8

## Context

[ADR-002](ADR-002-dynamic-form-contract.md) permits an optional `identityDocument` purpose. Summary and receipt capture use that purpose to decide which value to mask. Removing the purpose leaves an ordinary text field. Requiring the purpose somewhere in the form still lets an editor move the marker to a second field while the first key retains its saved document value. Both country seeds already use `identity-document` for the document-number field.

[ADR-003](ADR-003-frontend-quote-state.md) keeps the draft and quote state in the current browser tab. Stored version 1 draft entries carry a key, kind, and value without a record of the previous field purpose. Version 2 receipts from the [ADR-005 terminal amendment](ADR-005-amendment-terminal-quote.md) contain rendered rows with opaque IDs and no masking provenance. Their reference and country can be validated independently of the review.

## Proposed decision

### Bind identity purpose to the existing stable key

Amend ADR-002 to require exactly one required text field with the paired ID `identity-document` and purpose `identityDocument` in each country. The ID is reserved for that purpose and the purpose is valid only on that ID. The shared decoder enforces both directions for Strapi's public projection and Angular's response boundary. Keep form schema version 1, the existing endpoint and public permissions, and the existing `Cache-Control: no-store` behavior. The seeded forms already satisfy the requirement.

Editors retain control of labels, order, help, and supported validation settings. Field keys keep their semantic meaning across revisions. For a custom published form using a different document ID, update the existing identity field to the reserved key in Strapi. Remove any redundant document capture field before republishing. A custom form needing that correction remains unavailable until corrected. The shared contract identifies declared field semantics. Arbitrary sensitive content placed by an editor or entered by a user into a different field is outside its classification guarantee.

Reject an invalid snapshot atomically, including a missing, swapped, duplicate, optional, or wrong-kind identity field. Strapi reuses its `503 FORM_UNAVAILABLE` response for invalid published content. Angular reuses the configuration unavailable state and Retry. It must leave the draft untouched while the snapshot is invalid and must not show Summary or enable Pay against that invalid response. Reuse same-country form loading, explicit refresh, and response generation checks. An already loaded valid snapshot may finish under the existing flow because the identity binding is invariant in every accepted snapshot. During any refresh, ready state and a current validated draft remain prerequisites. Completed receipts remain independent of live configuration.

### Reconcile legacy drafts before they can feed Summary

Keep the country-scoped draft key and introduce a version 2 envelope for drafts normalized under this contract. On the first successful load of a valid form, reconcile a version 1 draft into the new format. Preserve a compatible value at the reserved identity key for the existing masked projection. Clear legacy text and date values at other keys. An unmarked document may have been entered at an arbitrary text key and a date-shaped string may have survived the existing text-to-date reconciliation. The old format cannot prove those values safe to display. Retain compatible number, select, and checkbox entries using normal reconciliation. Cleared fields are unset so required fields must be re-entered and an existing value is never copied to a new semantic role. Preserve country isolation and the ordinary in-memory fallback if writing the normalized draft fails. The same safe migration repeats after reload when storage still holds version 1.

Use the existing shared masking rule in the one review projector consumed by Summary and approval capture. The projector receives only the current decoded form and its reconciled draft. Classify the reserved row at that boundary and mask its value before creating any visible or accessible row. Keep the raw value in the editable draft. Plan, terms, consent and payment behavior from ADR-005 continue to apply.

### Treat a receipt's terminal reference independently of its review

Use the existing per-country receipt key with envelope version 3 for new approvals. Preserve the ordered projection, plan name and typed price. Use a discriminated row within the ordered review for the reserved identity ID, carrying the already masked display value, and ordinary rows for all other IDs. Require exactly one masked identity row. Validate the reserved ID association, unique IDs, bounded strings and country money using existing limits. Reject an identity display value with no mask glyph before any exposed alphanumeric character or with more than four exposed alphanumeric characters. Continue to apply the approved short-value and separator rules at capture. The row variant and shape checks establish an application format boundary. Session storage has no authenticity guarantee against code running in the same origin.

| Stored envelope | Restore decision |
| --- | --- |
| Version 1 with valid country, reference, and original size bound | Restore reference and terminal lock. Reuse the existing detail-unavailable state. |
| Version 2 with valid country, reference, and envelope size bound | Restore reference and terminal lock. Discard the entire review, including all labels and plan metadata. No row ID, label, value, or live form can establish its historical masking provenance. |
| Version 3 with valid country, reference, and envelope size bound | Restore reference and terminal lock. Render the immutable review only after full validation. If the review fails validation, use the reference-only state. |
| Unknown version, invalid header, wrong country, excessive size, or unparseable data | Render no stored content and do not infer an approval from untrusted bytes. A terminal receipt already held in memory retains its lock. |

Retain the existing pre-parse size limit for versions 2 and 3, including worst-case escaped values, and validate the quote reference using the current strict format. Never migrate old receipt rows through a rewrite, re-mask them heuristically, or reconstruct them from a draft or live CMS. Restore takes place before editable route state or content requests. The restored reference alone blocks all same-country wizard edits and Pay, including direct navigation, Back, Forward, and reload. Switching to the other country remains independent. Failed writes retain the masked version 3 projection and lock in memory with the existing reload limitation. Restart uses the current cleanup sequence. Verify draft and plan removal first, delete the single receipt key as the durable commit point, then release the in-memory lock last. Any failed cleanup preserves the terminal guard and supports retry. No new stores, libraries, or network access are required.

## Alternatives and consequences

| Alternative | Trade-off |
| --- | --- |
| Require a unique purpose on any ID | The marker can move to another field while leaving the old document input and its value on an ordinary field. A reserved pair avoids that transition and matches both seeds. |
| Infer identity from labels, pattern, or value | Localization and valid edits make these signals unreliable. |
| Keep other legacy review rows or re-mask selected rows | Legacy rows carry no reliable identity provenance. Reference-only restoration gives up historical detail and keeps the approval and restart behavior. |
| Purge the full legacy draft or carry every legacy field forward | Full purge loses safe selections and compatible canonical identity data. Full carry-forward can display a value from a former unmarked document field. The migration clears only ambiguous legacy string categories outside the canonical field. |
| Store raw receipt values for replay or add a second key | Raw storage increases exposure. A second key creates reset and recovery coordination without improving the masking guarantee. |

## Verification

- **AC-US03-M01 / T-US03-M01** — Accept both seeds and valid label, order and validation edits. Reject a missing or relocated purpose, optional or non-text document, and duplicate purpose or ID. Include a validly shaped second text field that attempts to take the identity marker.
- **AC-US03-M02 / T-US03-M02, T-US03-M04** — Publish invalid snapshots in fixtures and verify Strapi returns its existing unavailable code with no form payload. Check the Angular retry path, loading and stale response guards, no Summary or Pay, untouched stored draft during invalid configuration, and recovery after a valid edit.
- **AC-US03-M03 / T-US03-M03, T-US03-M04** — In CO and CL verify masking for long, short and separator-containing values under label and order changes and confirm the raw value is absent from visible and accessible review text and the new stored receipt.
- **AC-US03-M04 / T-US03-M05** — In both countries seed version 1 drafts with fictitious raw values under canonical and arbitrary text keys and test a date-shaped legacy entry. Validate retention and re-entry behavior. Exercise version 1 and 2 reference-only restore, version 2 rows with unmasked values under arbitrary IDs, wrong-country and corrupt envelopes, version 3 with invalid review, valid frozen version 3 restore during CMS outage, storage write and restart failures, direct URLs and browser history, no duplicate attempts, explicit restart, and isolation of the other country.
