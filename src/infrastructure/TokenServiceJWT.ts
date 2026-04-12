import { TokenServiceInterface } from '../ports/interfaces';
import { TokenExpiredError, InvalidTokenError } from '../domain/errors';
import * as jwt from 'jsonwebtoken';
import ms, { StringValue } from 'ms';

export class TokenServiceJWT implements TokenServiceInterface {
    private readonly accessTokenExpiresIn: string | number;
    private readonly refreshTokenExpiresIn: string | number;

    constructor(
        private readonly secret: string,
        options?: { accessTokenExpiresIn?: string | number, refreshTokenExpiresIn?: string | number }
    ) {
        if (!secret) {
            throw new Error('JWT secret must be provided');
        }
        this.accessTokenExpiresIn = options?.accessTokenExpiresIn || '15m';
        this.refreshTokenExpiresIn = options?.refreshTokenExpiresIn || '7d';
    }

    generateAccessToken(userId: string): string {
        return jwt.sign({ sub: userId }, this.secret, { 
            expiresIn: this.accessTokenExpiresIn as any 
        });
    }

    generateRefreshToken(userId: string): string {
        return jwt.sign({ sub: userId }, this.secret, { 
            expiresIn: this.refreshTokenExpiresIn as any 
        });
    }

    verifyAccessToken(token: string): { sub: string } {
        return this.verify(token);
    }

    verifyRefreshToken(token: string): { sub: string } {
        return this.verify(token);
    }

    private verify(token: string): { sub: string } {
        try {
            return jwt.verify(token, this.secret) as { sub: string };
        } catch (e: any) {
            if (e.name === 'TokenExpiredError') {
                throw new TokenExpiredError('Token expired');
            }
            throw new InvalidTokenError('Invalid token');
        }
    }

    getRefreshTokenExpiresInMs(): number {
        if (typeof this.refreshTokenExpiresIn === 'number') {
            return this.refreshTokenExpiresIn;
        }
        return ms(this.refreshTokenExpiresIn as StringValue);
    }
}
