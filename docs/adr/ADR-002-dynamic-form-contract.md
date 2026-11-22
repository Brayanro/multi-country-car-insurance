# ADR-002 — Typed dynamic form contract and reconciliation

**Status** Human approved on 2026-11-22 ([approval record](../approvals/US-01-architecture-approval.md))  
**Applies to** US-01, with stable fields and roles for US-02 and US-03  
**Basis** [US-01 Draft 3](../../spec/US-01.md), especially AC-US01-02–04, 07–10 and 12–16, and [ADR-001](ADR-001-multi-country-content.md)

## Context

Strapi editors need to change field content and validation without rebuilding Angular. The application must reject a bad configuration atomically, preserve a compatible draft across changes, and display one configured error per field. A dynamic CMS key cannot provide static knowledge of its eventual widget or value type.

## Proposed decision

### Contract and failure behavior

Decode `unknown` once at each trust boundary using framework-independent TypeScript guards that produce a discriminated `FieldDefinition` union. A small shared workspace contract can supply the decoder, pure validation and fixtures to Strapi's projection and Angular's consumer. It carries no Angular or Strapi dependency and no customer data. Keep Strapi's nested editor representation behind its explicit projection. Contract version 1 is a fixed envelope with an exact version, the requested canonical country, and a nonempty fields array. Render content strings as text, including labels, help and errors. Each field has the following projected properties.

| Property | Version 1 proposal |
| --- | --- |
| `id`, `label`, `helpText`, `errorMessage` | Stable editor-maintained ID unique within the country form, Spanish label and fallback field error, and a required help-text property that permits an empty string. IDs are restricted opaque strings, protected from reserved object keys and independent of labels, order, and Strapi component IDs. |
| `kind`, `required`, `order` | One supported kind, a Boolean required flag, and a nonnegative safe-integer order. Sort by order, then by ID on a tie. Country is inherited from the form. |
| `rules` | Ordered array, possibly empty. Each rule specifies a recognized operator, its typed arguments when relevant, and its configured Spanish message. Order is the editor's array order. |
| `options`, `defaultValue` | Options are permitted only on selects and require stable unique option IDs and nonempty labels within each select. An omitted default means unset. A present default must meet the field's representation, available options, and configured rules. Fresh required selects start unset, so publishing a default for one is invalid. |
| `purpose` | Optional semantic marker, unique per reserved role. A usable form contains one required `dateOfBirth` date with `minimumAge` 18 and one required `vehicleYear` number with `vehicleYearRange`. `identityDocument` and `licensePlate` markers, when present, use text fields. This enables masking and pricing without relying on visible labels. |

Reject missing mandatory properties, missing published fields, date or number representation errors in rule arguments, incompatible defaults, unknown types or operators, duplicate IDs, and required selects with no valid options. Validate each option. An invalid option definition fails the snapshot. Allow an optional select to have no options and remain unset. Reject inverted range endpoints and a duplicate required rule. A rejected refresh never partially updates the view or the stored draft. Apply the error and retry behavior in ADR-001. Enforce size limits on fields, options, and text at the contract boundary. Choose exact limits during implementation against fixtures and document them.

### Type and rule compatibility

| Kinds and values | Supported operators |
| --- | --- |
| Text, a string, including document numbers and plates | `required`, `minLength`, `maxLength`, `pattern`, `email` |
| Number, a finite JavaScript number | `required`, `min`, `max`, `vehicleYearRange` for the vehicle-year purpose |
| Select, a listed stable option ID string | `required` |
| Date, a valid Gregorian ISO calendar-date string `YYYY-MM-DD` | `required`, `minDate`, `maxDate`, `minimumAge` for the date-of-birth purpose |
| Checkbox, a Boolean | `required`, which requires explicit `true` for a required checkbox |

