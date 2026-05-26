import { env } from "../../../config/env.js";
import knex, { type Knex } from "knex";

const knexConfig: Knex.Config = {
  client: "pg",
  connection: {
    connectionString: env.DATABASE_URL,
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  },
};

export const db = knex(knexConfig);
