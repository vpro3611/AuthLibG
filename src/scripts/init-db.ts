#!/usr/bin/env node

import { Client as PgClient } from 'pg';
import * as fs from 'fs';

const connectionString = process.env.DATABASE_URL;
const dbType = process.env.DB_TYPE || 'postgres'; // pg, mysql, sqlite

if (!connectionString && dbType !== 'sqlite') {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    console.error('Example: export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"');
    process.exit(1);
}

const schemas: Record<string, string> = {
    postgres: `
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
    `,
    mysql: `
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            is_revoked BOOLEAN NOT NULL DEFAULT false,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_refresh_token_hash ON refresh_tokens (token_hash);
        CREATE INDEX idx_refresh_user_id ON refresh_tokens (user_id);

        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            token_type VARCHAR(50) NOT NULL DEFAULT 'register',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_email_token_hash ON email_verification_tokens (token_hash);
        CREATE INDEX idx_email_user_id ON email_verification_tokens (user_id);
    `,
    sqlite: `
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            is_revoked BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens (token_hash);
        CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON refresh_tokens (user_id);

        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            token_type TEXT NOT NULL DEFAULT 'register',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_email_token_hash ON email_verification_tokens (token_hash);
        CREATE INDEX IF NOT EXISTS idx_email_user_id ON email_verification_tokens (user_id);
    `
};

async function run() {
    console.log(`🚀 Initializing database schema for: ${dbType}`);

    if (dbType === 'postgres' || dbType === 'pg') {
        const client = new PgClient({ connectionString });
        await client.connect();
        await client.query(schemas.postgres);
        await client.end();
    } else if (dbType === 'mysql') {
        console.log('⚠️  Note: For MySQL, please run the following SQL manually or via your migration tool:');
        console.log(schemas.mysql);
        return;
    } else if (dbType === 'sqlite') {
        console.log('⚠️  Note: For SQLite, please run the following SQL manually or via your migration tool:');
        console.log(schemas.sqlite);
        return;
    } else {
        console.error(`❌ Error: Unsupported DB_TYPE "${dbType}"`);
        process.exit(1);
    }

    console.log('✅ Successfully created auth core tables and indexes!');
}

run().catch(err => {
    console.error('❌ Initialization failed:', err.message);
    process.exit(1);
});
