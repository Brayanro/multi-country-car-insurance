# US-03 — Identity document masking correction

**Status:** Human approved on 2026-11-22 COT. See [approval record](../docs/approvals/US-03-identity-masking-spec-approval.md).

**Source:** [Technical assessment](../requirements/technical-assessment.pdf), page 8, business rules

**Related stories:** US-01 — Policyholder and vehicle data form; US-03 — Summary and payment

**Related approved decisions:** [ADR-002](../docs/adr/ADR-002-dynamic-form-contract.md), [ADR-003](../docs/adr/ADR-003-frontend-quote-state.md), [ADR-005](../docs/adr/ADR-005-country-terms-and-simulated-payment.md), and [terminal quote amendment](../docs/adr/ADR-005-amendment-terminal-quote.md)

## Problem and objective

The assessment requires the document number to be partially masked in the quote summary. The current approved contract treats the `identityDocument` purpose as optional, and Summary locates the document using that purpose. A published configuration can keep a document-number field but remove its purpose. That configuration remains valid while Summary displays the full value. This correction makes the masking invariant survive supported form publication and completed-quote restoration.

## Scope

- Require each usable country form to identify its policyholder document using exactly one `identityDocument` purpose marker on a required text field.
- Keep the marker independent of editable labels, field order, and Strapi component IDs.
- Reject a published form with no identity-document field, multiple such markers, or a marker on an incompatible field. Follow the existing atomic configuration failure and retry behavior. Preserve the user's draft without rendering a partially refreshed form.
- Apply the approved masking rule to all visible and accessible Summary output and to any newly captured terminal quote review.
- Define safe behavior for already stored drafts and terminal receipts made under the previously optional-purpose contract before changing production code.

The source requires a partially masked document number. Requiring a stable contract marker and rejecting malformed content are proposed implementation decisions, not additional wording from the assessment.

## Proposed acceptance criteria

### AC-US03-M01 — A usable form identifies its document field

**Given** a published country form is decoded

**When** it contains exactly one required text field with `identityDocument` purpose

**Then** the form is usable and Summary locates the document by purpose regardless of its label or order.

**And** Colombia and Chile use the same contract rule.

### AC-US03-M02 — Invalid identity metadata fails closed

**Given** a published form has a missing, duplicate, or incompatible `identityDocument` purpose

**When** the form is loaded or refreshed

**Then** the whole form snapshot is rejected and the established recoverable error and retry state is shown

**And** the app does not render the affected document field or its raw value in Summary

**And** a previously saved draft is retained for recovery and is not partially reconciled against the invalid snapshot.

### AC-US03-M03 — Published label and order changes preserve masking

**Given** a valid form has one `identityDocument` purpose

**When** an editor changes its label or order and publishes the form

**Then** Summary continues to identify and mask the value through purpose metadata

**And** the unmasked value is absent from visible text and the accessibility tree.

### AC-US03-M04 — Existing persisted state is handled safely

**Given** a browser has a draft or completed receipt written under the previously optional-purpose contract

**When** the updated app restores that state

**Then** it does not expose a raw identity-document value because required purpose metadata is absent from the current form or receipt

**And** it preserves country isolation, completed-quote duplicate protection, and the documented retry or recovery behavior.

The exact migration or fail-closed handling for a legacy terminal receipt is unresolved in Q-US03-M01 and must be decided at the architecture checkpoint before implementation.

## Proposed regression tests

| Test ID | Level | Verification |
|---|---|---|
| T-US03-M01 | Shared contract | Accept one required text identity marker. Reject missing, duplicate, optional, and non-text identity markers. Keep existing valid CO and CL fixtures accepted. |
| T-US03-M02 | Shared contract / Strapi integration | Publish a form with missing, duplicate, or incompatible identity metadata. Verify the projection is unavailable and public output never supplies a usable configuration with the document treated as ordinary unmarked text. |
| T-US03-M03 | Angular unit/component | Verify the approved masking cases for values with separators and Unicode letters or digits, plus visible and accessible output. Verify label and order changes do not affect field identification. |
| T-US03-M04 | Browser regression | In both countries, change and publish the identity field label and order without changing purpose, reload, and verify masking. Publish malformed identity metadata and verify recoverable failure without raw Summary disclosure or partial draft replacement. |
| T-US03-M05 | Storage compatibility | Seed legacy draft and terminal receipt envelopes from the existing released format. Verify the selected migration or fail-closed behavior, terminal route protection, country isolation, and absence of the full document. |

## Questions for architecture review

| ID | Question |
|---|---|
| Q-US03-M01 | For existing version 2 terminal receipts, which have only rendered row strings and no purpose metadata, how should the app preserve the terminal quote reference and duplicate lock while preventing disclosure if a row may contain an unmasked document? Assess an explicit receipt format version, safe legacy display behavior, and the treatment of rows that cannot be identified reliably. |
| Q-US03-M02 | Should a usable form require exactly one required `identityDocument` marker, or should the contract add a dedicated typed sensitive/document field property? Select one consistent approach and document its editorial and compatibility consequences. |
| Q-US03-M03 | What recovery message and action should be offered when identity metadata is malformed while preserving an existing draft or terminal receipt? Reuse current form and terminal error patterns where possible. |

## Approval boundary

This proposal changes ADR-002's optional `identityDocument` marker rule and may change the ADR-005 terminal receipt compatibility contract. Obtain explicit human approval of this specification and any new or amended ADR before implementing code. Preserve the existing approved story specifications, ADRs, and approval records as historical evidence.
