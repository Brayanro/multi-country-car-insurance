# ADR-001 — Country routing and published content

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-01-architecture-approval.md))  
**Applies to** US-01, with shared boundaries for US-02 and US-03  
**Basis** [US-01 Draft 3](../../spec/US-01.md), [specification approval](../approvals/US-01-spec-approval.md), assessment pp. 1–3 and 6–9

## Context

One Angular build serves Colombia and Chile. Editors publish independent country configuration in Strapi. The URL identifies the active country, including on reload and browser Back or Forward. The frontend needs published content and all customer and quote data stays in the browser.

## Proposed decision

- Use one client-rendered Angular application and one standalone Router tree. Serve the country selector at `/` and recognize `/:country/quote/details` for US-01. Reserve `plans` and `summary` children for the later steps. An explicit in-country entry route may link to Details. Unsupported country segments show the recoverable country-selection screen and retain the attempted URL. Accept exact uppercase `CO` and `CL` and replace the history entry with the lowercase canonical path for the same country. Other case variants remain unsupported. SPA navigation fallback applies to app paths, with API paths and asset requests kept separate.
- Decode the current Router parameter to `co | cl` before accessing content or quote state. React to parameter changes even when the Router reuses the component. Same-country wizard navigation can reuse its last valid, in-memory configuration. Initial load, page reload, country transition (including return to a previously visited country), and explicit retry require a new request. Clear ready status at refresh start. Cancel superseded reads and check both country and request generation before committing a response. A late or failed response leaves quote data intact and never renders as current. The URL carries the country and step only.
- Use a Strapi country enum, Draft & Publish, and one **Form Configuration collection document per country**, containing the complete field list as repeatable components. Each field inherits country from its owning form. This makes punctuation, copy, additions and removals, ordering, and option or validation edits one publishable snapshot. Editors use Content Manager for entries and may stage drafts without changing the live form. The serving controller reads published documents explicitly and treats multiple published form documents for one country as invalid rather than picking a winner. Seed by country without clobbering subsequent editorial changes. A stable editorial field key is distinct from Strapi's internal component IDs. [Strapi Document Service publication status](https://docs.strapi.io/cms/api/document-service/status)
- US-02 can use a separate Plan collection filtered by requested country, published status, and active flag, with stable plan identifiers, ordered plans, stored price/currency, coverages, benefits, and a recommended flag. US-03 can use a separate country Terms document with published text and a revision identifier. Their precise shapes, prices, and publication/acceptance rules belong to their future specifications. Changes to plans or terms need only their own publication.

## Public read boundary

The browser uses a same-origin `GET /api/quote-content/v1/:country/form` routed to Strapi through the static app host. Keep Strapi's ordinary Content API authorization enabled and grant the Public role the single custom `api::quote-content.quote-content.readForm` action. Enable neither generated CRUD routes for these content types nor public draft, preview, plugin, search, media, or admin actions. The frontend sends no authorization token. The static host proxies the dedicated read path only and returns no substitute SPA HTML for unmatched API paths. Admin access is a separate local binding and uses Strapi admin authentication for editorial access. [Strapi routing](https://docs.strapi.io/cms/backend-customization/routes), [Users & Permissions](https://docs.strapi.io/cms/features/users-permissions)

The controller takes the canonical country path parameter and no caller-controlled filters, locale, population, or publication selectors. It explicitly queries published data, populates only the known components, validates the whole content projection, and maps an allowlisted DTO. Success is `200` with `{ schemaVersion: 1, country, fields }` (see [ADR-002](ADR-002-dynamic-form-contract.md)). Public outcomes are `400 INVALID_REQUEST` for unsupported query inputs, `404 UNSUPPORTED_COUNTRY` for an unsupported API path code, `404 FORM_NOT_PUBLISHED` for no published document, `503 FORM_UNAVAILABLE` for configuration invalidity or duplicate documents, and `503 CONTENT_UNAVAILABLE` for CMS retrieval failure. A published document with no fields is invalid. Use a stable `{ error: { code } }` response without stack traces, internal IDs, or raw data. Use `Cache-Control: no-store` on these responses and bypass intermediary cache for this API path. The frontend still decodes success bodies and rejects country or version mismatches. Errors use local accessible fallback copy and retry. Future plan and terms routes require separate public actions after those stories' approvals.

## Alternatives and consequences

| Alternative | Trade-off |
| --- | --- |
| URL query, cookies, or geolocation | A query is shareable but easier to drop between steps. Device-derived defaults conflict with explicit URL country selection. |
| One frontend per market or per-locale builds | Independent releases could isolate releases, at the cost of duplicate deployment and violating the single-build requirement. |
| Strapi i18n as the country axis | Convenient for translations of shared records. Country controls eligibility, currency, and fields as well as language, so a country enum models the business boundary directly. |
| One Strapi record per field with public collection reads | Easier independent field editing, with more fragmented publication, larger permission surface, and more coupling to Strapi's REST shape. |
| An authenticated BFF with a server-side Strapi token | Supports private content at the cost of additional runtime and secret management. The proposed custom Strapi route already serves a narrow public projection. |

The custom route and decoder are deliberate maintenance costs. Editors can publish changes within the supported versioned vocabulary. New field primitives and incompatible contract changes are engineering changes. Confirm exact Public action registration and route permissions in the pinned Strapi version during implementation before exposing the route. Verify both canonical URLs after a hard reload, draft exclusion, rejection of cross-country responses and query overrides, denial of anonymous writes and generated reads, and published change pickup without rebuilding Angular. Trace to AC-US01-01, 05, 08, 09, 11 and 13 and T-US01-01, 06, 08, 09, 11 and 13.

[Angular route state](https://angular.dev/guide/routing/read-route-state), [Angular deep-link deployment](https://angular.dev/tools/cli/deployment)
