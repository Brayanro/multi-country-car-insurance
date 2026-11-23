import type { Core } from "@strapi/strapi";
import { FORM_UID } from "./api/quote-content/form-projection";
import { PLAN_UID } from "./api/quote-content/plan-projection";
import {
  READ_FORM_ACTION,
  READ_PLANS_ACTION,
  READ_TERMS_ACTION,
} from "./api/quote-content/routes/quote-content";
import { TERMS_UID } from "./api/quote-content/terms-projection";
import { seedTerms } from "./seed-terms";
import { seedForm } from "./seed-forms";
import { PLAN_EXPANSION_KEY, planCountries, seedPlans } from "./seed-plans";

async function restrictPublicRole(strapi: Core.Strapi) {
  await strapi.db.transaction(async () => {
    const roles = strapi.db.query("plugin::users-permissions.role");
    const publicRole = await roles.findOne({ where: { type: "public" } });
    if (!publicRole)
      throw new Error(
        "The Public role is unavailable during quote initialization.",
      );

    const permissions = strapi.db.query("plugin::users-permissions.permission");
    const grants = await permissions.findMany({
      select: ["id", "action"],
      where: { role: publicRole.id },
    });
    const expectedActions = [
      READ_FORM_ACTION,
      READ_PLANS_ACTION,
      READ_TERMS_ACTION,
    ];
    const retained = expectedActions.map((action) =>
      grants.find((grant) => grant.action === action),
    );
    const obsolete = grants
      .filter((grant) => !retained.includes(grant))
      .map(({ id }) => id);
    if (obsolete.length) {
      await permissions.deleteMany({ where: { id: { $in: obsolete } } });
    }
    for (const [index, action] of expectedActions.entries()) {
      if (!retained[index])
        await permissions.create({ data: { action, role: publicRole.id } });
    }
  });
}

async function removeRetiredFormField(strapi: Core.Strapi) {
  await strapi.db.transaction(async () => {
    const forms = strapi.db.query(FORM_UID);
    const versions = await forms.findMany({
      where: { country: { $in: planCountries } },
      populate: ["fields"],
    });
    for (const version of versions) {
      const fields = version.fields.filter(
        (field: { fieldKey: string }) => field.fieldKey !== "accessories",
      );
      if (fields.length === version.fields.length) continue;

      // Update each stored version in place. Publishing would copy unrelated draft edits.
      const data = await strapi.documents(FORM_UID).updateComponents(version, {
        fields: fields.map(({ id }: { id: number }) => ({ id })),
      });
      await forms.update({ where: { id: version.id }, data });
    }
  });
}

async function seedContent(strapi: Core.Strapi) {
  const seedState = strapi.store({ type: "core", name: "quote-content" });
  if (!(await seedState.get({ key: "us01-seeded" }))) {
    for (const country of planCountries) {
      const documents = strapi.documents(FORM_UID);
      const draft = await documents.findFirst({
        status: "draft",
        filters: { country },
      });
      if (!draft)
        await documents.create({
          data: seedForm(country),
          status: "published",
        });
    }
    await seedState.set({ key: "us01-seeded", value: true });
  }

  await strapi.db.transaction(async () => {
    if (await seedState.get({ key: "us02-seeded" })) return;
    const expansion: Partial<Record<(typeof planCountries)[number], string>> =
      {};
    for (const country of planCountries) {
      for (const fixture of seedPlans(country)) {
        const plan = await strapi
          .documents(PLAN_UID)
          .create({ data: fixture, status: "published" });
        if (fixture.name === "Integral") expansion[country] = plan.documentId;
      }
    }
    await seedState.set({ key: PLAN_EXPANSION_KEY, value: expansion });
    await seedState.set({ key: "us02-seeded", value: true });
  });

  await strapi.db.transaction(async () => {
    if (await seedState.get({ key: "us03-seeded" })) return;
    const documents = strapi.documents(TERMS_UID);
    for (const country of planCountries) {
      const existing = await documents.findFirst({
        status: "draft",
        filters: { country },
      });
      if (!existing) {
        await documents.create({
          data: seedTerms(country),
          status: "published",
        });
      }
    }
    await seedState.set({ key: "us03-seeded", value: true });
  });
}

export default {
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    if (strapi.config.get("quoteCatalogMaintenance")) return;
    await restrictPublicRole(strapi);
    await seedContent(strapi);
    await removeRetiredFormField(strapi);
  },
};
