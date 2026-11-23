# ADR-005 amendment — Terminal quote and restart

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-03-terminal-quote-architecture-approval.md))

**Applies to** US-03, AC-US03-R01 through AC-US03-R04

**Basis** [Approved terminal quote revision](../../spec/US-03-terminal-quote-revision.md), [revision approval](../approvals/US-03-terminal-quote-spec-approval.md) and [ADR-005](ADR-005-country-terms-and-simulated-payment.md)

## Context

The approved revision changes the completed quote behavior in steps 4 and 5 of ADR-005. The existing Angular wizard reads a minimal receipt on Summary, but can still open editable Details and Plans with that receipt present. It stores editable Details, the plan candidate and the receipt in independent country-scoped keys. The revision makes confirmation terminal across wizard routes, restores the captured review and introduces an explicit country-scoped restart. The content and payment boundaries in [ADR-001](ADR-001-multi-country-content.md), [ADR-003](ADR-003-frontend-quote-state.md), [ADR-004](ADR-004-plan-catalog-and-selection.md) and ADR-005 continue to apply to unfinished quotes.

## Proposed decisions

### Gate the wizard on the terminal receipt

Keep `/:country/quote/summary` as the confirmation route for a completed quote. Continue using the existing route parameter subscription, including for a reused quote component and browser history. Decode the country and synchronously resolve its terminal receipt before exposing any editable route state or requesting live quote content. A valid receipt takes precedence over Details, Plans and editable Summary. Replace an attempted same-country Details or Plans history entry with the canonical Summary URL and render only confirmation. No editable control is instantiated while the redirect is pending. Confirmation reads the receipt directly and has no form, catalog or terms prerequisite. Keep the terminal check reactive so successful completion also switches the current Summary to confirmation without waiting for a navigation. [Angular route state](https://angular.dev/guide/routing/read-route-state) · [Angular Signals](https://angular.dev/guide/signals)

Reuse the route and attempt generations to suppress superseded work at navigation and restart. A retained event or delayed response must not re-enter an editable step, persist an old draft or plan, or settle an attempt after the quote becomes terminal or its state is reset. Receipt lookup and redirect decisions always use the canonical active country. Rejection creates no receipt and keeps the existing edit, plan selection and retry behavior, including a fresh terms check on Pay.

### Freeze the review at approval

After the live attempt passes its final eligibility check, use the existing review projector to capture ordered label and display-value rows, including the already masked identity document. Capture the chosen plan's displayed name and validated final `{ amountMinor, currency }` at the same transition. Generate the existing opaque quote reference once and commit the immutable receipt as one snapshot. Copy display values out of the editable state. Restore and display the snapshot with the existing country money formatter. A published change, removal or outage cannot alter it. Treat values as plain text in both visible and accessible output.

Store `{ version: 2, country, number, review: { rows, planName, price } }` in the existing per-country receipt key, `quote-receipt-v1:<country>`. The key stays stable. The envelope version determines the decoder. Persist only row id, display label and display value for each row, alongside the plan name and typed price. Keep the raw document, full draft, full plan catalog, terms, consent and attempt data out of the receipt.

Validate one bounded envelope before rendering. Check version, country, quote reference format, ordered rows with unique valid field ids, text limits and country money. Use the existing form and plan contract limits as the source for bounds. The current contract permits 40 rows, field ids of up to 40 safe characters, labels and plan names of up to 240 UTF-16 code units, and free text of up to 256 Unicode code points. A projected value therefore needs up to 512 UTF-16 code units, including supplementary characters. The field and string limits plus worst-case JSON escaping, price and envelope fit within a 200,000 UTF-16 code unit pre-parse limit. Use only the decoded fields for rendering. An invalid version 2 record does not fall back to a reference-only receipt. If writing a valid receipt fails, preserve the full terminal receipt and duplicate lock in memory under ADR-003 and surface that reload recovery is unavailable. Never write a partial or version 1 substitute.

Continue decoding the existing version 1 envelope in that same key with its original bounds and country and number checks. It restores the original reference, terminal gate and restart behavior. Its historical review is unavailable. There is no backfill from mutable state and no migration write during restore. The single key avoids a second legacy lookup that could revive an old receipt after restart.

### Restart and release the terminal lock last

Use one restart command for the active country and terminal receipt. Run the synchronous persistence sequence through the existing state owners, with an explicit outcome for every storage action. The current draft and candidate persistence helpers can swallow failures for ordinary edits. Restart must observe failures and may not use silent success from those paths. [HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html)

1. Keep confirmation and the terminal guard in place throughout reset. Invalidate pending country-scoped form, plan, terms and payment work before clearing persisted state. Ignore repeated reset requests while a reset is in progress.
2. Remove the active country's draft and candidate keys and read each back to confirm absence. A failure stops the reset before touching the receipt key. A partially cleared draft or candidate stays inaccessible behind the receipt. Retry repeats the removals safely. The other country is outside this operation.
3. After both absence checks succeed, remove the active country's single receipt key. This is the persistent commit point for both version 1 and version 2. A thrown removal leaves the terminal receipt and lock in place. A successful Web Storage removal commits the durable reset. Avoid a further fallible storage read or write between that deletion and clearing memory. There is no secondary receipt key to delete or fall back to.
4. Clear that country's in-memory draft, plan candidate, terms and consent, and attempt and receipt state. Use explicit empty memory state so restoration cannot re-read old objects. Release the in-memory terminal lock last and navigate to canonical same-country Details with fresh configuration and its defaults. Failure to load configuration or complete navigation after the reset uses the wizard's existing recovery paths. It does not revert the reset. Old Summary history entries go through unfinished-quote prerequisites.

If storage cannot be accessed or a required cleanup cannot be verified before the commit point, report a retryable restart failure and stay terminal. A memory-only receipt can restart after the same cleanup succeeds, including when its receipt key was never written. The pre-existing memory fallback still limits reload guarantees when storage was unavailable during approval.

## Alternatives and consequences

| Alternative | Trade-off |
| --- | --- |
| Gate only Summary or restore by replaying live reads | An editable route could reopen the flow, and historical values could change with publication or retrieval failures. The route gate and stored review remove both dependencies. |
| Store a raw draft and full plan DTO in the receipt | Reformatting would depend on future schemas and expose more editable data to receipt storage. The bounded display snapshot preserves the approved view with less data. |
| Add a separate version 2 receipt key or migrate all quote state into one envelope | Both require coordinating old and new keys during restore and reset. Versioning the existing receipt envelope lets one final removal clear either format. |
| Clear memory first or delete the receipt before the draft and plan | A failure could reopen a quote with stale data or leave a receipt that returns on reload. The terminal record remains until earlier cleanup is verified. |

## Verification

- **AC-US03-R01** — In CO and CL, verify a completed quote reaches only confirmation through direct URLs, Back, Forward and reload, and edits cannot briefly render. Check legacy receipts and navigation to the other country.
- **AC-US03-R02** — In each country, compare the masked captured review, amount and reference after changed or unavailable Strapi content. Test the worst-case valid projection against the codec, and reject corrupted and wrong-country envelopes. Verify that failed writes retain the full review in memory.
- **AC-US03-R03** — Verify reset of both receipt versions, fresh Details defaults and absence of the old approval after reload and history navigation. Inject failure at each durable cleanup stage, check that reload stays terminal with the existing stored receipt, and verify a retry can complete. Verify no changes to the other country.
- **AC-US03-R04** — In both countries, verify rejection retains the draft and plan candidate, allows edit routes, and retries using the existing consent and fresh-terms rules.
