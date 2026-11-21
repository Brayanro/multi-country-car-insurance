# Multi-Country Car Insurance — Technical Assessment

An AI-assisted frontend technical assessment using Angular 21+ and Strapi 5+. This repository is currently at the **agent-workflow setup stage**; it does **not** contain a completed application yet.

## Working with the Codex desktop app (local project)
1. Extract this starter archive and open the **`multi-country-car-insurance`** folder as a **local project** in the Codex desktop app.
2. Verify that the project root contains `AGENTS.md`, `.codex/config.toml`, `.codex/agents/`, and `.agents/skills/`.
3. The technical assessment is included unmodified in `requirements/technical-assessment.pdf`.
4. Start a **new Codex chat in this project** so it reads the project instructions and config. Select a normal approval/permission mode where you can review requested changes.
5. Use the English smoke-test prompt in `docs/app-setup.md`. Inspect the actual subagent thread/activity in the app.
6. Review setup files using read-only Git inspection. Follow the authorization rules in `AGENTS.md` before staging or any other Git operation.
7. Capture real agent sessions, prompts, decisions, and results as evidence (see `logs/README.md`).

## Model policy
See `docs/agent-model-policy.md`. Each `.codex/agents/*.toml` file specifies its own model and reasoning effort. Availability depends on the account/client. **Do not silently swap models if one is unavailable.**

## Future implementation areas
- `frontend/`: Angular 21+ app (not created yet).
- `backend/`: Strapi 5+ backend with CO/CL seed data (not created yet).
- `spec/`: approved user-story specs (not created yet).
- `docs/adr/`: architectural decision records (not created yet).
- `reviews/`: real review findings and resolutions (not created yet).
- `logs/`: original session records (not created yet).

## Run the application
Not available at this stage. Final implementation must start with one documented command (for example, `docker compose up --build`) and seed data for both countries.

## Requirements not yet met
All application implementation, automated testing, final runtime setup, story-level QA and review reports, project-level verification, and completed QA evidence are pending. Track final exceptions and explain any unmet requirement here before submission. Story-level checks cover only the approved story scope. Project-level verification before final delivery additionally covers the complete quote flow, Colombia and Chile configuration, published Strapi changes without frontend deployment, security, keyboard access, responsive mobile and desktop layouts, seed data for both countries, one-command startup, and delivery documentation.
