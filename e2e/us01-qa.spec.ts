import { expect, test } from "@playwright/test";

test("US-01 T-US01-02/07/10/16: progressive validation and responsive accessible form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/co/quote/details");

  const heading = page.getByRole("heading", { name: "Datos para cotizar" });
  const form = page.locator("form.details");
  await expect(form).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.locator("header.site-header")).toHaveText("Seguro de auto");
  await expect(page.locator("header.site-header")).not.toContainText(
    /Colombia|Chile|cambiar país/i,
  );

  const layout = await page.evaluate(() => {
    const main = document.querySelector("main.wizard")!.getBoundingClientRect();
    const progress = document
      .querySelector(".wizard-progress")!
      .getBoundingClientRect();
    const title = document.querySelector(".step-heading h1")!;
    const action = document.querySelector<HTMLButtonElement>(
      ".form-actions button",
    )!;
    return {
      mainCenter: main.left + main.width / 2,
      progressCenter: progress.left + progress.width / 2,
      titleAlign: getComputedStyle(title).textAlign,
      actionColor: getComputedStyle(action).backgroundColor,
      fieldLabels: Array.from(document.querySelectorAll("form label")).map(
        (label) => {
          const id = label.getAttribute("for");
          return Boolean(id && document.getElementById(id));
        },
      ),
      invalidCount: document.querySelectorAll("form .field-error").length,
    };
  });
  expect(layout.mainCenter).toBe(720);
  expect(layout.progressCenter).toBe(720);
  expect(layout.titleAlign).toBe("center");
  expect(layout.actionColor).toBe("rgb(46, 109, 246)");
  expect(layout.fieldLabels.every(Boolean)).toBe(true);
  expect(layout.invalidCount).toBe(0);
  await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();

  const make = page.getByLabel("Marca");
  expect(
    await make.evaluate((select: HTMLSelectElement) => ({
      selectedIndex: select.selectedIndex,
      firstOptionDisabled: select.options[0].disabled,
    })),
  ).toEqual({ selectedIndex: 0, firstOptionDisabled: true });

  for (let index = 0; index < 16; index++) {
    if (await make.evaluate((select) => select === document.activeElement))
      break;
    await page.keyboard.press("Tab");
  }
  await expect(make).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByText("Selecciona una marca.")).toBeVisible();
  await expect(make).toHaveAttribute("aria-invalid", "true");
  const descriptionAssociation = await make.evaluate((element) => {
    const describedIds =
      element.getAttribute("aria-describedby")?.split(/\s+/).filter(Boolean) ??
      [];
    const field = element.closest(".field");
    const error = field?.querySelector(".field-error");
    return {
      errorIsAssociated: Boolean(error?.id && describedIds.includes(error.id)),
      descriptionsExist: describedIds.every((id) =>
        Boolean(document.getElementById(id)),
      ),
      errorText: error?.textContent?.trim(),
    };
  });
  expect(descriptionAssociation).toEqual({
    errorIsAssociated: true,
    descriptionsExist: true,
    errorText: "Selecciona una marca.",
  });

  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Nombre del titular")).toBeFocused();
  expect(await form.locator(".field-error").count()).toBe(7);

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByLabel("RUT")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await expect(form).toBeVisible();
});

