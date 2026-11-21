# Codex Desktop App: Initial Setup and Smoke Test

## Setup
1. Extract the repository folder named `multi-country-car-insurance`.
2. Open the Codex desktop app, choose Codex, and open that folder as a **local** project (not a separate blank workspace).
3. Check the visible project files: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, `.agents/skills/story-to-spec/SKILL.md`.
4. Start a **new** chat in that project after copying the files, so project instructions and agent settings can be loaded.
5. Use a permission mode that lets you review proposed changes. Subagents inherit the parent chat's permissions.
6. Check the app's model picker. The main model is not forced by the repository; select the one available to you. Agent-specific model settings are in each custom role file.
7. Inspect the subagent activity/thread in the app to verify a real delegation occurred. A text response merely mentioning a role is not evidence of delegation.
8. Review changes in the app's Git diff. Follow `AGENTS.md` for explicit authorization before staging or performing any other Git operation.

## First prompt (paste into the Codex desktop app, in English)

> Inspect AGENTS.md, .codex/config.toml, all five .codex/agents/*.toml files, and .agents/skills/story-to-spec/SKILL.md. Do not implement code. Confirm which project instructions and custom subagents you can actually use, and state the actual model and reasoning effort for any invoked agent. Spawn the custom `analyst` subagent to inspect only the US-01 requirements in requirements/technical-assessment.pdf, using the story-to-spec skill where available. Return a gap analysis and draft acceptance-criteria outline, not a completed application. Do not approve a spec on my behalf. After the subagent finishes, give me the evidence I should inspect in the app and any model/configuration errors that occurred.

## What to verify
- The app opened the intended local project folder and actually read `AGENTS.md`.
- A real `analyst` subagent thread exists in the app's activity, not merely a simulated answer.
- The subagent has used the intended model if your account/client supports it; otherwise record the error and decide on a documented alternative.
- No Angular/Strapi source files were created during the smoke test.
- The output separates technical-assessment requirements from your proposed design decisions.

## Preserve evidence
See `logs/README.md`. Do not present setup templates, sample review tables or unexecuted actions as actual process evidence.
