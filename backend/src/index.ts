import type { Core } from "@strapi/strapi";
import { FORM_UID } from "./api/quote-content/form-projection";
import { READ_FORM_ACTION } from "./api/quote-content/routes/quote-content";
import { seedForm } from "./seed-forms";

export default {
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const seedState = strapi.store({ type: "core", name: "quote-content" });
    if (await seedState.get({ key: "us01-seeded" })) return;

    const roles = strapi.db.query("plugin::users-permissions.role");
    const publicRole = await roles.findOne({ where: { type: "public" } });
    if (!publicRole)
      throw new Error(
        "The Public role is unavailable during quote initialization.",
      );
    const permissions = strapi.db.query("plugin::users-permissions.permission");
    const existing = await permissions.findOne({
      where: { action: READ_FORM_ACTION, role: publicRole.id },
    });
    if (!existing)
      await permissions.create({
        data: { action: READ_FORM_ACTION, role: publicRole.id },
      });

    for (const country of ["co", "cl"] as const) {
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
  },
};
