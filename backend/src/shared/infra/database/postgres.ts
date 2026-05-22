import { env } from "../../../config/env.js";
import knex from "knex";

export const db = knex({
  client: "pg",
  connection: {
    connectionString: env.DATABASE_URL,
  },
  pool: { min: 2, max: 10, idleTimeoutMillis: 30000 },
});
