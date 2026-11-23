import { expect, test, type Page } from "@playwright/test";

type Scenario = {
  country: "co" | "cl";
  otherCountry: "co" | "cl";
  viewport: { width: number; height: number };
  vehicleLabel: "Placa" | "Patente";
  identityLabel: "Número de documento" | "RUT";
  currency: "COP" | "CLP";
  price: string;
  identitySuffix: string;
};

const scenarios: Scenario[] = [
  {
    country: "co",
    otherCountry: "cl",
    viewport: { width: 1280, height: 900 },
    vehicleLabel: "Placa",
    identityLabel: "Número de documento",
    currency: "COP",
    price: "129.900,50",
    identitySuffix: "8301",
  },
  {
    country: "cl",
    otherCountry: "co",
    viewport: { width: 320, height: 844 },
    vehicleLabel: "Patente",
    identityLabel: "RUT",
    currency: "CLP",
    price: "24.900",
    identitySuffix: "8302",
  },
];

function person(country: Scenario["country"], label: string) {
  return `QA Terminal ${country.toUpperCase()} ${label}`;
}

async function fillDetails(
  page: Page,
  scenario: Scenario,
  label: string,
  identitySuffix: string,
) {
  await expect(
    page.getByRole("heading", { name: "Datos para cotizar" }),
  ).toBeVisible();
  await page
    .getByLabel("Nombre del titular")
    .fill(person(scenario.country, label));
  if (scenario.country === "co") {
    await page
      .getByLabel("Tipo de documento")
      .selectOption({ label: "Cédula de ciudadanía" });
    await page.getByLabel("Placa").fill("QA-CO-03");
  } else {
    await page.getByLabel("Patente").fill("QA-CL-03");
  }
  await page
    .getByLabel(scenario.identityLabel)
    .fill(`FICTITIOUS-ID-${identitySuffix}`);
  await page.getByLabel("Fecha de nacimiento").fill("1990-02-10");
  await page.getByLabel("Año del vehículo").fill("2021");
  await page.getByLabel("Marca").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(new RegExp(`/${scenario.country}/quote/plans$`));
}

