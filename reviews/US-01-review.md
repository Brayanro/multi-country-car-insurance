# US-01 independent code review

**Recommendation** Changes requested. Five open Medium findings affect approved acceptance criteria or architecture. Final human approval remains a separate checkpoint.

## Scope and evidence

- **Reviewer** `/root/us01_reviewer`, `gpt-6.2-sol` / `medium`, as configured for the reviewer role. Review began on 2026-11-22, America/Bogota.
- **Reviewed working tree** US-01 implementation and tests on base `df7dde6`, including untracked application files. Used the project `code-review-and-quality` skill. The report is the only file edited by this reviewer.
- **Approved inputs** [Specification](../spec/US-01.md), [country routing and permissions](../docs/adr/ADR-001-multi-country-content.md), [dynamic form contract](../docs/adr/ADR-002-dynamic-form-contract.md), [wizard state](../docs/adr/ADR-003-frontend-quote-state.md), and [design system](../docs/design/US-01-design-system.md).
- **Reviewed boundaries** Angular routes, focus and live status, form and storage state, shared decoding, validation and reconciliation, Strapi projection and bootstrap permissions, loopback deployment and Compose startup, and the developer and QA tests.
- **Prerequisite evidence** The [QA report](../reports/qa/US-01-qa-report.md) records 11 passing unit and component tests, one isolated Strapi integration test, six Playwright cases, and a successful cache-disabled Angular production build. The orchestrator separately observed healthy fresh Compose startup and both countries' seeded data. Those checks were not repeated in this review.

## Blocking findings

### US01-R01 · Medium · Dynamic help and error IDs can collide with field control IDs

