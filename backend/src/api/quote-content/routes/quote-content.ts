export const READ_FORM_ACTION = "api::quote-content.quote-content.readForm";

export const READ_PLANS_ACTION = "api::quote-content.quote-content.readPlans";

export default {
  routes: [
    {
      method: "GET",
      path: "/quote-content/v1/:country/form",
      handler: READ_FORM_ACTION,
      config: { auth: { scope: [READ_FORM_ACTION] } },
    },
    {
      method: "GET",
      path: "/quote-content/v1/:country/plans",
      handler: READ_PLANS_ACTION,
      config: { auth: { scope: [READ_PLANS_ACTION] } },
    },
  ],
};
