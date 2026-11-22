import { describe, expect, it } from "vitest";
import { decodeForm, validateField } from "../src/index.ts";

const validationDate = new Date(2026, 5, 15, 12);

const field = (
  id: string,
  kind: string,
  order: number,
  extra: Record<string, unknown> = {},
) => ({
  id,
  label: id,
  helpText: "",
  errorMessage: `${id} fallback`,
  kind,
  order,
  required: false,
  rules: [],
  ...extra,
});

const requiredCore = [
  field("birth-date", "date", 10, {
    required: true,
    purpose: "dateOfBirth",
    rules: [
      { operator: "minimumAge", argument: 18, message: "Must be an adult" },
    ],
  }),
  field("vehicle-year", "number", 20, {
    required: true,
    purpose: "vehicleYear",
    rules: [{ operator: "vehicleYearRange", message: "Year is out of range" }],
  }),
];

function decode(extra: unknown[], now = validationDate) {
  return decodeForm(
    { schemaVersion: 1, country: "co", fields: [...requiredCore, ...extra] },
    "co",
    now,
  );
}

describe("US-01 acceptance-level validation", () => {
  it("T-US01-15 applies each compatible configured validation operator", () => {
    const form = decode([
      field("min-length", "text", 30, {
        rules: [{ operator: "minLength", argument: 3, message: "Too short" }],
      }),
      field("max-length", "text", 40, {
        rules: [{ operator: "maxLength", argument: 3, message: "Too long" }],
      }),
      field("pattern", "text", 50, {
        rules: [
          {
            operator: "pattern",
            argument: "[A-Z]{2}[0-9]{2}",
            message: "Bad format",
          },
        ],
      }),
      field("email", "text", 60, {
        rules: [{ operator: "email", message: "Bad email" }],
      }),
      field("minimum", "number", 70, {
        rules: [{ operator: "min", argument: 0, message: "Too small" }],
      }),
      field("maximum", "number", 80, {
        rules: [{ operator: "max", argument: 10, message: "Too large" }],
      }),
      field("earliest-date", "date", 90, {
        rules: [
          { operator: "minDate", argument: "2026-01-01", message: "Too early" },
        ],
      }),
      field("latest-date", "date", 100, {
        rules: [
          { operator: "maxDate", argument: "2026-12-31", message: "Too late" },
        ],
      }),
    ]);

    expect(form).not.toBeNull();
    const byId = new Map(form!.fields.map((item) => [item.id, item]));
    const result = (id: string, value: unknown) =>
      validateField(byId.get(id)!, value, validationDate);

    expect(result("min-length", "ab")).toEqual(["Too short"]);
    expect(result("min-length", "😀😀😀")).toEqual([]);
    expect(result("max-length", "abcd")).toEqual(["Too long"]);
    expect(result("pattern", "AB01")).toEqual([]);
    expect(result("pattern", "ab01")).toEqual(["Bad format"]);
    expect(result("email", "qa@example.test")).toEqual([]);
    expect(result("email", "not-an-email")).toEqual(["Bad email"]);
    expect(result("minimum", 0)).toEqual([]);
    expect(result("minimum", -0.01)).toEqual(["Too small"]);
    expect(result("maximum", 10)).toEqual([]);
    expect(result("maximum", 10.01)).toEqual(["Too large"]);
    expect(result("earliest-date", "2026-01-01")).toEqual([]);
    expect(result("earliest-date", "2025-12-31")).toEqual(["Too early"]);
    expect(result("latest-date", "2026-12-31")).toEqual([]);
    expect(result("latest-date", "2027-01-01")).toEqual(["Too late"]);
  });

  it("T-US01-03 prioritizes required copy and preserves configured rule order", () => {
    const form = decode([
      field("required-name", "text", 30, {
        required: true,
        rules: [
          { operator: "minLength", argument: 3, message: "Too short" },
          { operator: "required", message: "Required first" },
        ],
      }),
      field("rules-in-order", "text", 40, {
        rules: [
          { operator: "minLength", argument: 4, message: "First failure" },
          {
            operator: "pattern",
            argument: "[A-Z]{3}",
            message: "Second failure",
          },
        ],
      }),
    ]);

    expect(form).not.toBeNull();
    const byId = new Map(form!.fields.map((item) => [item.id, item]));
    expect(
      validateField(byId.get("required-name")!, null, validationDate),
    ).toEqual(["Required first"]);
    const failures = validateField(
      byId.get("rules-in-order")!,
      "abc",
      validationDate,
    );
    expect(failures).toEqual(["First failure", "Second failure"]);
    expect(failures[0]).toBe("First failure");
  });

  it("T-US01-04/05 uses local calendar boundaries for age and vehicle year", () => {
    const form = decode([], validationDate);
    expect(form).not.toBeNull();
    const dateOfBirth = form!.fields.find(({ id }) => id === "birth-date")!;
    const vehicleYear = form!.fields.find(({ id }) => id === "vehicle-year")!;

    expect(validateField(dateOfBirth, "2008-06-16", validationDate)).toEqual([
      "Must be an adult",
    ]);
    expect(validateField(dateOfBirth, "2008-06-15", validationDate)).toEqual(
      [],
    );
    expect(
      validateField(dateOfBirth, "2008-02-29", new Date(2026, 1, 28, 12)),
    ).toEqual(["Must be an adult"]);
    expect(
      validateField(dateOfBirth, "2008-02-29", new Date(2026, 2, 1, 12)),
    ).toEqual([]);

    expect(validateField(vehicleYear, 2006, validationDate)).toEqual([]);
    expect(validateField(vehicleYear, 2027, validationDate)).toEqual([]);
    expect(validateField(vehicleYear, 2005, validationDate)).toEqual([
      "Year is out of range",
    ]);
    expect(validateField(vehicleYear, 2028, validationDate)).toEqual([
      "Year is out of range",
    ]);
    expect(validateField(vehicleYear, 2006, new Date(2027, 0, 1, 12))).toEqual([
      "Year is out of range",
    ]);
  });

  it("T-US01-02/16 keeps a required select unset and rejects a required select with no options", () => {
    const select = field("vehicle-make", "select", 30, {
      required: true,
      options: [{ id: "demo-motor", label: "Demo Motor" }],
      rules: [],
    });
    const form = decode([select]);

    expect(form).not.toBeNull();
    const make = form!.fields.find(({ id }) => id === "vehicle-make")!;
    expect(make.kind).toBe("select");
    expect(make.kind === "select" && make.defaultValue).toBeUndefined();
    expect(validateField(make, null, validationDate)).toEqual([
      "vehicle-make fallback",
    ]);
    expect(
      decode([
        field("vehicle-make", "select", 30, { required: true, options: [] }),
      ]),
    ).toBeNull();
  });
});