test("US-01 T-US01-06/07/10/13: keyboard controls and same-country return retain values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/co/quote/details");
  await expect(
    page.getByRole("heading", { name: "Datos para cotizar" }),
  ).toBeFocused();

  await page.keyboard.press("Tab");
  const holderName = page.getByLabel("Nombre del titular");
  await expect(holderName).toBeFocused();
  await page.keyboard.type("Fictitious Driver");

  await page.keyboard.press("Tab");
  const documentType = page.getByLabel("Tipo de documento");
  await expect(documentType).toBeFocused();
  await page.keyboard.press("c");
  await expect(documentType).toHaveValue(/cc/i);

  await page.keyboard.press("Tab");
  const identity = page.getByLabel("Número de documento");
  await expect(identity).toBeFocused();
  await page.keyboard.type("QA-CO-001");

  await page.keyboard.press("Tab");
  const birthDate = page.getByLabel("Fecha de nacimiento");
  await expect(birthDate).toBeFocused();
  await page.keyboard.type("16041992");
  await expect(birthDate).toHaveValue("1992-04-16");

  const plate = page.getByLabel("Placa");
  for (let index = 0; index < 8; index++) {
    if (await plate.evaluate((input) => input === document.activeElement))
      break;
    await page.keyboard.press("Tab");
  }
  await expect(plate).toBeFocused();
  await page.keyboard.type("QA-PLATE");

  await page.keyboard.press("Tab");
  const vehicleYear = page.getByLabel("Año del vehículo");
  await expect(vehicleYear).toBeFocused();
  await page.keyboard.type("2021");

  await page.keyboard.press("Tab");
  const make = page.getByLabel("Marca");
  await expect(make).toBeFocused();
  await page.keyboard.press("e");
  await expect(make).toHaveValue(/example|demo/i);

  await page.keyboard.press("Tab");
  const accessories = page.getByLabel("El auto tiene accesorios adicionales");
  await expect(accessories).toBeFocused();
  await page.keyboard.press("Space");
  await expect(accessories).toBeChecked();

  await page.keyboard.press("Tab");
  const continueButton = page.getByRole("button", { name: "Continuar" });
  await expect(continueButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/co\/quote\/plans$/);
  await expect(
    page.getByRole("heading", { name: "Datos guardados" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Volver a datos" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByLabel("Nombre del titular")).toHaveValue(
    "Fictitious Driver",
  );
  await expect(page.getByLabel("Número de documento")).toHaveValue("QA-CO-001");
  await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue(
    "1992-04-16",
  );
  await expect(page.getByLabel("Placa")).toHaveValue("QA-PLATE");
  await expect(page.getByLabel("Año del vehículo")).toHaveValue("2021");
  await expect(page.getByLabel("Marca")).toHaveValue(/example|demo/i);
  await expect(
    page.getByLabel("El auto tiene accesorios adicionales"),
  ).toBeChecked();
});

test("US-01 T-US01-05/09/12/14: refreshed published fields reconcile the saved draft", async ({
  page,
}) => {
  const response = await page.request.get("/api/quote-content/v1/co/form");
  expect(response.status()).toBe(200);
  const original = (await response.json()) as {
    schemaVersion: number;
    country: string;
    fields: Array<Record<string, unknown>>;
  };
  const changedFields = original.fields
    .filter((field) => field["id"] !== "accessories")
    .map((field) =>
      field["id"] === "identity-document"
        ? {
            ...field,
            label: "Identificación actualizada",
            helpText: "Usa un valor ficticio actualizado.",
            order: 25,
          }
        : field,
    );
  changedFields.push({
    id: "agency",
    label: "Agencia de ejemplo",
    helpText: "",
    errorMessage: "Revisa la agencia.",
    kind: "text",
    required: false,
    order: 15,
    rules: [],
  });
  const updated = { ...original, fields: changedFields };
  let requests = 0;
  await page.route("**/api/quote-content/v1/co/form", async (route) => {
    requests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(requests === 1 ? original : updated),
    });
  });

  await page.goto("/co/quote/details");
  const originalBundle = await page
    .locator('script[src*="main"]')
    .getAttribute("src");
  await expect(page.getByLabel("Número de documento")).toBeVisible();
  await expect(page.locator("#quote-field-identity-document")).toHaveValue("");
  await page.getByLabel("Número de documento").fill("QA-IDENTITY-01");

  await page.reload();
  await expect(page.getByLabel("Identificación actualizada")).toHaveValue(
    "QA-IDENTITY-01",
  );
  await expect(page.getByLabel("Agencia de ejemplo")).toBeVisible();
  await expect(
    page.getByLabel("El auto tiene accesorios adicionales"),
  ).toHaveCount(0);
  expect(requests).toBe(2);
  expect(await page.locator('script[src*="main"]').getAttribute("src")).toBe(
    originalBundle,
  );

  const fieldOrder = await page
    .locator("form .field")
    .evaluateAll((fields) =>
      fields
        .map((container) => container.querySelector("input, select")?.id)
        .filter((id): id is string => Boolean(id)),
    );
  expect(fieldOrder.indexOf("quote-field-agency")).toBeLessThan(
    fieldOrder.indexOf("quote-field-identity-document"),
  );

  const persisted = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("quote-draft-v1:co") ?? "{}"),
  );
  expect(persisted.draft).not.toHaveProperty("accessories");
  expect(persisted.draft["identity-document"]).toEqual({
    kind: "text",
    value: "QA-IDENTITY-01",
  });
});
