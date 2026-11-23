import { expect, test, type Page } from "@playwright/test";

type Country = "co" | "cl";

const countries: Array<{
  country: Country;
  identityLabel: string;
}> = [
  { country: "co", identityLabel: "Número de documento" },
  { country: "cl", identityLabel: "RUT" },
];

const quoteNumber = "DEMO-" + "B".repeat(24);

async function fillQuoteDetails(
  page: Page,
  country: Country,
  rawDocument: string,
) {
  await page
    .locator("#quote-field-holder-name")
    .fill(`Ficticio QA ${country.toUpperCase()}`);
  if (country === "co") {
    await page
      .locator("#quote-field-document-type")
      .selectOption({ label: "Cédula de ciudadanía" });
  }
  await page.locator("#quote-field-identity-document").fill(rawDocument);
  await page.locator("#quote-field-birth-date").fill("1990-02-10");
  await page
    .locator("#quote-field-license-plate")
    .fill(`QA-${country.toUpperCase()}-09`);
  await page.locator("#quote-field-vehicle-year").fill("2021");
  await page.locator("#quote-field-vehicle-make").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(new RegExp(`/${country}/quote/plans$`));
}

async function openSelectedPlanSummary(page: Page, country: Country) {
  await page.getByRole("radio", { name: "Esencial", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(new RegExp(`/${country}/quote/summary$`));
  await expect(
    page.getByRole("heading", { name: "Términos y condiciones" }),
  ).toBeVisible();
}

async function approveQuote(page: Page) {
  await page
    .getByRole("checkbox", { name: "Acepto los términos y condiciones" })
    .check();
  await page.getByRole("button", { name: "Pagar" }).click();
  await expect(
    page.getByRole("heading", { name: "Pago aprobado" }),
  ).toBeVisible();
}

for (const { country, identityLabel } of countries) {
  test(`T-US03-M03/M04: ${country.toUpperCase()} keeps the configured identity field masked in Summary and receipt`, async ({
    page,
  }) => {
    const rawDocument = `FICTITIOUS-${country.toUpperCase()}-8301`;
    const revisedLabel = `Documento actualizado ${country.toUpperCase()}`;

    await page.route(
      `**/api/quote-content/v1/${country}/form`,
      async (route) => {
        const response = await route.fetch();
        const form = await response.json();
        const identity = form.fields.find(
          (field: { id: string }) => field.id === "identity-document",
        );
        identity.label = revisedLabel;
        identity.order = 1;
        await route.fulfill({ response, json: form });
      },
    );

    await page.goto(`/${country}/quote/details`);
    await expect(page.getByLabel(revisedLabel)).toBeVisible();
    await fillQuoteDetails(page, country, rawDocument);
    await openSelectedPlanSummary(page, country);

    const review = page.locator('[aria-labelledby="review-heading"]');
    const row = review.locator("dt", { hasText: revisedLabel }).locator("..");
    await expect(row.locator("dd")).toContainText("8301");
    await expect(row.locator("dd")).toContainText("•");
    await expect(page.locator("body")).not.toContainText(rawDocument);
    const labels = await review.locator("dt").allTextContents();
    expect(labels.map((label) => label.trim())[0]).toBe(revisedLabel);

    await approveQuote(page);
    const receiptText = await page.locator("body").innerText();
    expect(receiptText).not.toContain(rawDocument);
    const receipt = await page.evaluate((activeCountry) => {
      const stored = sessionStorage.getItem(
        `quote-receipt-v1:${activeCountry}`,
      );
      return stored ? { stored, value: JSON.parse(stored) } : null;
    }, country);
    expect(receipt?.value.version).toBe(3);
    const identityRow = receipt?.value.review.rows.find(
      (item: { id: string }) => item.id === "identity-document",
    );
    expect(identityRow.kind).toBe("masked-identity");
    expect(identityRow.label).toBe(revisedLabel);
    expect(identityRow.value).toContain("8301");
    expect(receipt?.stored).not.toContain(rawDocument);

    const reference = page.getByText(/^DEMO-[A-F0-9]{24}$/);
    const referenceText = (await reference.textContent())?.trim();
    await page.reload();
    await expect(page.getByText(referenceText!, { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(rawDocument);
    await expect(
      page.locator('[aria-labelledby="receipt-review-heading"]'),
    ).toContainText(revisedLabel);
  });

  for (const version of [1, 2] as const) {
    test(`T-US03-M04/M05: ${country.toUpperCase()} legacy v${version} receipt keeps its reference and never renders unverified review values`, async ({
      page,
    }) => {
      const rawDocument = `FICTITIOUS-LEGACY-${country.toUpperCase()}-9917`;
      await page.goto("/");
      await page.evaluate(
        ({ activeCountry, storedVersion, number, sensitiveValue }) => {
          const legacy = {
            version: storedVersion,
            country: activeCountry,
            number,
            ...(storedVersion === 2
              ? {
                  review: {
                    rows: [
                      {
                        id: "identity-document",
                        label: "Documento",
                        value: sensitiveValue,
                      },
                      {
                        id: "name",
                        label: "Titular",
                        value: "Titular de prueba",
                      },
                    ],
                    planName: "Plan de prueba",
                    price: {
                      amountMinor: 10000,
                      currency: activeCountry === "co" ? "COP" : "CLP",
                    },
                  },
                }
              : {}),
          };
          sessionStorage.setItem(
            `quote-receipt-v1:${activeCountry}`,
            JSON.stringify(legacy),
          );
        },
        {
          activeCountry: country,
          storedVersion: version,
          number: quoteNumber,
          sensitiveValue: rawDocument,
        },
      );

      await page.goto(`/${country}/quote/details`);
      await expect(page).toHaveURL(new RegExp(`/${country}/quote/summary$`));
      await expect(page.getByText(quoteNumber, { exact: true })).toBeVisible();
      await expect(
        page.getByText("El detalle de esta cotización no está disponible."),
      ).toBeVisible();
      await expect(
        page.getByText("Titular y vehículo", { exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("input, select, textarea")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Pagar" })).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText(rawDocument);
      await expect(page.locator("body")).not.toContainText("Titular de prueba");
      const accessibleText = await page.locator("body").ariaSnapshot();
      expect(accessibleText).not.toContain(rawDocument);

      await page.reload();
      await expect(page.getByText(quoteNumber, { exact: true })).toBeVisible();
      await expect(page.locator("body")).not.toContainText(rawDocument);
      await page.goto(`/${country}/quote/plans`);
      await expect(page).toHaveURL(new RegExp(`/${country}/quote/summary$`));
      await expect(page.getByText(quoteNumber, { exact: true })).toBeVisible();

      await page
        .getByRole("button", { name: "Iniciar una nueva cotización" })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${country}/quote/details$`));
      await expect(page.getByLabel("Nombre del titular")).toHaveValue("");
      await expect(page.locator("body")).not.toContainText(rawDocument);
      expect(
        await page.evaluate(
          (activeCountry) =>
            sessionStorage.getItem(`quote-receipt-v1:${activeCountry}`),
          country,
        ),
      ).toBeNull();
    });
  }

  test(`T-US03-M02/M05: ${country.toUpperCase()} invalid identity configuration preserves its legacy draft and retries safely`, async ({
    page,
  }) => {
    const rawDocument = `FICTITIOUS-DRAFT-${country.toUpperCase()}-4412`;
    const legacyValue = `FICTITIOUS-UNMARKED-${country.toUpperCase()}-5523`;
    const legacyDate = "1991-03-04";
    const draft = {
      "identity-document": { kind: "text", value: rawDocument },
      "birth-date": { kind: "date", value: "1990-02-10" },
      "vehicle-year": { kind: "number", value: 2021 },
      "license-plate": {
        kind: "text",
        value: `QA-${country.toUpperCase()}-10`,
      },
      "vehicle-make": { kind: "select", value: "mazda" },
      ...(country === "co"
        ? { "document-type": { kind: "select", value: "cc" } }
        : {}),
      "legacy-note": { kind: "text", value: legacyValue },
      "legacy-date": { kind: "date", value: legacyDate },
    };
    const stored = JSON.stringify({ version: 1, country, draft });
    let formRequests = 0;
    await page.addInitScript(
      ({ activeCountry, serialized }) =>
        sessionStorage.setItem(`quote-draft-v1:${activeCountry}`, serialized),
      { activeCountry: country, serialized: stored },
    );
    await page.route(
      `**/api/quote-content/v1/${country}/form`,
      async (route) => {
        const response = await route.fetch();
        const form = await response.json();
        if (formRequests++ === 0) {
          form.fields.find(
            (field: { id: string }) => field.id === "identity-document",
          ).purpose = undefined;
        } else {
          form.fields.push(
            {
              id: "legacy-note",
              label: "Nota anterior",
              helpText: "",
              errorMessage: "Revisa la nota.",
              kind: "text",
              order: 90,
              required: false,
              rules: [],
            },
            {
              id: "legacy-date",
              label: "Fecha anterior",
              helpText: "",
              errorMessage: "Revisa la fecha.",
              kind: "date",
              order: 91,
              required: false,
              rules: [],
            },
          );
        }
        await route.fulfill({ response, json: form });
      },
    );

    await page.goto(`/${country}/quote/details`);
    await expect(
      page.getByRole("heading", { name: "Formulario no disponible" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(rawDocument);
    await expect(page.locator("body")).not.toContainText(legacyValue);
    expect(
      await page.evaluate(
        (activeCountry) =>
          sessionStorage.getItem(`quote-draft-v1:${activeCountry}`),
        country,
      ),
    ).toBe(stored);
    await expect(page.getByRole("button", { name: "Pagar" })).toHaveCount(0);

    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByLabel(identityLabel)).toHaveValue(rawDocument);
    const migrated = await page.evaluate((activeCountry) => {
      const saved = sessionStorage.getItem(`quote-draft-v1:${activeCountry}`);
      return saved ? JSON.parse(saved) : null;
    }, country);
    expect(migrated.version).toBe(2);
    expect(migrated.draft["identity-document"].value).toBe(rawDocument);
    expect(migrated.draft["legacy-note"].value).toBeNull();
    expect(migrated.draft["legacy-date"].value).toBeNull();
    await expect(page.getByLabel("Nota anterior")).toHaveValue("");
    await expect(page.getByLabel("Fecha anterior")).toHaveValue("");
  });
}
