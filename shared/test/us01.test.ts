import assert from "node:assert/strict";
import { test } from "vitest";
import {
  decodeForm,
  matchesPattern,
  reconcileDraft,
  validateField,
} from "../src/index.ts";

const common = {
  label: "Dato",
  helpText: "",
  errorMessage: "Dato requerido",
  required: true,
};
const date = {
  ...common,
  id: "birth",
  kind: "date",
  purpose: "dateOfBirth",
  order: 10,
  rules: [{ operator: "minimumAge", argument: 18, message: "Mayor de edad" }],
};
const year = {
  ...common,
  id: "year",
  kind: "number",
  purpose: "vehicleYear",
  order: 20,
  rules: [{ operator: "vehicleYearRange", message: "Año fuera de rango" }],
};
const plate = {
  ...common,
  id: "plate",
  kind: "text",
  purpose: "licensePlate",
  order: 30,
  rules: [
    { operator: "minLength", argument: 4, message: "Muy corto" },
    { operator: "pattern", argument: "[A-Z]{2}[0-9]{2}", message: "Formato" },
  ],
};
const make = {
  ...common,
  id: "make",
  kind: "select",
  order: 40,
  rules: [],
  options: [{ id: "demo", label: "Ejemplo" }],
};
const clock = new Date(2026, 1, 28);
const envelope = (fields: unknown[]) => ({
  schemaVersion: 1,
  country: "co",
  fields,
});

test("US-01 T-US01-04/05/15: ordered validation evaluates age, local-year boundaries and priority", () => {
  const form = decodeForm(envelope([make, year, plate, date]), "co", clock);
  assert.ok(form);
  assert.deepEqual(
    form.fields.map(({ id }) => id),
    ["birth", "year", "plate", "make"],
  );
  const [birthField, yearField, plateField] = form.fields;
  assert.equal(
    validateField(birthField, "2008-02-29", clock)[0],
    "Mayor de edad",
  );
  assert.deepEqual(
    validateField(birthField, "2008-02-29", new Date(2026, 2, 1)),
    [],
  );
  assert.deepEqual(validateField(yearField, 2006, clock), []);
  assert.deepEqual(validateField(yearField, 2027, clock), []);
  assert.equal(validateField(yearField, 2005, clock)[0], "Año fuera de rango");
  assert.equal(validateField(yearField, 2028, clock)[0], "Año fuera de rango");
  assert.equal(
    validateField(yearField, 2027.5, clock)[0],
    "Año fuera de rango",
  );
  assert.equal(validateField(plateField, "  ", clock)[0], "Dato requerido");
  assert.deepEqual(validateField(plateField, "X", clock), [
    "Muy corto",
    "Formato",
  ]);
});

test("US-01 T-US01-08/16: reject malformed or incompatible form snapshots atomically", () => {
  const rejects = [
    envelope([]),
    envelope([date, year, { ...plate, id: "year" }]),
    envelope([date, year, { ...plate, kind: "number" }]),
    envelope([date, year, { ...make, options: [] }]),
    envelope([date, year, { ...make, defaultValue: "demo" }]),
    envelope([date, year, { ...plate, id: "__proto__" }]),
    { ...envelope([date, year]), country: "cl" },
  ];
  for (const input of rejects)
    assert.equal(decodeForm(input, "co", clock), null);
});

test("US-01 T-US01-14: reconcile stable values, remove old fields and obsolete options, apply defaults", () => {
  const form = decodeForm(
    envelope([
      date,
      year,
      {
        ...plate,
        label: "Nueva placa",
        rules: [{ operator: "minLength", argument: 4, message: "Muy corto" }],
      },
      make,
      {
        ...common,
        id: "new",
        kind: "checkbox",
        order: 50,
        rules: [],
        defaultValue: true,
      },
      { ...common, id: "changed", kind: "date", order: 60, rules: [] },
    ]),
    "co",
    clock,
  );
  assert.ok(form);
  const draft = reconcileDraft(form.fields, {
    plate: { kind: "text", value: "01" },
    make: { kind: "select", value: "obsolete" },
    gone: { kind: "text", value: "old" },
    changed: { kind: "text", value: "2001-01-01" },
  });
  assert.deepEqual(
    { ...draft },
    {
      plate: { kind: "text", value: "01" },
      new: { kind: "checkbox", value: true },
      changed: { kind: "date", value: "2001-01-01" },
    },
  );
  assert.equal(
    validateField(form.fields[2], draft["plate"].value, clock)[0],
    "Muy corto",
  );
});

test("US-01 T-US01-15: CMS patterns use bounded whole-value matching", () => {
  assert.equal(matchesPattern("[A-Z]{2}[0-9]{2}", "AB01"), true);
  assert.equal(matchesPattern("[A-Z]{2}[0-9]{2}", "AB01Z"), false);
  assert.equal(matchesPattern("a{1,2}a{1,2}b", "aaab"), true);
  for (const pattern of [
    "(a+)+",
    "a*",
    "a{1,}",
    "(?=a)",
    "[Z-A]",
    "a{30,31}",
    "a{2,1}",
  ]) {
    assert.equal(matchesPattern(pattern, "a"), false);
  }
});

test("US-01 T-US01-14: an explicitly cleared default stays unset after a refresh", () => {
  const form = decodeForm(
    envelope([
      date,
      year,
      {
        ...common,
        id: "description",
        kind: "text",
        order: 30,
        rules: [],
        defaultValue: "Ejemplo",
      },
    ]),
    "co",
    clock,
  );
  assert.ok(form);
  assert.equal(
    reconcileDraft(form.fields, { description: { kind: "text", value: null } })[
      "description"
    ]?.value,
    null,
  );
});
