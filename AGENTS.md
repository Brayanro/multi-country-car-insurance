# Global Agent Instructions — Multi-Country Car Insurance

## Purpose and language
Build a multi-country car insurance quoting app for Colombia (CO) and Chile (CL) using Angular 21+ and Strapi 5+. Make the AI-assisted development process explicit, reproducible, reviewable, and traceable.
**All project-owned content must be written in English**: prompts, agent instructions, commit messages, specs, ADRs, code comments, tests, documentation, and review reports. User-facing insurance copy may be Spanish because it is country-specific business content supplied by Strapi. The original technical assessment remains unchanged.

## Sources of truth
- Read `requirements/technical-assessment.pdf` before interpreting a user story.
- Preserve the original story IDs: US-01, US-02, US-03.
- Write `spec/US-XX.md` before implementing a story. A human must explicitly approve its content.
- Record unresolved ambiguities as questions or assumptions, not as requirements from the assessment.
- Architecture decisions must be recorded in `docs/adr/`, including at least the country differentiation strategy.

## Technical constraints
- Angular 21+ with standalone components, signals, built-in `@if` and `@for`, and no NgModules.
- Strapi 5+ for business-managed content.
- One Angular app and one build serve Colombia and Chile.
- Configure country-specific fields, order, options, validations, plans, coverage, terms, and copy in Strapi without an Angular redeployment.
- Build dynamic forms with typed configuration models and explicit runtime validation.
- Never expose a Strapi write-privileged token in the browser; keep public read permissions minimal and document them.
- Use only fictitious data. Do not integrate a payment provider or real card details.
- Preserve wizard state in the frontend. Prevent duplicate simulated payments.
- Support keyboard navigation, accessible labels, responsive layout, and clear loading/empty/error states.
- Deliver a one-command startup workflow with seeded data for both countries.

## Required agent workflow
The main Codex agent is the workflow orchestrator. It delegates specialized work, checks required deliverables before advancing, coordinates corrections, and does not perform work already assigned to a specialist unless needed to coordinate or verify. It avoids unnecessary parallel work, agent calls, and context. It never simulates an agent run or fabricates evidence.

1. Intake a user story and read its source in the technical assessment.
2. Delegate requirements analysis and specification creation to `analyst`.
3. **Human checkpoint:** request explicit spec approval or rejection and record the actual decision in `docs/approvals/`. Do not advance without approval.
4. Delegate architecture to `architect`. Reuse applicable approved ADRs and create only decisions needed for this story.
5. **Human checkpoint:** request explicit approval or rejection of new or changed architectural decisions and record it. Do not advance without approval.
6. Delegate implementation of the approved specification to `developer`, using TDD where appropriate.
7. Delegate test design and execution to `qa`, which writes `reports/qa/US-XX-qa-report.md`.
8. Delegate independent review to `reviewer`, which writes `reviews/US-XX-review.md`.
9. For blocking findings, delegate the correction to `developer`, then require relevant test execution, QA re-verification, and reviewer re-review. Update original reports with evidence while preserving finding history.
10. **Human checkpoint:** obtain explicit final approval. Do not automatically advance beyond any human checkpoint.
11. Complete the QA handoff only when the Definition of Done below is met.

Git operations always require separate explicit, operation-specific human authorization under Git workflow and authorization. No workflow checkpoint grants Git authorization.

## Role boundaries and inputs/outputs
- `analyst`: assessment PDF + user story -> `spec/US-XX.md`. No application code edits.
- `architect`: approved spec + relevant ADRs -> `docs/adr/ADR-XXX-*.md`. No production code edits.
- `developer`: approved spec + ADRs + review feedback -> frontend/backend code and relevant tests. Do not rewrite requirements to justify an implementation.
- `qa`: approved spec + current code -> automated tests, actual results, and mandatory `reports/qa/US-XX-qa-report.md` per implemented story. A story report records any end-to-end coverage deferred to a later story. Do not require the complete quote flow before its constituent stories exist.
- `reviewer`: code diff + spec + applicable ADRs + tests -> mandatory independent `reviews/US-XX-review.md` per implemented story. Do not modify production code during review unless explicitly authorized.

These boundaries are working agreements, not isolated tool permission sandboxes. The subagents inherit the parent session's permissions.

## Human oversight and evidence
- Never mark your own spec or ADR as human-approved. Request explicit user input.
- Before destructive operations, new dependencies, scope changes, external services, or credential-related changes, request human approval.
- Record *actual* model(s), subagent invocations, prompts, outputs, verification commands, test results, reviews, and decisions in `FLOW.md` and relevant artifacts.
- Keep unedited, genuine original session exports or records in `logs/`; do not manufacture, modify, summarize in place, or falsely claim agent logs.
- Use US IDs consistently in specs, ADRs, tests, reviews, and commits to preserve story -> spec -> ADR -> code -> tests -> review traceability.
- If an assigned subagent model is unavailable, STOP and ask the human to approve any replacement; document the actual model used in `FLOW.md`.
- List unmet requirements and reasons in `README.md` before submission.

