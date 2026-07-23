import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL
  ?? process.env.DATABASE_PRIVATE_URL
  ?? process.env.POSTGRES_URL
  ?? process.env.POSTGRESQL_URL
  ?? process.env.PGURI;

if (!databaseUrl) {
  throw new Error(
    "A PostgreSQL connection variable is required. Set DATABASE_URL or attach the Railway PostgreSQL service.",
  );
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
