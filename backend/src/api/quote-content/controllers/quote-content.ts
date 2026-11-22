import { isCountry } from "@quote/contract";
import { FORM_UID, projectForm } from "../form-projection";

type ReadContext = {
  params: Record<string, unknown>;
  querystring: string;
  set(name: string, value: string): void;
  status: number;
  body: unknown;
};

export default {
  async readForm(ctx: ReadContext) {
    ctx.set("Cache-Control", "no-store");
    const fail = (status: number, code: string) => {
      ctx.body = { error: { code } };
      ctx.status = status;
    };

    const country = ctx.params["country"];
    if (!isCountry(country)) return fail(404, "UNSUPPORTED_COUNTRY");
    if (ctx.querystring) return fail(400, "INVALID_REQUEST");

    let documents;
    try {
      documents = await strapi.documents(FORM_UID).findMany({
        status: "published",
        filters: { country },
        populate: { fields: { populate: ["options", "rules"] } },
        limit: 2,
      });
    } catch {
      strapi.log.error("Quote form document retrieval failed.");
      return fail(503, "CONTENT_UNAVAILABLE");
    }

    if (!documents.length) return fail(404, "FORM_NOT_PUBLISHED");
    const form =
      documents.length === 1 ? projectForm(documents[0], country) : null;
    if (!form) {
      strapi.log.warn("A published quote form configuration was rejected.");
      return fail(503, "FORM_UNAVAILABLE");
    }
    ctx.body = form;
    ctx.status = 200;
  },
};