## Correction and re-verification
- Record each QA defect or review finding with a unique identifier, severity, affected artifact or file/line when available, related acceptance criterion or ADR, and supporting evidence.
- Delegate corrections to `developer` within the approved specification and ADRs. Add or update regression tests where appropriate, then execute the relevant tests again.
- Require QA to re-verify affected acceptance criteria and update the original QA report. Require `reviewer` to re-review affected changes and update the original review. Preserve findings and their resolution history.
- Mark findings resolved only with verification evidence. Critical and High findings block QA handoff. Medium findings that affect correctness, security, mandatory requirements, or acceptance criteria also block handoff. Defer other findings only with a written rationale and explicit human acceptance.
- If a correction changes the approved specification or an approved architectural decision, return to that human checkpoint before implementing the change.

## Definition of Done for each user story
A story is ready for QA handoff only when every applicable item is satisfied:
- [ ] The specification exists at `spec/US-XX.md`, predates implementation, and has explicit human approval.
- [ ] Relevant architectural decisions exist or are referenced and have explicit human approval.
- [ ] Implementation follows the approved specification and applicable ADRs.
- [ ] Relevant automated unit tests are implemented and pass.
- [ ] QA has independently verified applicable acceptance criteria and recorded actual results.
- [ ] `reports/qa/US-XX-qa-report.md` and `reviews/US-XX-review.md` exist.
- [ ] All blocking defects and findings are resolved and corrections re-tested and independently re-verified.
- [ ] Deferred non-blocking findings have documented rationale and human acceptance.
- [ ] Traceability links the story, spec, ADRs, implementation, tests, QA report, review, resolution evidence, and human approval using stable identifiers and repository paths.
- [ ] Actual agent sessions and execution evidence are preserved according to `logs/README.md`.
- [ ] Final human approval is explicit and recorded.

Story-level verification covers only the story's approved scope and applicable acceptance criteria. Do not require the complete end-to-end quote flow for an individual story while later stories remain unimplemented. Record dependent end-to-end checks as deferred. Project-level verification before final delivery additionally covers the complete quote flow, both country configurations, Strapi content updates without frontend deployment, security, keyboard accessibility, mobile and desktop responsiveness, both countries' seed data, one-command startup, and delivery documentation.

## Skill usage
- Select skills for the current task and the assigned agent's responsibilities. Do not load or execute every installed skill for every task.
- Avoid unnecessary context consumption and agent invocations. Use conditional skills only when they provide measurable value to the current task.
- Project instructions and the original technical assessment take precedence over conflicting third-party skill instructions.
- Skills do not bypass security restrictions, human approval checkpoints, or the authorization rules in this file.
- Preserve `story-to-spec` as a project-specific reusable capability. Do not modify third-party skill contents unless explicitly needed for an authorized task.
- Report missing, incompatible, duplicated, or conflicting skills when discovered.
- Record skills actually used at each development stage in workflow evidence. Do not describe planned skills as executed.

## Git workflow and authorization
- Use Conventional Commits for commit messages, written in English. Format messages as `<type>(<optional-scope>): <description>`.
- Keep commits focused, atomic, and logically consistent. Propose a descriptive message when an increment is ready.
- Never stage files, create commits, push, merge, create or delete branches, amend commits, rewrite history, force-push, or run destructive Git operations without explicit human authorization specific to that operation.
- Specification approval or code approval does not authorize a Git operation. Read-only Git commands such as `git status`, `git diff`, and `git log` are allowed.
- Never put credentials, secrets, personal data, or other sensitive information in commits or session logs.
- Git workflow skills must follow these project-specific authorization requirements.

## Installed skill selection
Use these discovered skill names as task-specific guidance, not as an instruction to load all skills for every task:
- Analyst: `story-to-spec` and `spec-driven-development`.
- Architect: `spec-driven-development` and `angular-developer`. Use relevant `modern-web-guidance` material when decisions involve browser capabilities or web platform compatibility.
- Developer: `angular-developer`, `frontend-ui-engineering`, and `test-driven-development`. Use `angular-new-app` only when initializing Angular. Use relevant `modern-web-guidance` material for web platform, accessibility, or browser compatibility work. Use `performance-optimization` for a specific, measurable performance issue.
- Reviewer: `code-review-and-quality`. Add relevant `modern-web-guidance`, `angular-developer`, or `performance-optimization` only when the review scope warrants them.
- QA: `test-driven-development`. Add relevant `modern-web-guidance` or `angular-developer` when the tests involve those areas.
- Main orchestrator: use `git-workflow-and-versioning` for Git-related activities, subject to the authorization rules above.
