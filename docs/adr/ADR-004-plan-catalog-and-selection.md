# ADR-004 — Published plan catalog and quote selection

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-02-architecture-approval.md))  
**Applies to** US-02  
**Basis** [Approved US-02 specification](../../spec/US-02.md), [approval record](../approvals/US-02-spec-approval.md), and assessment pp. 2–3 and 7

## Context

[ADR-001](ADR-001-multi-country-content.md) reserves the country-scoped plan read boundary, [ADR-002](ADR-002-dynamic-form-contract.md) establishes the shared runtime decoder pattern, and [ADR-003](ADR-003-frontend-quote-state.md) assigns selection and price state to the browser. US-02 needs the plan-specific read contract and a rule for revalidating the selection at the same-country summary handoff.

## Proposed decision

### Strapi publication and public contract

Use a Strapi Plan collection with Draft & Publish. A plan document owns its country (`co` or `cl`), name, short description, base price, currency, order, active and recommended flags, and ordered coverage and benefit lists. Lists use repeatable components with one plain-text entry each, so the plan and its lists publish together. Use the stable Strapi `documentId` as the opaque public plan ID. Republish keeps the same plan identity and a newly created document receives a distinct one. [Strapi Document Service](https://docs.strapi.io/cms/api/document-service)

Add `GET /api/quote-content/v1/:country/plans` to the existing quote-content controller. Use the existing canonical API country parser and reject caller-provided query parameters. Query the Document Service with `status: 'published'`, `country` and `active: true` filters, and populate only the two lists. Read up to one record beyond the limit so an over-limit catalog fails without publishing a partial list. Isolate draft edits, and pick up publishes, unpublishes and active-status changes on the next read. [Strapi publication status](https://docs.strapi.io/cms/api/document-service/status) · [Document Service pagination](https://docs.strapi.io/cms/api/document-service/sort-pagination)

Project an allowlisted `{ schemaVersion: 1, country, plans }` envelope. Each plan projects `id`, `name`, `shortDescription`, `basePrice: { amountMinor, currency }`, `coverages: string[]`, `benefits: string[]`, `order` and `recommended`. The controller verifies source country and active status before projection. Database row IDs, draft metadata and component records stay outside the contract. Sort plans by ascending nonnegative integer `order`, then by ordinal `id` on ties. Preserve the configured order within each list and project the configured recommendation flag independently of selection.

Extend `@quote/contract` with a pure plan catalog decoder for Strapi and Angular. Reject mismatched version or country, duplicate IDs, non-Boolean flags, unsafe IDs or numbers, incompatible currency, missing fields, and malformed list entries. Bound a country catalog to 40 eligible plans and each list to 20 entries. Require nonblank plain-text values with at most 240 code units. A list may be empty. Reject the entire eligible catalog on invalidity. Render projected copy as text.

| Outcome | Response |
| --- | --- |
| Valid catalog, including no published active plans | `200` with the envelope. `plans: []` represents the empty state. |
| Unexpected query input or unsupported country | `400 INVALID_REQUEST` or `404 UNSUPPORTED_COUNTRY`, respectively |
| Invalid or over-limit eligible catalog | `503 PLANS_UNAVAILABLE` |
| Strapi read failure | `503 CONTENT_UNAVAILABLE` |

Reuse `{ error: { code } }` and `Cache-Control: no-store` for handler outcomes. Add only `api::quote-content.quote-content.readPlans` to the Public allowlist alongside `readForm`. Extend the exact same-origin proxy allowlist to the plans read path. Keep generated Plan CRUD, previews, raw CMS data and write credentials out of public access. Add fictitious startup plans for both countries using an independent, retry-safe seed that preserves editor changes and deliberate unpublication on later starts.

### Money contract

The configured Strapi base price is the final price. Store the editor value as a nonnegative decimal in major units and validate currency by country (`co → COP` and `cl → CLP`). Normalize by decimal digits to a safe integer `amountMinor` up to 999,999,999,999, with up to two fractional digits for COP and whole units for CLP. Reject excess precision or invalid values before serving the catalog. Use `Intl.NumberFormat` for `es-CO` or `es-CL` with the matching currency and precision. Keep one typed money value for the list and the handoff. The browser's validated Details snapshot is a navigation prerequisite. The price calculation has no dependency on that snapshot. [ECMAScript internationalization](https://tc39.es/ecma402/#numberformat-objects)

### Selection and route handoff

Keep the US-01 country-parameter and form-reconciliation flow. Extend the existing quote feature to recognize `/:country/quote/summary` as the same-country handoff seam. The live US-01 validator checks the current form and draft before entering Plans or opening the seam. Invalid Details return to the same country's Details, and a form retrieval failure keeps the form recovery path available. Returning to Details preserves its draft. [Angular route state](https://angular.dev/guide/routing/read-route-state)

- Read Plans after successful Details validation on entry or re-entry, on reload, country change and explicit retry. Use the existing `HttpClient` and signal-store pattern. Clear ready status during a read, cancel superseded requests and check country and request generation before using a response. A failed or invalid response leaves the user on the recovery path with progression blocked.
- Keep at most one candidate per country, containing an explicitly chosen plan ID and the price and currency at choice. Replace it when another plan is chosen. Restore the candidate from bounded, versioned, country-scoped `sessionStorage` as untrusted input, with the existing memory fallback. Keep the US-01 draft compatible. Starting a new quote clears its candidate.
- A successful re-read retains the candidate only if the plan still exists in the eligible catalog at the same amount and currency. A removed, unpublished, inactive or repriced plan clears the candidate and requires an explicit choice. A valid Details edit can keep an unchanged selection because price is independent of Details. An invalid draft or a request in progress or failing blocks use of the candidate. A temporary failure can retain the candidate for revalidation on retry.
- Continue requires a current valid draft and a ready catalog with a validated candidate. Every attempt to enter Summary, including direct or history navigation, checks Details and requires a candidate. When both prerequisites exist, obtain one fresh catalog response and keep the handoff closed during that read. Recheck the active route, valid Details and unchanged candidate before exposing the selected plan and final price from the fresh result. Missing or invalidated selection goes to the same country's Plans. Plan-read failures use the Plans retry state. Reuse that attempt's fresh result or failure on this redirect, so it cannot trigger a retry loop. This is a frontend quote-flow boundary. No quote data travels with the GET.

## Alternatives and consequences

| Alternative | Trade-off |
| --- | --- |
| Generated Strapi reads or embed Plans in Form Configuration | Generated reads widen the public contract. Embedding binds two independent publication schedules. The dedicated action adds one bounded contract and permission while keeping editorial workflows independent. |
| Trust the cached list or persist a full plan as a quote lock | Both save a handoff read and can carry withdrawn plans or outdated prices into Summary. Rechecking adds one request per attempt and validates against the response observed at handoff. A later publication can still occur after that response. |
| Clear every choice on any Details or catalog change | Simpler invalidation would discard explicit choices after unrelated edits. Preserving the choice only for the same eligible plan and price keeps Back and reload useful. |

Verify published country filtering, deterministic ties, draft-edit isolation, anonymous action restrictions, no-store, both country money formats and the valid empty list under AC-US02-01–03, 05–06 and T-US02-01–03, 05–06. Cover stale and superseded requests, price changes or removal between list and handoff, unchanged choice restoration, and direct or history navigation under AC-US02-04 and 06 / T-US02-04 and 06.