- **Locations and requirement** [details-form.ts](../frontend/src/app/details-form.ts#L73), [details-form.html](../frontend/src/app/details-form.html#L79), [ID contract](../shared/src/index.ts#L80). AC-US01-02, AC-US01-10, AC-US01-12 and ADR-002.
- **Evidence** The decoder accepts both `alpha` and `alpha-help` as distinct stable IDs. When `alpha` has help text, its paragraph and the `alpha-help` input both receive `quote-field-alpha-help`. In isolated Chrome against the local app with a browser-only valid configuration fixture, two elements used the ID and the second field label's `HTMLLabelElement.control` was `null`. The `-error` suffix can collide by the same mechanism.
- **Correction** Give inputs, help and errors independent DOM ID namespaces. Keep `for`, `aria-describedby` and first-invalid focus aligned with those IDs. Add a regression fixture with permitted suffix IDs, verify unique elements and actual label targets, and verify that help and errors describe their intended input.
- **Status** Open. No resolution or re-review yet.

### US01-R02 · Medium · Long CMS labels overflow the mobile layout

- **Locations and requirement** [styles.css](../frontend/src/styles.css#L114), [text boundary](../shared/src/index.ts#L92), [design reflow requirement](../docs/design/US-01-design-system.md#L72). AC-US01-10 and approved design.
- **Evidence** The form accepts labels up to 240 UTF-16 units. With one permitted 216-character unbroken label, the isolated Chrome fixture reported a 320 px viewport with 1700 px document scroll width and a 1680 px label width. The form grid has no mobile shrink rule for field items, and labels lack the wrapping rule used for help and error text.
- **Correction** Make the mobile field column and grid items shrink within the viewport and allow long label tokens to wrap. Verify a 320 px viewport with a valid long CMS label and confirm that the control and Continue action remain reachable without document-level horizontal scrolling.
- **Status** Open. No resolution or re-review yet.

### US01-R03 · Medium · The CMS server can reject a default that passes the user's local date rule

- **Locations and requirement** [form-projection.ts](../backend/src/api/quote-content/form-projection.ts#L61), [shared decoder](../shared/src/index.ts#L370), [form response](../backend/src/api/quote-content/controllers/quote-content.ts#L37), [browser decoder](../frontend/src/app/quote-state.ts#L112). AC-US01-03, AC-US01-04, AC-US01-08 and ADR-002's local civil calendar.
- **Evidence** The server projection uses the shared decoder's default server clock, including age and vehicle year checks on configured defaults. The browser decodes using its injected local clock after the API returns. A focused Node probe at the same instant, 2027-01-01T02:00:00Z, used a configuration with allowed vehicle year default 2006. The decoder rejected it in UTC, where the lower bound was 2007, and accepted it in `America/Bogota` and `America/Santiago`, where the lower bound was 2006. A UTC CMS can return `FORM_UNAVAILABLE` for this published form before the browser can evaluate its approved local rule.
- **Correction** Keep static configuration, type, and default validation at the CMS projection boundary. Evaluate rules that depend on the user's civil date at the browser boundary using the injected clock. Test that the server can project the same structural snapshot and that the browser accepts or rejects the default according to its local date.
- **Status** Open. No resolution or re-review yet.

### US01-R04 · Medium · Repeating a refresh repopulates a cleared existing field with its default

- **Locations and requirement** [reconcileDraft](../shared/src/index.ts#L481), [refresh and save](../frontend/src/app/quote-state.ts#L112), [approved reconciliation](../docs/adr/ADR-002-dynamic-form-contract.md#deterministic-reconciliation). AC-US01-14.
- **Evidence** Reconciliation omits an existing field's key when its restored value becomes incompatible. A later refresh cannot distinguish that cleared existing key from a newly added key and inserts its default. In a focused Node probe, a removed option on an existing optional select and a number-to-text change on another existing field both yielded an empty draft after the first refresh, then a populated draft containing both configured defaults after an identical second refresh. ADR-002 applies defaults to new IDs and clears incompatible values for existing IDs.
- **Correction** Preserve an explicit cleared value for a still-existing field ID after discarding an obsolete value, while omitting removed and replaced IDs and never retaining the discarded value. Add a second identical refresh regression test and retain unchanged default behavior for genuinely new fields.
- **Status** Open. No resolution or re-review yet.

### US01-R05 · Medium · The direct CMS binding retains anonymous plugin actions

- **Locations and requirement** [seed bootstrap](../backend/src/index.ts#L8), [plugin configuration](../backend/config/plugins.ts#L3), [loopback binding](../compose.yaml#L11), [web proxy](../deploy/quote.conf#L6), and [ADR-001 public read boundary](../docs/adr/ADR-001-multi-country-content.md#public-read-boundary).
- **Evidence** Application bootstrap adds `api::quote-content.quote-content.readForm` to the Public role and keeps the existing action set. The installed, locked Users & Permissions 5.63.0 source in `dist/server/services/users-permissions.mjs` seeds Public actions for registration, auth callbacks, password and email flows, and refresh. Its `dist/server/bootstrap/index.mjs` enables registration by default. Nginx shields unrelated endpoints on port 8080. The direct Strapi loopback binding still exposes the Content API, with the default Public grants still present. ADR-001 specifies a single custom Public action and no public plugin actions. This finding uses code inspection. No registration or write request was attempted.
- **Correction** Restrict anonymous CMS grants to the approved read action, including existing local volumes already initialized by the seed marker. Keep the separate Strapi administrator onboarding path intact. Verify the Public action set on a disposable CMS fixture and retain the existing proxy and published content tests. Respect any separate approval boundary for changing Strapi configuration or permission setup.
- **Status** Open. No resolution or re-review yet.

## Verification and remaining QA evidence

- **Targeted review probes** An isolated Playwright Chrome session loaded local US-01 and intercepted one fictitious CO configuration response. It confirmed the duplicate ID and mobile overflow. Standalone read-only Node probes against `shared/src/index.ts` confirmed the clock disagreement and reconciliation result after two identical refreshes. `git diff --check` was clean before writing this report. The complete suites were not rerun.
- **Acceptance evidence** The existing QA report records partial evidence for AC-US01-05, AC-US01-08, AC-US01-09, AC-US01-10, and AC-US01-14. Close those gaps with a disposable real-Strapi publication and recovery flow, a valid keyboard-only completion at desktop and mobile sizes, and targeted reconciliation assertions. Those gaps are distinct from the implementation findings above. The local default-cache Angular build failure has a successful `CI=1` workaround and Docker build evidence in the QA report.
- **Re-review plan** Have the developer address the findings within approved requirements. Verify the affected criteria independently and retain the original finding descriptions and evidence when appending the resolution and re-review outcomes.
