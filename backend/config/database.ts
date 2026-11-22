import { resolve } from "node:path";

import type { ConfigContext } from "./environment";

export default ({ env }: ConfigContext) => ({
  connection: {
    client: "sqlite",
    connection: {
      filename: resolve(env("DATABASE_FILENAME", ".data/strapi.sqlite")),
    },
    useNullAsDefault: true,
  },
});
