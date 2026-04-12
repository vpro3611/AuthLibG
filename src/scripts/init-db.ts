#!/usr/bin/env node

import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    console.error('Please set it before running the initialization script.');
    console.error('Example: export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

const schema = `
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
`;

async function run() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        
        console.log('Running migration...');
        await client.query(schema);
        
        console.log('✅ Successfully created refresh_tokens table and indexes!');
    } catch (error) {
        console.error('❌ Database migration failed:', error);
    } finally {
        await client.end();
    }
}

run();
