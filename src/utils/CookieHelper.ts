import { CookieOptions, AuthConfig } from '../ports/interfaces';

export class CookieHelper {
    private static readonly DEFAULT_ACCESS_TOKEN_AGE = 15 * 60 * 1000; // 15m
    private static readonly DEFAULT_REFRESH_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000; // 7d

    static getAccessTokenOptions(config?: AuthConfig): CookieOptions {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: this.DEFAULT_ACCESS_TOKEN_AGE,
            path: '/',
            ...config?.cookieOptions?.accessToken
        };
    }

    static getRefreshTokenOptions(config?: AuthConfig): CookieOptions {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: this.DEFAULT_REFRESH_TOKEN_AGE,
            path: '/',
            ...config?.cookieOptions?.refreshToken
        };
    }

    static getTokenNames(config?: AuthConfig) {
        return {
            accessToken: config?.tokenNames?.accessToken || 'access_token',
            refreshToken: config?.tokenNames?.refreshToken || 'refresh_token'
        };
    }
}
