import { TokenServiceInterface } from '../ports/interfaces';
import { TokenExpiredError, InvalidTokenError } from '../domain/errors';
import * as jwt from 'jsonwebtoken';

export class TokenServiceJWT implements TokenServiceInterface {
    constructor(private readonly secret: string) {}

    generateAccessToken(userId: string): string {
        return jwt.sign({ sub: userId }, this.secret, { expiresIn: '15m' });
    }
    generateRefreshToken(userId: string): string {
        return jwt.sign({ sub: userId }, this.secret, { expiresIn: '7d' });
    }
    verifyRefreshToken(token: string): { sub: string } {
        try {
            return jwt.verify(token, this.secret) as { sub: string };
        } catch (e: any) {
            if (e.name === 'TokenExpiredError') throw new TokenExpiredError('Token expired');
            throw new InvalidTokenError('Invalid token');
        }
    }
}