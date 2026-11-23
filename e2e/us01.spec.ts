import { expect, test } from "@playwright/test";

test("US-01 T-US01-01/03/07/10/11/13: navigate, validate and recover a country draft", async ({
  page,
}) => {
  const writeRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writeRequests.push(request.url());
  });

  await page.goto("/");
  const colombia = page.getByRole("link", { name: "Colombia", exact: true });
  await colombia.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/co\/quote\/details$/);
  const name = page.getByRole("textbox", { name: "Nombre del titular" });
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAccessibleDescription(
    "Ingresa el nombre del titular.",
  );

  await name.fill("Persona Demo");
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await page
    .getByLabel("Tipo de documento")
    .selectOption({ label: "Cédula de ciudadanía" });
  await page.getByLabel("Número de documento").fill("DEMO-ID");
  await page.getByLabel("Fecha de nacimiento").fill("1992-04-16");
  await page.getByLabel("Placa").fill("DEMO-CO");
  await page.getByLabel("Año del vehículo").fill("2021");
  const make = page.getByLabel("Marca");
  const makeValue = await make
    .locator("option:enabled")
    .first()
    .getAttribute("value");
  expect(makeValue).toBeTruthy();
  await make.selectOption(makeValue!);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/co\/quote\/plans$/);
  await page.getByRole("link", { name: "Volver a datos" }).click();
  await expect(name).toHaveValue("Persona Demo");
  await expect(make).toHaveValue(makeValue!);
  await page.reload();
  await expect(name).toHaveValue("Persona Demo");
  await expect(make).toHaveValue(makeValue!);
  await expect(page.getByLabel("Año del vehículo")).toHaveValue("2021");

  await page.goto("/CL/quote/details");
  await expect(page).toHaveURL(/\/cl\/quote\/details$/);
  await expect(page.getByLabel("RUT")).toBeVisible();
  await expect(name).toHaveValue("");
  await expect(page.getByLabel("Número de documento")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  expect(writeRequests).toEqual([]);
});

test("US-01 T-US01-08/13: recover invalid country and configuration without stale fields", async ({
  page,
}) => {
  await page.goto("/zz/quote/details");
  await expect(page).toHaveURL(/\/zz\/quote\/details$/);
  await expect(page.getByText("Este país no está disponible.")).toBeVisible();

  await page.route(
    "**/api/quote-content/v1/cl/form",
    (route) =>
      route.fulfill({
        status: 503,
        json: { error: { code: "FORM_UNAVAILABLE" } },
      }),
    { times: 1 },
  );
  await page.getByRole("link", { name: "Chile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Formulario no disponible" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByLabel("RUT")).toBeVisible();
});

test("US-01 T-US01-08: allow only the intended public form endpoint", async ({
  request,
}) => {
  const form = await request.get("/api/quote-content/v1/co/form");
  expect(form.status()).toBe(200);
  expect(form.headers()["cache-control"]).toBe("no-store");
  expect(await form.json()).toMatchObject({ schemaVersion: 1, country: "co" });
  expect(
    (await request.get("/api/quote-content/v1/co/form?status=draft")).status(),
  ).toBe(400);
  expect((await request.get("/api/form-configurations")).status()).toBe(404);
  expect((await request.post("/api/quote-content/v1/co/form")).status()).toBe(
    405,
  );
});

test("US01-R01 · T-US01-03/10/12: suffix-like IDs retain distinct accessible associations", async ({
  page,
}) => {
  await page.route("**/api/quote-content/v1/co/form", async (route) => {
    const response = await route.fetch();
    const configuration = await response.json();
    configuration.fields.push(
      ...["alpha", "alpha-help", "alpha-error"].map((id, index) => ({
        id,
        kind: "text",
        order: index,
        label: `Campo ${id}`,
        helpText: `Ayuda ${id}`,
        errorMessage: `Error ${id}`,
        required: true,
        rules: [],
      })),
    );
    await route.fulfill({ response, json: configuration });
  });
  await page.goto("/co/quote/details");
  const fields = ["alpha", "alpha-help", "alpha-error"];
  await expect(
    page.getByRole("textbox", { name: "Campo alpha-help", exact: true }),
  ).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: "Continuar" }).click();
  for (const id of fields) {
    const control = page.getByRole("textbox", {
      name: `Campo ${id}`,
      exact: true,
    });
    await expect(control).toHaveAccessibleDescription(
      `Ayuda ${id} Error ${id}`,
    );
    const label = page
      .locator("label")
      .filter({ hasText: new RegExp(`^Campo ${id}\\s*\\*$`) });
    expect(
      await label.evaluate(
        (element) => (element as HTMLLabelElement).control?.id,
      ),
    ).toBe(await control.getAttribute("id"));
  }
  await expect(
    page.getByRole("textbox", { name: "Campo alpha", exact: true }),
  ).toBeFocused();
  const ids = await page
    .locator("main [id]")
    .evaluateAll((elements) => elements.map(({ id }) => id));
  expect(new Set(ids).size).toBe(ids.length);
});

test("US01-R02 · T-US01-10: permitted long labels reflow at a 320 px viewport", async ({
  page,
}) => {
  const longLabel = "Etiqueta".repeat(27);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/quote-content/v1/co/form", async (route) => {
    const response = await route.fetch();
    const configuration = await response.json();
    configuration.fields[0].label = longLabel;
    await route.fulfill({ response, json: configuration });
  });
  await page.goto("/co/quote/details");
  const control = page.getByRole("textbox", { name: longLabel, exact: true });
  await expect(control).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await control.fill("Persona Demo");
  await expect(control).toBeInViewport();
  const next = page.getByRole("button", { name: "Continuar" });
  await next.focus();
  await expect(next).toBeInViewport();
});
