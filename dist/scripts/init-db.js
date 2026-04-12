#!/usr/bin/env node
"use strict";

// src/scripts/init-db.ts
var import_pg = require("pg");
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("\u274C Error: DATABASE_URL environment variable is not set.");
  console.error("Please set it before running the initialization script.");
  console.error('Example: export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"');
  process.exit(1);
}
var client = new import_pg.Client({
  connectionString
});
var schema = `
-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON refresh_tokens (user_id);

-- Email Verification Tokens Table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    token_type VARCHAR(50) NOT NULL DEFAULT 'register',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_token_hash ON email_verification_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_user_id ON email_verification_tokens (user_id);
`;
async function run() {
  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Running migration...");
    await client.query(schema);
    console.log("\u2705 Successfully created auth core tables and indexes!");
  } catch (error) {
    console.error("\u274C Database migration failed:", error);
  } finally {
    await client.end();
  }
}
run();
//# sourceMappingURL=init-db.js.map