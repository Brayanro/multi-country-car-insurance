import type { ConfigContext } from "./environment";

export default ({ env }: ConfigContext) => ({
  "users-permissions": { config: { jwtSecret: env("JWT_SECRET") } },
});
