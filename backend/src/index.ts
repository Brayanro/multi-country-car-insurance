import type { Core } from "@strapi/strapi";
import { FORM_UID } from "./api/quote-content/form-projection";
import { READ_FORM_ACTION } from "./api/quote-content/routes/quote-content";
import { seedForm } from "./seed-forms";

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
    const reader = grants.find(({ action }) => action === READ_FORM_ACTION);
    const obsolete = grants
      .filter(({ id }) => id !== reader?.id)
      .map(({ id }) => id);
    if (obsolete.length) {
      await permissions.deleteMany({ where: { id: { $in: obsolete } } });
    }
    if (!reader) {
      await permissions.create({
        data: { action: READ_FORM_ACTION, role: publicRole.id },
      });
    }
  });
}

export default {
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await restrictPublicRole(strapi);

    const seedState = strapi.store({ type: "core", name: "quote-content" });
    if (await seedState.get({ key: "us01-seeded" })) return;

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
