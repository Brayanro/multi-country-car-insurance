import type { ConfigContext } from "./environment";

export default ({ env }: ConfigContext) => ({
  auth: { secret: env("ADMIN_JWT_SECRET") },
  apiToken: { salt: env("API_TOKEN_SALT") },
  transfer: { token: { salt: env("TRANSFER_TOKEN_SALT") } },
  secrets: { encryptionKey: env("ENCRYPTION_KEY") },
});
