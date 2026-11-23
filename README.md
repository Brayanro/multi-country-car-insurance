# Multi-Country Car Insurance — Technical Assessment

One Angular 21 application serves the Colombia and Chile quote wizard. Strapi 5 publishes each country's form configuration, plan catalog, and terms. The wizard covers details entry, plan selection, quote review, consent, and simulated payment. Quote and vehicle values use fictitious data and stay in the browser.

## Run the wizard

Use Docker with Compose and run the following command from the repository root.

```sh
docker compose up --build
```

Open [the country picker](http://localhost:8080). Both [Colombia](http://localhost:8080/co/quote/details) and [Chile](http://localhost:8080/cl/quote/details) support direct links. The first startup builds the app and publishes sample forms, plans, and terms for both countries into a Strapi SQLite volume. It generates Strapi secrets in that local volume. Restarts preserve later editorial changes.

The public wizard and the seeded forms, plans, and terms are available as soon as the stack is ready. An administrator account is optional for evaluating the wizard. To edit content, open [Strapi's loopback administration panel](http://localhost:1337/admin) and create the first local administrator using the registration form shown on a fresh volume. This is the local Strapi account and requires no Strapi Cloud account. Administrator credentials stay with the local Strapi instance. See the [Strapi first-run guide](https://docs.strapi.io/cms/quick-start).

In Content Manager, open **Quote form configuration**, edit fields within the existing form for the selected country, then publish the complete form. Reload the application or open the other country URL to fetch current content. Ordinary navigation within the same country's wizard reuses the ready configuration in memory.

In Content Manager, open **Quote plan** to edit a country's plans. Publish each plan and set it active to offer it. Enter base prices in major units with currency COP for Colombia (up to two fractional digits) or CLP for Chile (whole pesos). The published base price is the final price. Plans are read on entry to the plan step and checked again at the Summary handoff. The user must choose again if their plan was removed or repriced.

In Content Manager, open **Quote terms** and edit the existing Terms document for the country. Publish the document to make its multiline plain text available on Summary. Terms are checked again on Pay. If the published text has changed, the user must review and accept the updated terms before paying.

The demo-only outcome defaults to Approved. Select Rejected to test recovery, then select Approved and retry with the same quote. A successful simulation shows a quote number and masked read-only quote summary that survive reload in the same tab when browser storage is available. Older receipts keep the quote reference and remain terminal, with their previous review details withheld. Upgrading an older in-progress quote may require re-entering text or date fields whose previous purpose cannot be verified. To clear the completed quote and return to Details for the same country, choose **Iniciar una nueva cotización**.

### Synchronize an existing local sample plan catalog

New databases already receive all three plans for each country. For the default local Compose volume created with the original two-plan catalog, build the current CMS image and preview the changes.

```sh
docker compose -p multi-country-car-insurance build cms
sh scripts/sync-dev-plans.sh --dry-run
```

The preview reads a consistent SQLite backup with the development volume mounted read-only. Review the proposed changes and copy the reported fingerprint when the status is `ready`. If the status is `blocked`, review the listed records in Strapi. A `noop` means the catalog is current.

```sh
docker compose -p multi-country-car-insurance stop web cms
sh scripts/sync-dev-plans.sh --apply FINGERPRINT
docker compose -p multi-country-car-insurance up -d
```

Replace `FINGERPRINT` with the value from the preview. Apply requires the stopped development volume and saves a database backup in that volume before writing. It recomputes the preview and checks both the draft and published versions in one transaction. Only exact original fixtures receive expanded benefits, and they retain their document IDs. The sync introduces Integral only when both country catalogs match the original fixtures and both Integral documents are absent. Conflicting edits, duplicates, unexpected or missing versions, and prior removal of a tracked Integral stop the whole update. The local administrator account and other content stay in the original volume.

If the owner approves preserving an existing Colombia Ruta price, add `--preserve-co-ruta-price PRICE` to both preview and apply. Use COP major units with two decimal places and no grouping separators. For example, use `--preserve-co-ruta-price 179900.00` for COP 179.900,00. Both stored versions must already have exactly that price. The sync preserves it and still checks every other field against the fixtures.

## Configuration and data boundaries

- The public app uses same-origin GET paths under `/api/quote-content/v1/:country/` for `form`, `plans`, and `terms`. The Strapi Public role has only `readForm`, `readPlans`, and `readTerms` under `api::quote-content.quote-content`. The static host proxies these three reads. The public frontend uses no API token.
- Never add duplicate field keys, option keys or semantic purposes. Field order is numeric, then stable field key on ties. A usable country form requires date of birth with the 18-year rule, vehicle year with its range rule, and one required text field keyed `identity-document` with purpose `identityDocument`. Keep that key and purpose together when editing the label, order, help or validations. For a custom form with a different key for its document field, update that field to the reserved key and remove any redundant document-number field before publishing.
- Enter a rule argument or field default in the Strapi JSON editor as an object with a single `value` property, for example `{"value": 18}`, `{"value": false}` or `{"value": "2020-01-01"}`. Leave it empty for argument-free rules or fields with no default. Required selects start unselected and cannot have defaults. Present but invalid content leaves the whole form unavailable with a retry action.
- The version 1 decoder accepts up to 40 fields, 60 options per select, 12 rules per field and 240 UTF-16 units per content string. Text values allow up to 256 Unicode code points. Patterns are whole-value checks limited to 120 pattern units, literal characters, character classes and bounded counts through 24. The matcher uses a bounded set of offsets.
- Each country catalog may include up to 40 active published plans with up to 20 entries per coverage or benefit list. Plans sort by numeric order, then stable document ID. A malformed active published plan makes the country's catalog unavailable until the content is corrected.
- Each country has one published Terms document with a nonblank body of up to 20,000 UTF-16 code units. Missing, duplicate or invalid published terms block payment until recovered.
- Drafts and plan choices are isolated by URL country and retained in the current tab's `sessionStorage`, with a memory fallback if storage is unavailable. Reload revalidates against fresh published configuration. Quote data is excluded from API payloads, shareable URLs, and server persistence. SQLite holds Strapi content and its administrative metadata.
- Frontend SVGs are individual assets from Tabler Icons v3.41.1, tinted for the approved design. The Strapi favicon derives from the same shield. See the [MIT license](frontend/public/icons/TABLER-LICENSE.txt).

## Verify

Use Node 24 and the pinned pnpm 11 version in `package.json` for local tooling.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
pnpm test:content
```

The content test starts an isolated local Strapi fixture and verifies that published revisions are served while drafts stay private.

With the Compose app listening on port 8080, install Playwright's Chromium browser once and run browser tests.

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

For an optional local development workflow without Compose, first run `pnpm --filter @quote/contract build`. In the `backend/` directory, run `HOST=127.0.0.1 STRAPI_TELEMETRY_DISABLED=true node scripts/start.mjs develop`. In the `frontend/` directory, run `pnpm start --proxy-config proxy.conf.json`. The dev server uses the same public routes at port 4200. Set `QUOTE_BASE_URL=http://127.0.0.1:4200` to target it with Playwright.

## Requirements and project evidence

- [US-01 specification](spec/US-01.md), [US-02 specification](spec/US-02.md), and [US-03 specification](spec/US-03.md) define the approved behavior and acceptance-test identifiers. [ADR-004](docs/adr/ADR-004-plan-catalog-and-selection.md) and the [US-02 design](docs/design/US-02-plan-selection.md) cover the catalog and plan selection.
- [Country strategy](docs/adr/ADR-001-multi-country-content.md), [dynamic contract](docs/adr/ADR-002-dynamic-form-contract.md), [frontend quote state](docs/adr/ADR-003-frontend-quote-state.md), and [wireframes](docs/design/US-01-wireframes.md) record the approved decisions.
- [ADR-005](docs/adr/ADR-005-country-terms-and-simulated-payment.md) and the [US-03 design](docs/design/US-03-summary-and-payment.md) cover terms, consent, and simulated payment.
- [Workflow](FLOW.md), [agent model policy](docs/agent-model-policy.md), and [session evidence guidance](logs/README.md) describe the agent and approval process.
- The [US-02 QA report](reports/qa/US-02-qa-report.md) and [independent review](reviews/US-02-review.md) record the story verification results and remaining checks.
- The [US-03 QA report](reports/qa/US-03-qa-report.md) and [independent review](reviews/US-03-review.md) record verification of both complete country flows and the resolution of the US-02 handoff regression assertion.
- The [terminal quote final approval](docs/approvals/US-03-terminal-quote-final-approval.md) records human acceptance after manual verification.

## Requirements pending for project delivery

Native screen-reader and operating-system high-contrast verification remain open. Browser checks covered keyboard navigation, accessibility status text and mobile reflow. Original agent activity is preserved in Codex. A safe, unedited repository export remains pending.
