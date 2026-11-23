# ADR-005 — Published terms and simulated payment

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-03-architecture-approval.md))

**Applies to** US-03

**Basis** [Approved US-03 Draft 2](../../spec/US-03.md), [specification approval](../approvals/US-03-spec-approval.md), assessment pp. 2 and 8–9

## Context

[ADR-001](ADR-001-multi-country-content.md) reserves a country-scoped terms document and public read action. [ADR-002](ADR-002-dynamic-form-contract.md) establishes the shared runtime decoder pattern. [ADR-003](ADR-003-frontend-quote-state.md) keeps quote state and payment in the browser, and [ADR-004](ADR-004-plan-catalog-and-selection.md) already gates editable Summary on valid Details and a freshly revalidated plan. The existing Angular 21.2 wizard has the Summary handoff and the Strapi 5.63 controller already serves Form and Plans through the same-origin proxy. US-03 needs a terms revision contract, a payment attempt that refreshes consent before it starts, and a terminal receipt that survives reload.

## Proposed decision

### Published terms contract

Create a Terms collection with Draft & Publish and one document per country. Use the existing country enum and a required, nonblank multiline plain-text body of at most 20,000 UTF-16 code units. Preserve the body as returned by Strapi, including paragraph breaks. Read only the published country document through the Document Service, selecting only country and body. Read up to two documents to detect duplicate publications and fail if either the country or body is invalid. Seed one fictitious, country-specific publication for Colombia and Chile in the existing startup workflow. Track seeding separately from Forms and Plans, skip countries with existing Terms documents during initial seeding, and preserve editorial changes and deliberate unpublication on subsequent starts. [Strapi publication status](https://docs.strapi.io/cms/api/document-service/status)

Add `GET /api/quote-content/v1/:country/terms` to the existing quote-content controller. Use the existing country parser and reject request query parameters. Project `{ schemaVersion: 1, country, revision, text }`. Define `revision` as the lowercase hexadecimal SHA-256 of the UTF-8 JSON tuple `[1, country, text]`, computed by Strapi from the projected values. It identifies the exact country text the user can accept. Publishing changed text changes its revision and republishing identical text keeps the revision. The shared `@quote/contract` decoder checks the envelope version, expected country, revision format and text bounds at the server and browser boundaries. Angular presents terms as text, preserving line breaks and treating markup as literal content. [Angular security](https://angular.dev/best-practices/security)

| Outcome | Response |
| --- | --- |
| Valid published document | `200` with the terms envelope |
| Unexpected query parameters or unsupported country | `400 INVALID_REQUEST` or `404 UNSUPPORTED_COUNTRY`, respectively |
| No published document | `404 TERMS_NOT_PUBLISHED` |
| Duplicate or invalid published configuration | `503 TERMS_UNAVAILABLE` |
| CMS retrieval failure | `503 CONTENT_UNAVAILABLE` |

Reuse the `{ error: { code } }` envelope and `Cache-Control: no-store` on handler outcomes. Extend the same-origin, GET-only proxy allowlist and add only `api::quote-content.quote-content.readTerms` to the Public role alongside Form and Plans. Generated CRUD, draft and admin access, and write credentials stay outside the public contract. The terms request carries the country in the path and no quote, consent or payment data. The proxy bypasses caching as it does for Form and Plans. [HTTP caching](https://www.rfc-editor.org/rfc/rfc9111.html)

### Summary and consent

Extend the existing Summary handoff. Build a read-only review projection from the active country's validated, reconciled Details and freshly selected Plan. Use current field order, labels and option labels, the existing money formatter and the plan's final price. Mask the `identityDocument` value before it enters the review projection so both visible and accessible output use the same masked string. Apply Q-US03-01 to alphanumeric characters, preserving separators. Keep the raw value in the existing Details draft only. There is no additional form field or network contract for the review.

Read Terms on Summary entry and explicit retry through the existing `HttpClient` and signals pattern. Bind consent in memory to the active country, terms revision and the review snapshot. Compare snapshots by value using the current field identifiers, kinds and normalized values, and the selected plan ID and final money value. Navigation back to edit preserves Details and the plan candidate under their existing rules. A change to normalized quote data, plan, price or terms revision invalidates consent. Cancellation and generation checks prevent superseded responses from replacing active terms. Loading or failed reads leave the review available with payment blocked. A successful recovery read may restore eligibility using prior consent only if the revision, text and quote snapshot still match. Recovery itself never invokes the simulator. The next Pay still performs its own fresh read. [Angular HTTP requests](https://angular.dev/guide/http/making-requests)

### One simulated attempt and terminal recovery

1. The quote feature owns one attempt state per country. A single Pay command checks the live editable Summary prerequisites, consent and absence of a busy or completed payment. It synchronously reserves an attempt before requesting fresh country Terms. That reservation locks submission during both the refresh and the simulation. The attempt captures the country, active Summary generation, consent binding and the selected demo outcome.
2. Only the current attempt may act on the refresh result. Recheck the active country and Summary generation, current Details and plan validity, quote snapshot, and consent. A valid changed revision replaces the presented terms and clears consent. A failed or invalid read leaves a recoverable terms error. These outcomes release the reservation without invoking the simulator. If the quote or consent changed during the read, release the reservation and let the existing prerequisite checks run. A match on revision, terms text and quote snapshot advances directly to processing under the same reservation. A response that pairs the accepted revision with different text is invalid.
3. The local asynchronous simulator accepts only the captured Approved or Rejected outcome. Approved is the selector default. Outcome changes after reservation apply to a subsequent attempt. The simulator has no external side effects and takes no card, Details or plan data. Only the matching live attempt may settle. Rejection releases the lock with a retryable error and keeps the draft, selected plan and matching consent. A retry goes through the same Pay command and a fresh terms read. Leaving Summary, switching country or replacing the quote invalidates outstanding work. Cancel pending reads and ignore callbacks that can no longer settle. Browser Back or Forward cannot replay Pay.
4. Success creates one browser-generated opaque simulated quote number and commits an immutable terminal receipt once. Persist only the minimal completed receipt in a bounded, versioned country-scoped `sessionStorage` record alongside the existing draft and plan entries. Keep country and quote number in the receipt. Decode the record as untrusted input, rejecting oversized, unknown-version, malformed or wrong-country values. Consent and unfinished attempts stay in memory. After reload, an interrupted attempt therefore cannot resume or settle. The person returns through the existing Details and plan checks and can retry after current consent. If storage is unavailable, retain the same duplicate guard and receipt for the current page session under ADR-003. [HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html)
5. A valid restored receipt is the terminal confirmation for the current country quote. On the Summary route, restore that confirmation without opening editable Summary or presenting live plan, price or terms as part of the receipt. CMS changes and edits reached through browser history cannot alter or reopen a settled result. Switching back to that country preserves the receipt. ADR-003 reserves clearing the country quote for an explicit start-new-quote reset. The current app has no such action, and US-03 requires only the reset boundary. A future explicit reset clears the receipt, draft, plan and in-memory payment state, with the terminal lock cleared last so a partial reset cannot silently reopen the completed quote. Editable Summary for an unfinished or explicitly reset quote still uses the live prerequisite redirects in ADR-004.

## Alternatives and consequences

| Alternative | Trade-off |
| --- | --- |
| Embed Terms in Form Configuration or expose generated Strapi reads | Embedding ties independent publication schedules together. Generated reads widen the public surface. The dedicated action adds one bounded response and Public permission. |
| Use `updatedAt`, `publishedAt` or an editor-entered revision | Metadata can change while the displayed text is unchanged. Manual revisions can drift from text. The content fingerprint follows what the person reviews and accepts. |
| Trust terms from Summary entry or lock only once simulation begins | Entry-only terms can miss a published change. A later lock allows overlapping Pay refreshes. Reserving before the fresh read costs one terms request per eligible Pay attempt and closes that overlap. A CMS publication after the successful read may still occur while the local simulation runs. |
| Persist consent and unfinished attempts or require fresh CMS data to restore a receipt | Persisting in-flight state needs restoration rules and risks replay. Revalidating a historical receipt against current editorial data can erase access to a completed result. A minimal terminal record supports reload without reviving unfinished work or copying quote details. |
| Add a server-side payment endpoint | Server persistence could coordinate across tabs or devices. The approved simulator is local, so tab-scoped duplicate protection has no server or gateway dependency. |

## Verification

- Use AC-US03-01, AC-US03-02 and AC-US03-04 / T-US03-01, T-US03-02 and T-US03-04 to verify the review projection and same-country edit path in Colombia and Chile. Check that the full document is absent from the visible and accessible Summary.
- Use AC-US03-03 and AC-US03-09 / T-US03-03 and T-US03-11 to verify country-isolated published reads, revision changes and identical republishes, draft isolation, missing/invalid/unavailable terms, fresh Pay reads and consent invalidation. Verify the Public role and proxy allow only the intended content reads, and confirm a published terms edit reaches the running Angular build.
- Use AC-US03-05 through AC-US03-08 and AC-US03-10 / T-US03-05 through T-US03-09 to verify one attempt through both phases, deterministic Approved and Rejected in both countries, retry, late responses after navigation, and reload of interrupted and completed states. Check wrong-country and corrupt storage, memory fallback, and completed receipt recovery after rejected live prerequisites without opening editable Summary. T-US03-10 covers the full flow at project verification.