- Keep a single required check. The field flag controls requiredness. An optional explicit `required` rule is valid only when the flag is true and supplies the required message. A required flag without the rule uses the field's configured error message. Required checks distinguish missing values from numeric zero. Whitespace-only text is empty for the required check and stored document or plate strings retain leading zeros. Non-required rules treat an unset value as inapplicable. An invalid typed entry is distinct from an unset value. Apply validators to every field and retain the ordered outcomes. The required error wins when present, then the first failing configured rule, then the field fallback for an invalid representation no configured rule describes.
- Length and age arguments are nonnegative integers, and lengths count Unicode code points. Numeric bounds are finite and inclusive. Vehicle year requires a safe integer and uses local browser Gregorian year Y with inclusive Y−20 through Y+1. Date bounds are valid ISO dates and inclusive. Calculate age using Gregorian calendar components and the browser's local civil date via an injectable clock, avoiding UTC parsing shifts. Propose March 1 for a February 29 birthday in non-leap years in the simulator. `required`, `email`, and `vehicleYearRange` take no argument.
- Treat patterns as declarative whole-value checks in a bounded safe subset. Propose bounded character classes, literal segments, and bounded repetitions, with no backreferences, lookaround, groups, or unbounded repetition. Cap both pattern and input lengths. Use a bounded non-backtracking matcher for the subset or equivalent implementation whose cost is bounded on rejected input. Validate editor patterns before the config reaches ready state. This makes formatting changes publishable while keeping pattern matching predictable.

### Angular form and accessibility

Use Typed Reactive Forms with `FormRecord<FormControl<FieldValue | null>>` and a discriminated field/view model. Keys are dynamic and the control's static value type is the common union. Narrow by the decoded field kind and normalize at the control adapter and output boundaries. Use actual typed number and Boolean values, preserve meaningful empty or unset state, and track rendered elements by stable ID. Stay with native inputs and selects and an unset, non-selectable required-select placeholder. The first invalid field gets focus on an unsuccessful Continue. Keep Continue available after the configuration is ready, with application validation controlling progress and custom messages. Use native form semantics with an explicit Angular submit handler and no browser validation bubbles masking configured messages. On blur expose that field's message, on change reevaluate touched fields, and on submit expose all applicable errors. Associate visible errors and help through stable DOM IDs and `aria-describedby`, and set `aria-invalid` when showing an error. Use concise status announcements for loading and retry, and avoid announcing the same validation error twice when moving focus. [Angular typed forms](https://angular.dev/guide/forms/typed-forms)

### Deterministic reconciliation

Rebuild the draft from the latest valid fields by ID instead of mutating the old key map in place. Omit removed or replaced IDs and obsolete select options entirely. For new IDs apply a valid allowed default or leave unset. For existing IDs preserve representable values and keep label, help, and order edits independent, even if updated business rules make a preserved value invalid. This lets users correct a value after a stricter constraint is published. Check the previous kind as well as the primitive value. Preserve a date as text, or text as a date only when it is already a valid ISO date. Clear other kind changes without implicit coercion. Select values require membership in the new option IDs and never migrate by label. Revalidate every field against the current clock and refreshed rules, write the clean snapshot atomically, and gate progression on the result. A restored valid required select stays selected. A fresh one, or one with an obsolete selection, shows its placeholder.

## Alternatives and consequences

| Alternative | Trade-off |
| --- | --- |
| Hardcoded Angular fields or a FormGroup with fixed keys | Strong static key typing, with a code change for each CMS field change. |
| Untyped forms or a general JSON Schema rendering engine | Simpler generalization, with weaker app-level typing or an extra dependency and a harder-to-explain CMS contract. |
| Signal Forms | Fits a signal-first model and is stable in Angular 22. The proposed Angular 21 baseline and requested form preference favor Typed Reactive Forms. Signals still own non-control state. |
| Directly execute CMS regexes or arbitrary editor rules | Broader flexibility, with less predictable runtime cost and harder validation of whole snapshots. |

The proposal makes unsupported widgets and rule language changes schema work. It protects the required age and year invariants while permitting published changes to supported field content. The type matrix, safe pattern subset, date boundary convention, and required-select default restriction are proposed architecture decisions. Verify DTO acceptance and rejection in both consumers, age and year boundaries, required-first and rule order, data reconciliation, stale response rejection, keyboard focus, and the two required-select states. See T-US01-02–06, 08–10, 12 and 14–16. The final quote-summary view remains under US-03.
