export const READ_FORM_ACTION = "api::quote-content.quote-content.readForm";

export default {
  routes: [
    {
      method: "GET",
      path: "/quote-content/v1/:country/form",
      handler: READ_FORM_ACTION,
      config: { auth: { scope: [READ_FORM_ACTION] } },
    },
  ],
};
