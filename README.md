# Multi-Country Car Insurance — Technical Assessment

One Angular 21 application serves the Colombia and Chile quote forms. Strapi 5 publishes the country-specific field configuration. US-01 covers details entry and a minimal next-step screen with a return path. Quote and vehicle values use fictitious data and stay in the browser.

## Run US-01

Use Docker with Compose and run the following command from the repository root.

```sh
docker compose up --build
```

Open [the country picker](http://localhost:8080). Both [Colombia](http://localhost:8080/co/quote/details) and [Chile](http://localhost:8080/cl/quote/details) support direct links. The first startup builds the app and publishes sample configurations for both countries into a Strapi SQLite volume. It generates Strapi secrets in that local volume. Restarts preserve later editorial changes.

The public wizard and both seeded configurations are available as soon as the stack is ready. An administrator account is optional for evaluating the wizard. To edit content, open [Strapi's loopback administration panel](http://localhost:1337/admin) and create the first local administrator using the registration form shown on a fresh volume. This is the local Strapi account and requires no Strapi Cloud account. Administrator credentials stay with the local Strapi instance. See the [Strapi first-run guide](https://docs.strapi.io/cms/quick-start).

In Content Manager, open **Quote form configuration**, edit fields within the existing form for the selected country, then publish the complete form. Reload the application or open the other country URL to fetch current content. Ordinary navigation within the same country's wizard reuses the ready configuration in memory.

## Configuration and data boundaries

- The public app uses one same-origin read route, `GET /api/quote-content/v1/:country/form`. Strapi's Public role receives only `api::quote-content.quote-content.readForm` for quoting content. Generated CRUD routes for this content type are absent. The static host proxies only this read path and excludes admin, preview, and unrelated API paths. The public frontend uses no API token.
- Never add duplicate field keys, option keys or semantic purposes. Field order is numeric, then stable field key on ties. Date of birth with the 18-year rule and vehicle year with its range rule are required for a usable form.
- Enter a rule argument or field default in the Strapi JSON editor as an object with a single `value` property, for example `{"value": 18}`, `{"value": false}` or `{"value": "2020-01-01"}`. Leave it empty for argument-free rules or fields with no default. Required selects start unselected and cannot have defaults. Present but invalid content leaves the whole form unavailable with a retry action.
- The version 1 decoder accepts up to 40 fields, 60 options per select, 12 rules per field and 240 UTF-16 units per content string. Text values allow up to 256 Unicode code points. Patterns are whole-value checks limited to 120 pattern units, literal characters, character classes and bounded counts through 24. The matcher uses a bounded set of offsets.
- Drafts are isolated by URL country and retained in the current tab's `sessionStorage`, with a memory fallback if storage is unavailable. Reload revalidates against fresh published configuration. Quote data is excluded from API payloads, shareable URLs, and server persistence. SQLite holds Strapi content and its administrative metadata.
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

For an optional local development workflow without Compose, first run `pnpm --filter @quote/contract build`. In the `backend/` directory, run `HOST=127.0.0.1 STRAPI_TELEMETRY_DISABLED=true node scripts/start.mjs develop`. In the `frontend/` directory, run `pnpm start --proxy-config proxy.conf.json`. The dev server uses the same public route at port 4200. Set `QUOTE_BASE_URL=http://127.0.0.1:4200` to target it with Playwright.

## Requirements and project evidence

- [US-01 specification](spec/US-01.md) defines the approved form behavior and acceptance-test identifiers.
- [Country strategy](docs/adr/ADR-001-multi-country-content.md), [dynamic contract](docs/adr/ADR-002-dynamic-form-contract.md), [frontend quote state](docs/adr/ADR-003-frontend-quote-state.md), and [wireframes](docs/design/US-01-wireframes.md) record the approved decisions.
- [Workflow](FLOW.md), [agent model policy](docs/agent-model-policy.md), and [session evidence guidance](logs/README.md) describe the agent and approval process.

## Requirements pending for project delivery

US-02 plan selection and US-03 quote summary, country terms, and simulated payment await their own approved increments. Project-level end-to-end verification through simulated payment remains pending until both exist. US-01 provides the approved details-to-next-step and return path for story-level verification.
