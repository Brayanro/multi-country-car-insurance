---
name: story-to-spec
description: Convert US-01, US-02, or US-03 from the multi-country insurance technical assessment into a testable, source-grounded specification before implementation.
---

# Story to Specification

## Inputs
- Original assessment: `requirements/technical-assessment.pdf`.
- User-story identifier and source text.
- `AGENTS.md` and any applicable approved ADRs.

## Repeatable procedure
1. Extract source-stated story, business rules and acceptance scenarios with page references.
2. Build a requirement-to-observable-behavior-to-test traceability table.
3. Define proposed Strapi/Angular contracts and specify loading, empty, invalid and failure states.
4. Identify missing decisions. Label each as **Question** or **Proposal**, never as a verbatim source requirement.
5. Write verifiable Given/When/Then cases covering both countries when applicable.
6. Save to `spec/US-XX.md` with status **Pending human approval**.
7. Request a human decision. If rejected, document feedback and revise the spec, retaining the review record.

## Expected result
A reviewable, testable and traceable specification. No application implementation and no self-approval.
