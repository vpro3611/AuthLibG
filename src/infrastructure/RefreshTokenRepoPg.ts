import { RefreshTokenRepoInterface } from '../ports/interfaces';
import { PoolClient } from 'pg';

export class RefreshTokenRepoPg implements RefreshTokenRepoInterface {
    constructor(private readonly client: PoolClient) {}

    async create(data: { id: string, userId: string, tokenHash: string, expiresAt: Date }): Promise<void> {
        const query = `
            INSERT INTO refresh_tokens (id, user_id, token_hash, created_at, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await this.client.query(query, [data.id, data.userId, data.tokenHash, new Date(), data.expiresAt]);
    }

    async findValidByHash(hash: string): Promise<{ id: string, userId: string, expiresAt: Date } | null> {
        const query = `
            SELECT id, user_id as "userId", expires_at as "expiresAt"
            FROM refresh_tokens
            WHERE token_hash = $1 AND is_revoked = false
        `;
        const result = await this.client.query(query, [hash]);
        return result.rows[0] || null;
    }

    async revoke(id: string): Promise<void> {
        const query = `UPDATE refresh_tokens SET is_revoked = true WHERE id = $1`;
        await this.client.query(query, [id]);
    }

    async revokeByHash(hash: string): Promise<void> {
        const query = `UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1`;
        await this.client.query(query, [hash]);
    }
}