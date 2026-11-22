# ADR-003 — Frontend-only wizard state

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-01-architecture-approval.md))  
**Applies to** US-01, with shared state boundaries for US-02 and US-03  
**Basis** [US-01 Draft 3](../../spec/US-01.md), assessment pp. 2 and 6–9, and project owner's frontend-only data boundary

## Context

Step 1 must restore a draft when navigating back and reconcile from a newly retrieved form. Later steps depend on the same vehicle and policyholder data, plan selection, and terms and simulated payment status. Strapi owns business content. It does not receive customer, vehicle, quote, plan selection, or payment data.

## Proposed decision

Use a small Angular Signals store with explicit commands, typed snapshots, and read-only projections. Scope it to the app's quoting flow so route components can be recreated. Pass the country's decoded Router value to state accessors and store separate country snapshots. Never read a previous country's data while a new country is loading. Store normalized typed drafts with original field kind and stable field identifier; keep touch/submit and focus state in the component. The reconciler atomically replaces the active snapshot after a valid refresh and the store supplies the later-step projection only for the active country.

Use a small versioned, tab-scoped `sessionStorage` envelope for fictitious wizard state. The signal store owns the current state; the adapter writes full snapshots and validates the restored shape and country. Treat browser storage as untrusted, revalidate fields against freshly retrieved content before advancing, and reject malformed or unknown-version stored data. A recoverable content error retains the draft but blocks progression. If storage is blocked or fails, continue using memory for the current page session and make reload recovery unavailable. Clear the country draft when the user starts a new quote. Do not put quote data in URLs, cookies, analytics, diagnostic logs, content requests, or server persistence. App-opened separate tabs should omit `opener` where relevant. A duplicated or opener-linked tab can inherit an initial copy and then diverge. The design promises no cross-tab or cross-device guarantees. [HTML Web Storage standard](https://html.spec.whatwg.org/multipage/webstorage.html)

The US-01 step-2 handoff can be verified with a same-country route or narrow screen that allows going back. It owns no plan UI or plan business behavior. Future deep links to plans or summary check the matching country and current prerequisites, then navigate to the earliest incomplete step within that country. Client guards are wizard navigation controls. The data boundary is implemented by the public API shape and the absence of quote-write operations. [Angular Router guards](https://angular.dev/guide/routing/route-guards)

## Consequences for later stories

- **US-02** consumes a current, validated Step 1 snapshot and published active country plans. Store only one selected plan reference per quote along with the calculated price snapshot and its inputs or revision linkage as specified later. A change to inputs or available plans invalidates dependent selections or totals when the later rules require it. Recheck prerequisites before summary.
- **US-03** derives the review from current country fields and masks the identity document in presentation. Use stable field purpose metadata to locate the document independently of its label. Bind consent to the current terms revision and quote snapshot. Proposed duplicate protection is an atomic attempt transition in the same store, from eligible to processing before the asynchronous simulation starts. Only the matching attempt can settle, repeat clicks do not enqueue, success keeps one confirmation number for that completed quote, and a reported failure may retry. The US-03 spec and checkpoint will decide how reload handles a persisted processing attempt and completed receipt. No real gateway, card data or global idempotency service is implied.

## Alternatives and consequences

| Alternative | Trade-off |
| --- | --- |
| Memory only | Lowest retention, with loss on reload and no reconciliation of previously saved data after refresh. |
| Browser persistent storage or IndexedDB | Longer recovery and broader synchronization options, with unnecessary fictitious customer-data retention and more cleanup or coordination. |
| Server quote collection or hosted state | Could support cross-device resume and global deduplication, contrary to the frontend-only customer and quote data boundary. |
| General-purpose state management library | Provides conventions for large applications. Three wizard steps can share a signal store without that dependency. |

Verify same-country Back and Forward, country-switch isolation, restoration plus reconciliation after reload, graceful storage failure, and exclusion of quote data from network requests. Exercise duplicate payment attempts and reload outcomes under US-03. US-01 traces to AC-US01-06, 08, 09, 13 and 14 and T-US01-07, 08, 09, 13 and 14.

[Angular Signals](https://angular.dev/guide/signals)
