import { EmailVerificationInterface } from '../ports/interfaces';
import { PoolClient } from 'pg';

export class EmailVerificationRepoPg implements EmailVerificationInterface {
    constructor(private readonly client: PoolClient) {}

    async deleteByUserIdAndType(userId: string, type: string): Promise<void> {
        const query = 'DELETE FROM email_verification_tokens WHERE user_id = $1 AND token_type = $2';
        await this.client.query(query, [userId, type]);
    }

    async saveToken(data: { id: string, userId: string, tokenHash: string, createdAt: Date, expiresAt: Date, tokenType: string }): Promise<void> {
        const query = `
            INSERT INTO email_verification_tokens (id, user_id, token_hash, created_at, expires_at, token_type)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await this.client.query(query, [data.id, data.userId, data.tokenHash, data.createdAt, data.expiresAt, data.tokenType]);
    }

    async findByTokenHash(hash: string): Promise<{ userId: string, tokenType: string, expiresAt: Date } | null> {
        const query = 'SELECT user_id as "userId", token_type as "tokenType", expires_at as "expiresAt" FROM email_verification_tokens WHERE token_hash = $1';
        const result = await this.client.query(query, [hash]);
        return result.rows[0] || null;
    }

    async deleteByTokenHash(hash: string): Promise<void> {
        const query = 'DELETE FROM email_verification_tokens WHERE token_hash = $1';
        await this.client.query(query, [hash]);
    }
}
