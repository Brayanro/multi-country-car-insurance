# US-01 — Frontend structure assessment

**Status** Human approved ([authorization record](../approvals/US-01-correction-and-refactor-approval.md))

**Scope** Frontend file organization and test ownership after US-01 verification  
**Basis** [US-01 specification](../../spec/US-01.md), [approved technology stack](US-01-technology-stack.md), [ADR-001](../adr/ADR-001-multi-country-content.md), [ADR-002](../adr/ADR-002-dynamic-form-contract.md), and [ADR-003](../adr/ADR-003-frontend-quote-state.md)

## Recommendation

Group the existing Angular files into two feature areas, `country-selection` and `quote`, with the app shell and bootstrap files at their current locations. This is a lightweight application of Screaming Architecture. The names make the quote journey visible in the tree, while the current components, routes, store and providers retain their responsibilities. Add smaller subdivisions when implementation of a later step gives them a clear owner. The Angular guidance recommends arranging code by feature, keeping related templates and styles together, and colocating unit tests with the code under test. [Angular style guide](https://angular.dev/style-guide#project-structure)

The current flat `frontend/src/app/` is small and several filenames already convey intent. `details-form.ts` has a matching template, and `country-picker.ts`, `quote-page.ts`, `quote-state.ts`, and `wizard-progress.ts` already describe what they own. The concrete naming gap is `app.spec.ts`. Its router harness exercises quote-page navigation, published form ordering, invalid-submit focus, country request cancellation, and retry. It does not instantiate or test the app shell directly. [Current Angular suite](../../frontend/src/app/app.spec.ts)

## Proposed mapping

Paths in the first two columns are relative to `frontend/src/app/`. This is a file and import move proposal.

| Current | Proposed | Ownership |
| --- | --- | --- |
| `app.ts`, `app.html`, `app.config.ts`, `app.routes.ts` | Same | Bootstrap, shell, live announcement and entry routes. Update relative imports. |
| `country-picker.ts` | `country-selection/country-picker.ts` | Market selection and unsupported-country recovery. Keep its existing quote-store reset on picker entry. |
| `quote-page.ts`, `quote-state.ts`, `wizard-progress.ts` | `quote/` under the same basenames | Quote route orchestration, country-specific browser state and progress. Keep the store and clock provider at their existing injection scope. |
| `details-form.ts`, `details-form.html` | `quote/` under the same basenames | US-01 controls, validation feedback and submit. Move class and template together. |
| `app.spec.ts` | `quote/quote-page.spec.ts` | Move the two existing routed feature cases intact and adjust the routes import. Keep their traceability IDs. |

`frontend/src/main.ts`, global `styles.css`, public icons and their license stay in place. The route table remains in the app root with the existing path and component semantics. If future tests target the details form or quote store in isolation, `details-form.spec.ts` or `quote-state.spec.ts` belong in `quote/`. Use a subject-matching basename for Angular suites and behavioral case names within them, such as “retains a country draft when returning from the handoff.” The current case descriptions already name behaviors and include acceptance-test IDs. This proposal changes ownership naming without splitting cases or rewriting expected behavior. [Angular test naming](https://angular.dev/style-guide)

## Test and package boundaries

- Keep root `e2e/` for served-app Playwright tests. `playwright.config.ts` points to that directory. Existing `us01.spec.ts` and `us01-qa.spec.ts` identify story and evidence ownership, while their individual tests already describe behaviors. Retain the existing evidence paths during a frontend move. Name new browser suites by journey or behavior, for example `quote-country-flow.spec.ts`, with US and test IDs in the cases. [Playwright config](../../playwright.config.ts)
- `shared/` is a real workspace package, `@quote/contract`. Angular consumes its decoded configuration types, validation, and draft reconciliation. Strapi consumes the same country and form decoder at its controller and projection boundary. Keep framework-independent API and contract logic there while both consumers need it. Quote UI, transport, Signals and browser storage stay in Angular. Strapi mapping and persistence stay in Strapi. Preserve package exports and build order. [Contract entry point](../../shared/src/index.ts), [Strapi form projection](../../backend/src/api/quote-content/form-projection.ts), [Angular quote state](../../frontend/src/app/quote-state.ts)
- The contract tests already belong to the workspace package in `shared/test/`. Keep their current locations for this frontend change. A separate proposal to colocate them in `shared/src/` must account for `shared/tsconfig.json` compiling that directory into published build output. There is no need for a generic Angular `shared/` folder, domain package per step, barrel imports, or an extra state layer at this size. [Shared package config](../../shared/package.json), [Shared compiler config](../../shared/tsconfig.json)

## Alternatives and trade-offs

| Approach | Assessment |
| --- | --- |
| Keep the flat tree and rename the suite | Lowest immediate churn and sufficient for the current file count. The ownership split becomes less visible as US-02 and US-03 add screens. |
| Two feature areas as proposed | Makes the journey and test owner visible with one level of folders. Costs a small import migration. The picker and the quote page still use the current reset dependency, so the directories should not be treated as isolated libraries. |
| Strict feature slices and technical layers | Can help when independently owned modules warrant public interfaces. Here it adds empty folders, indirect imports and boundary work without a second application or team boundary. |

Moving files is compatible with the approved ADRs if route and URL behavior, anonymous content reads, contract DTOs, single-build startup, and country-isolated quote state retain their current semantics. The change requires explicit approval and should be scheduled apart from US-01 verification and closeout.

## Migration checks after approval

1. Capture current test discovery and result counts. Use the existing Angular CLI test builder and `frontend/tsconfig.spec.json` pattern for `src/**/*.spec.ts`. The moved suite remains under that glob and excluded from the application compilation by `tsconfig.app.json`. Check that both original cases still execute and preserve any QA references. [Angular test configuration](https://angular.dev/guide/testing), [Angular spec config](../../frontend/tsconfig.spec.json), [Angular app config](../../frontend/tsconfig.app.json)
2. Update direct relative imports for the shell, route table, picker, quote page and tests. Check that the moved form template resolves and the store, injectable clock, app-level live status and test doubles still share their existing DI tokens. Preserve selectors, the route table and the storage namespace. Run `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm build`. The build compiles `@quote/contract` before both consumers. Run `pnpm test:content` against the backend projection and permission boundary. [Workspace scripts](../../package.json)
3. Run `pnpm exec playwright test --list` and the existing Playwright suite against the served stack. Verify root and unsupported-country selection, CO and CL deep links, uppercase normalization, same-country handoff and Back, retry and canceled-response behavior, and the published-only form API. Recheck both countries’ published content and verify a published update appears after reload. Smoke the app header and picker icons and the packaged Tabler notice. Check that the built container still uses the existing static asset and API path rules. [Current routes](../../frontend/src/app/app.routes.ts), [Container build](../../Dockerfile)

This assessment used source inspection and official guidance. The migration checks describe future evidence for the proposed file moves. The assessment does not substitute for current QA or review.
