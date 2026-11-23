import { isCountry, MAX_PLANS } from "@quote/contract";
import { FORM_UID, projectForm } from "../form-projection";

import { PLAN_UID, projectPlans } from "../plan-projection";
import { TERMS_UID, projectTerms } from "../terms-projection";

type ReadContext = {
  params: Record<string, unknown>;
  querystring: string;
  set(name: string, value: string): void;
  status: number;
  body: unknown;
};

function startRead(ctx: ReadContext) {
  ctx.set("Cache-Control", "no-store");
  return (status: number, code: string) => {
    ctx.body = { error: { code } };
    ctx.status = status;
  };
}

export default {
  async readForm(ctx: ReadContext) {
    const fail = startRead(ctx);
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
  async readPlans(ctx: ReadContext) {
    const fail = startRead(ctx);
    const country = ctx.params["country"];
    if (!isCountry(country)) return fail(404, "UNSUPPORTED_COUNTRY");
    if (ctx.querystring) return fail(400, "INVALID_REQUEST");

    let documents;
    try {
      documents = await strapi.documents(PLAN_UID).findMany({
        status: "published",
        filters: { country, active: true },
        populate: ["coverages", "benefits"],
        limit: MAX_PLANS + 1,
      });
    } catch {
      strapi.log.error("Quote plan document retrieval failed.");
      return fail(503, "CONTENT_UNAVAILABLE");
    }

    const catalog = projectPlans(documents, country);
    if (!catalog) {
      strapi.log.warn("A published quote plan catalog was rejected.");
      return fail(503, "PLANS_UNAVAILABLE");
    }
    ctx.body = catalog;
    ctx.status = 200;
  },
  async readTerms(ctx: ReadContext) {
    const fail = startRead(ctx);
    const country = ctx.params["country"];
    if (!isCountry(country)) return fail(404, "UNSUPPORTED_COUNTRY");
    if (ctx.querystring) return fail(400, "INVALID_REQUEST");

    let documents;
    try {
      documents = await strapi.documents(TERMS_UID).findMany({
        status: "published",
        filters: { country },
        fields: ["country", "body"],
        limit: 2,
      });
    } catch {
      strapi.log.error("Quote terms document retrieval failed.");
      return fail(503, "CONTENT_UNAVAILABLE");
    }
    if (!documents.length) return fail(404, "TERMS_NOT_PUBLISHED");
    const terms =
      documents.length === 1 ? projectTerms(documents[0], country) : null;
    if (!terms) {
      strapi.log.warn("A published quote terms configuration was rejected.");
      return fail(503, "TERMS_UNAVAILABLE");
    }
    ctx.body = terms;
    ctx.status = 200;
  },
};
