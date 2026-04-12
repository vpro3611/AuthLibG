import { RefreshTokenRepoInterface } from '../ports/interfaces';

export class InMemoryRefreshTokenRepo implements RefreshTokenRepoInterface {
    private tokens = new Map<string, { id: string, userId: string, tokenHash: string, expiresAt: Date, isRevoked: boolean }>();

    async create(data: { id: string, userId: string, tokenHash: string, expiresAt: Date }): Promise<void> {
        this.tokens.set(data.id, { ...data, isRevoked: false });
    }

    async findValidByHash(hash: string): Promise<{ id: string, userId: string, expiresAt: Date } | null> {
        for (const token of this.tokens.values()) {
            if (token.tokenHash === hash && !token.isRevoked) {
                return token;
            }
        }
        return null;
    }

    async revoke(id: string): Promise<void> {
        const token = this.tokens.get(id);
        if (token) token.isRevoked = true;
    }

    async revokeByHash(hash: string): Promise<void> {
        for (const token of this.tokens.values()) {
            if (token.tokenHash === hash) {
                token.isRevoked = true;
            }
        }
    }
}