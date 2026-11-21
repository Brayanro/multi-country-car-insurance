# Agent Model Selection Policy

## Planned assignments — ChatGPT Plus

| Agent | Model ID | Reasoning effort | Rationale |
| --- | --- | --- | --- |
| `analyst` | `gpt-6-luna` | `xhigh` (Extra High) | Carefully extract and organize acceptance criteria and unresolved requirements from the assessment source; human verifies completeness. |
| `architect` | `gpt-6.2-sol` | `high` | Evaluate multi-country architecture, API contracts, security and realistic trade-offs. |
| `developer` | `gpt-6.2-sol` | `medium` | Implement focused Angular and Strapi changes while keeping routine work efficient. |
| `reviewer` | `gpt-6.2-sol` | `medium` | Review bounded diffs for defects, security, accessibility and traceability; escalate difficult reviews if necessary. |
| `qa` | `gpt-6-luna` | `xhigh` (Extra High) | Derive extensive acceptance-driven test cases and failure scenarios; confirm executable tests really run. |

## Decision record

- **Date:** 2026-11-21.
- **Decision maker:** Project owner.
- **Reason:** Optimize the included Codex usage on a ChatGPT Plus plan while retaining higher effort for requirements analysis and test-case reasoning.
- **Previous policy:** Analyst Sol/medium; Architect Astra/high; Developer Sol/medium; Reviewer Astra/high; QA Sol/high.
- **Trade-off:** Luna is efficient for focused extraction and structured tasks but may be less reliable at complex implementation or debugging; keep human approval, real automated tests, and explicit escalation when analysis or QA execution exceeds the role's strengths. Reviewer medium is suitable for scoped diffs, but security-critical reviews may need additional human scrutiny or a separately approved higher-effort pass.

## Operational notes

- Model assignment is in `.codex/agents/*.toml`. Codex reads `model` and `model_reasoning_effort` from each custom role, subject to actual model availability in the current account/client and effective runtime behavior.
- `xhigh` is the configuration spelling of **Extra High**. Do not write `extra high` in a TOML value.
- The main orchestrator model remains selected in the Codex desktop app; this policy does not override it.
- More reasoning effort usually increases token usage. A lower-cost model at `xhigh` is not automatically the least expensive choice for every task. Prefer short, scoped delegations and inspect the Codex usage dashboard.
- Avoid spawning several agents unnecessarily. Invoke a role only when its responsibility is needed, and follow the workflow order required by `AGENTS.md`.
- Use focused prompts and only the context required for each task to manage usage on the project's ChatGPT Plus subscription. Do not claim a specific allowance or usage outcome without checking current account information.
- The settings reflect the **requested configuration**, not proof of which model actually ran. Inspect real Codex app subagent activity and any configuration errors. Never claim a model executed without evidence.
- If a requested model or effort level is unavailable: stop and request human authorization for a fallback; update the role TOML and note requested versus actual model/effort in `FLOW.md` with date and reason.
- All deliverables, prompts, agent instructions, reviews, and evidence descriptions in the repository must be in English.
- Record actual human approvals and genuine session logs. Never fabricate usage metrics, test results, reviews or agent activity.

## Official documentation checked (2026-11-21)

- Custom agents and model overrides: https://learn.chatgpt.com/docs/agent-configuration/subagents
- Model identifiers and effort guidance: https://learn.chatgpt.com/docs/models
- Codex plan allowance and usage estimates: https://learn.chatgpt.com/docs/pricing
