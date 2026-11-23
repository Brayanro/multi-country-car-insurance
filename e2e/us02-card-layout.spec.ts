import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ hasTouch: true });

const planNames = ["Esencial", "Ruta", "Integral", "Adicional", "Regional"];
const longCopy = "Cobertura".repeat(25);

async function openCatalog(page: Page, count: () => number, wideCopy = false) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "quote-draft-v1:co",
      JSON.stringify({
        version: 2,
        country: "co",
        draft: {
          "identity-document": { kind: "text", value: "FICTICIO-0001" },
          birth: { kind: "date", value: "1990-02-10" },
          year: { kind: "number", value: new Date().getFullYear() },
        },
      }),
    );
  });
  await page.route("**/api/quote-content/v1/co/form", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        country: "co",
        fields: [
          {
            id: "identity-document",
            purpose: "identityDocument",
            kind: "text",
            order: 5,
            label: "Documento",
            required: true,
            helpText: "",
            errorMessage: "Documento inválido",
            rules: [],
          },
          {
            id: "birth",
            purpose: "dateOfBirth",
            kind: "date",
            order: 10,
            label: "Fecha de nacimiento",
            required: true,
            helpText: "",
            errorMessage: "Fecha inválida",
            rules: [
              { operator: "minimumAge", argument: 18, message: "Edad mínima" },
            ],
          },
          {
            id: "year",
            purpose: "vehicleYear",
            kind: "number",
            order: 20,
            label: "Año del vehículo",
            required: true,
            helpText: "",
            errorMessage: "Año inválido",
            rules: [{ operator: "vehicleYearRange", message: "Año inválido" }],
          },
        ],
      },
    }),
  );
  await page.route("**/api/quote-content/v1/co/plans", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        country: "co",
        plans: planNames.slice(0, count()).map((name, index) => ({
          id: `fixture-${index}`,
          name: wideCopy && index === 0 ? longCopy : name,
          shortDescription: "Oferta de prueba",
          basePrice: { amountMinor: 12990050, currency: "COP" },
          coverages: [
            wideCopy && index === 0 ? longCopy : "Responsabilidad civil",
          ],
          benefits: ["Asistencia en carretera"],
          order: index,
          recommended: index === 1,
        })),
      },
    }),
  );
  await page.goto("/co/quote/plans");
  await expect(page.getByRole("radio")).toHaveCount(count());
}

async function positions(cards: Locator) {
  return cards.evaluateAll((items) =>
    items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
}

test("T-US02-01/07: grid follows available lane width and collapses unused tracks", async ({
  page,
}) => {
  let count = 5;
  await openCatalog(page, () => count, true);
  const cards = page.getByRole("article");
  const lane = page.getByRole("group", { name: "Planes disponibles" });

  for (const [viewport, laneWidth, expectedColumns] of [
    [320, 280, 1],
    [575, 535, 1],
    [576, 536, 2],
    [855, 815, 2],
    [856, 816, 3],
    [1440, 928, 3],
  ]) {
    await page.setViewportSize({ width: viewport, height: 900 });
    expect((await lane.boundingBox())?.width).toBe(laneWidth);
    const items = await positions(cards);
    expect(items.filter(({ y }) => y === items[0].y)).toHaveLength(
      expectedColumns,
    );
    expect(items[expectedColumns].y).toBeGreaterThan(items[0].y);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport);
  }

  count = 2;
  await page.reload();
  await expect(cards).toHaveCount(2);
  const [first, second] = await positions(cards);
  expect(first.y).toBe(second.y);
  expect(second.x - first.x - first.width).toBeCloseTo(24);
  expect(first.width + second.width + 24).toBeCloseTo(928);

  count = 1;
  await page.reload();
  await expect(cards).toHaveCount(1);
  expect((await cards.boundingBox())?.width).toBe(928);
});

test("T-US02-03/04/07: card content and padding select the single native radio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCatalog(page, () => 3);
  const cards = page.getByRole("article");
  const [essential, route, integral] = ["Esencial", "Ruta", "Integral"].map(
    (name) => page.getByRole("radio", { name, exact: true }),
  );
  const next = page.getByRole("button", { name: "Continuar" });
  const before = await positions(cards);

  await expect(route).toHaveAccessibleDescription(
    /COP.*129\.900,50.*Recomendado/,
  );
  await expect(next).toBeDisabled();
  const firstPrice = await cards.nth(0).getByText(/COP/).boundingBox();
  expect(firstPrice).not.toBeNull();
  await page.mouse.click(firstPrice!.x + 5, firstPrice!.y + 5);
  await expect(essential).toBeChecked();

  const coverage = await cards
    .nth(1)
    .getByText("Responsabilidad civil")
    .boundingBox();
  expect(coverage).not.toBeNull();
  await page.mouse.click(coverage!.x + 5, coverage!.y + 5);
  await expect(route).toBeChecked();
  await expect(essential).not.toBeChecked();

  const benefit = await cards
    .nth(2)
    .getByText("Asistencia en carretera")
    .boundingBox();
  expect(benefit).not.toBeNull();
  await page.touchscreen.tap(benefit!.x + 5, benefit!.y + 5);
  await expect(integral).toBeChecked();
  await expect(route).not.toBeChecked();

  await cards.nth(0).getByText("Esencial", { exact: true }).click();
  await expect(essential).toBeChecked();

  const padding = (await cards.nth(2).boundingBox())!;
  await page.mouse.click(padding.x + 3, padding.y + padding.height - 4);
  await expect(integral).toBeChecked();
  await expect(route).not.toBeChecked();
  await expect(next).toBeEnabled();
  await expect(page).toHaveURL(/\/co\/quote\/plans$/);
  expect(await positions(cards)).toEqual(before);

  await page.emulateMedia({ forcedColors: "active" });
  await page.getByRole("heading", { name: "Elige tu plan" }).focus();
  await page.keyboard.press("Tab");
  await expect(integral).toBeFocused();
  await expect(integral).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowRight");
  await expect(essential).toBeFocused();
  await expect(essential).toBeChecked();
  await page.keyboard.press("Space");
  await expect(essential).toBeChecked();
  await route.click();
  await expect(route).toBeChecked();
});
