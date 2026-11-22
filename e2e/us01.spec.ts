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
  await page.getByLabel("Marca").selectOption({ label: "Ejemplo Motor" });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/co\/quote\/plans$/);
  await page.getByRole("link", { name: "Volver a datos" }).click();
  await expect(name).toHaveValue("Persona Demo");
  await page.reload();
  await expect(name).toHaveValue("Persona Demo");
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