async function approveQuote(
  page: Page,
  scenario: Scenario,
  label: string,
  identitySuffix: string,
) {
  await fillDetails(page, scenario, label, identitySuffix);
  const plan = page.getByRole("radio", { name: "Esencial", exact: true });
  await expect(plan).toBeVisible();
  await plan.check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/${scenario.country}/quote/summary$`),
  );
  await page
    .getByRole("checkbox", { name: "Acepto los términos y condiciones" })
    .check();
  await page.getByRole("button", { name: "Pagar" }).click();
  await expect(
    page.getByRole("heading", { name: "Pago aprobado" }),
  ).toBeVisible();
  return readReceipt(page);
}

async function readReceipt(page: Page) {
  const reference = (
    await page.getByText(/^DEMO-[A-F0-9]{24}$/).textContent()
  )?.trim();
  if (!reference) throw new Error("Approved quote reference was not rendered");
  const review = page.locator('[aria-labelledby="receipt-review-heading"]');
  const plan = page.locator('[aria-labelledby="receipt-plan-heading"]');
  return {
    reference,
    review: await review.innerText(),
    plan: await plan.innerText(),
  };
}

async function expectTerminal(
  page: Page,
  scenario: Scenario,
  saved: Awaited<ReturnType<typeof readReceipt>>,
) {
  await expect(page).toHaveURL(
    new RegExp(`/${scenario.country}/quote/summary$`),
  );
  await expect(
    page.getByRole("heading", { name: "Pago aprobado" }),
  ).toBeFocused();
  await expect(page.getByText(saved.reference, { exact: true })).toBeVisible();
  const review = await page
    .locator('[aria-labelledby="receipt-review-heading"]')
    .innerText();
  const plan = await page
    .locator('[aria-labelledby="receipt-plan-heading"]')
    .innerText();
  expect(review.replace(/\s+/g, " ").trim()).toBe(
    saved.review.replace(/\s+/g, " ").trim(),
  );
  expect(plan.replace(/\s+/g, " ").trim()).toBe(
    saved.plan.replace(/\s+/g, " ").trim(),
  );
  await expect(page.locator("input, select, textarea")).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pagar" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Editar datos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Cambiar plan" })).toHaveCount(0);
}

for (const scenario of scenarios) {
  test(`T-US03-R01/R02: ${scenario.country.toUpperCase()} terminal route guard preserves captured approval`, async ({
    page,
  }) => {
    await page.setViewportSize(scenario.viewport);
    await page.goto(`/${scenario.country}/quote/details`);
    const saved = await approveQuote(
      page,
      scenario,
      "Original",
      scenario.identitySuffix,
    );

    const review = page.locator('[aria-labelledby="receipt-review-heading"]');
    const identity = (
      await review
        .locator("dd")
        .filter({ hasText: scenario.identitySuffix })
        .innerText()
    ).trim();
    expect(identity).toMatch(new RegExp(`^[•…-]*${scenario.identitySuffix}$`));
    expect(identity).not.toContain("FICTITIOUS");
    await expect(
      review.getByText(person(scenario.country, "Original"), { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[aria-labelledby="receipt-plan-heading"]'),
    ).toContainText(new RegExp(`${scenario.currency}.*${scenario.price}`));

    const blockedRequests: string[] = [];
    await page.route(
      `**/api/quote-content/v1/${scenario.country}/**`,
      async (route) => {
        blockedRequests.push(route.request().url());
        await route.fulfill({ status: 503, body: "unavailable" });
      },
    );
    await page.reload();
    await expectTerminal(page, scenario, saved);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(scenario.viewport.width);

    for (const step of ["details", "plans"] as const) {
      await page.goto(`/${scenario.country}/quote/${step}`);
      await expectTerminal(page, scenario, saved);
    }
    await page.goBack();
    await expectTerminal(page, scenario, saved);
    await page.goForward();
    await expectTerminal(page, scenario, saved);
    expect(blockedRequests).toEqual([]);

    await page.goto(`/${scenario.otherCountry}/quote/details`);
    await expect(
      page.getByRole("heading", { name: "Datos para cotizar" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre del titular")).toHaveValue("");
    await expect(page.getByText(saved.reference, { exact: true })).toHaveCount(
      0,
    );
    await page.goto(`/${scenario.country}/quote/details`);
    await expectTerminal(page, scenario, saved);
    expect(blockedRequests).toEqual([]);
  });

  test(`T-US03-R03: ${scenario.country.toUpperCase()} restart clears terminal quote and permits a new approval`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/${scenario.country}/quote/details`);
    const saved = await approveQuote(
      page,
      scenario,
      "Original",
      scenario.identitySuffix,
    );
    const restart = page.getByRole("button", {
      name: "Iniciar una nueva cotización",
    });

    await page.evaluate((country) => {
      const removeItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key: string) {
        if (key === `quote-receipt-v1:${country}`) {
          throw new DOMException(
            "Simulated receipt cleanup failure",
            "SecurityError",
          );
        }
        removeItem.call(this, key);
      };
    }, scenario.country);
    await restart.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toContainText(
      "No pudimos iniciar una nueva cotización",
    );
    await expect(restart).toBeFocused();
    await expect(
      page.getByText(saved.reference, { exact: true }),
    ).toBeVisible();

    await page.reload();
    await expectTerminal(page, scenario, saved);
    const retryRestart = page.getByRole("button", {
      name: "Iniciar una nueva cotización",
    });
    await retryRestart.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new RegExp(`/${scenario.country}/quote/details$`),
    );
    await expect(
      page.getByRole("heading", { name: "Datos para cotizar" }),
    ).toBeFocused();
    await expect(page.getByLabel("Nombre del titular")).toHaveValue("");
    await expect(page.getByLabel(scenario.identityLabel)).toHaveValue("");
    await expect(page.getByLabel(scenario.vehicleLabel)).toHaveValue("");
    await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("");
    await expect(page.getByLabel("Año del vehículo")).toHaveValue("");
    await expect(page.getByLabel("Marca").locator("option:checked")).toHaveText(
      "Selecciona una opción",
    );
    await expect(
      page.getByLabel("El auto tiene accesorios adicionales"),
    ).not.toBeChecked();
    if (scenario.country === "co") {
      await expect(
        page.getByLabel("Tipo de documento").locator("option:checked"),
      ).toHaveText("Selecciona una opción");
    }

    const storageAfterReset = await page.evaluate((country) => {
      const draft = sessionStorage.getItem(`quote-draft-v1:${country}`);
      return {
        receipt: sessionStorage.getItem(`quote-receipt-v1:${country}`),
        plan: sessionStorage.getItem(`quote-plan-v1:${country}`),
        draft: draft ? JSON.parse(draft) : null,
      };
    }, scenario.country);
    expect(storageAfterReset.receipt).toBeNull();
    expect(storageAfterReset.plan).toBeNull();
    expect(JSON.stringify(storageAfterReset.draft)).not.toContain(
      person(scenario.country, "Original"),
    );
    expect(JSON.stringify(storageAfterReset.draft)).not.toContain(
      `FICTITIOUS-ID-${scenario.identitySuffix}`,
    );

    await page.goto(`/${scenario.country}/quote/summary`);
    await expect(page).toHaveURL(
      new RegExp(`/${scenario.country}/quote/details$`),
    );
    await expect(page.getByLabel("Nombre del titular")).toHaveValue("");
    await expect(page.getByText(saved.reference, { exact: true })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(page.getByLabel("Nombre del titular")).toHaveValue("");
    await expect(page.getByText(saved.reference, { exact: true })).toHaveCount(
      0,
    );

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/${scenario.country}/quote/details$`),
    );
    await expect(page.getByText(saved.reference, { exact: true })).toHaveCount(
      0,
    );
    await page.goForward();
    await expect(page).toHaveURL(
      new RegExp(`/${scenario.country}/quote/details$`),
    );
    await expect(page.getByLabel("Nombre del titular")).toHaveValue("");

    await fillDetails(page, scenario, "New", "8401");
    const plan = page.getByRole("radio", { name: "Esencial", exact: true });
    await expect(plan).not.toBeChecked();
    await plan.check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/${scenario.country}/quote/summary$`),
    );
    const consent = page.getByRole("checkbox", {
      name: "Acepto los términos y condiciones",
    });
    await expect(consent).not.toBeChecked();
    await consent.check();
    await page.getByRole("button", { name: "Pagar" }).click();
    await expect(
      page.getByRole("heading", { name: "Pago aprobado" }),
    ).toBeVisible();
    const replacement = await readReceipt(page);
    expect(replacement.reference).not.toBe(saved.reference);
    await expect(
      page
        .locator('[aria-labelledby="receipt-review-heading"]')
        .getByText(person(scenario.country, "New"), { exact: true }),
    ).toBeVisible();
  });
}

test("T-US03-R01/R03: legacy reference-only receipt stays terminal and can restart", async ({
  page,
}) => {
  await page.goto("/");
  const reference = "DEMO-" + "A".repeat(24);
  await page.evaluate((number) => {
    sessionStorage.setItem(
      "quote-receipt-v1:co",
      JSON.stringify({ version: 1, country: "co", number }),
    );
  }, reference);
  await page.goto("/co/quote/details");
  await expect(page).toHaveURL(/\/co\/quote\/summary$/);
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
  await expect(
    page.getByText("El detalle de esta cotización no está disponible."),
  ).toBeVisible();
  await expect(page.locator("input, select, textarea")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Iniciar una nueva cotización" })
    .click();
  await expect(page).toHaveURL(/\/co\/quote\/details$/);
  await expect(page.getByLabel("Nombre del titular")).toHaveValue("");
  expect(
    await page.evaluate(() => sessionStorage.getItem("quote-receipt-v1:co")),
  ).toBeNull();
});
