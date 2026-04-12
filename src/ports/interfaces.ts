export interface AuthUser {
    getId(): string;
    getPasswordHash(): string;
}

export interface UserRepoReader<TUser extends AuthUser> {
    getUserById(id: string): Promise<TUser | null>;
    getUserByUsername(username: string): Promise<TUser | null>;
    getUserByEmail(email: string): Promise<TUser | null>;
}

export interface UserRepoWriter<TUser extends AuthUser> {
    save(user: Omit<TUser, "getId"> | any): Promise<TUser>;
    markAsVerified(userId: string): Promise<void>;
}

export interface BcryptInterface {
    hash(data: string): Promise<string>;
    compare(data: string, encrypted: string): Promise<boolean>;
}

export interface EmailSenderInterface {
    sendVerificationEmail(email: string, token: string, path: string, type: string): Promise<void>;
}

export interface EmailVerificationInterface {
    deleteByUserIdAndType(userId: string, type: string): Promise<void>;
    saveToken(data: { id: string, userId: string, tokenHash: string, createdAt: Date, expiresAt: Date, tokenType: string }): Promise<void>;
    findByTokenHash(hash: string): Promise<{ userId: string, tokenType: string, expiresAt: Date } | null>;
    deleteByTokenHash(hash: string): Promise<void>;
}

export interface RefreshTokenRepoInterface {
    create(data: { id: string, userId: string, tokenHash: string, expiresAt: Date }): Promise<void>;
    findValidByHash(hash: string): Promise<{ id: string, userId: string, expiresAt: Date } | null>;
    revoke(id: string): Promise<void>;
    revokeByHash(hash: string): Promise<void>;
}

export interface TokenServiceInterface {
    generateAccessToken(userId: string): string;
    generateRefreshToken(userId: string): string;
    verifyRefreshToken(token: string): { sub: string };
    getRefreshTokenExpiresInMs(): number;
}

export interface TransactionManagerInterface {
    runInTransaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}

export interface AuthHooks<TUser extends AuthUser> {
    beforeLogin?: (user: TUser) => void | Promise<void>;
    beforeRegister?: (email: string, username: string) => void | Promise<void>;
    afterRegister?: (user: TUser) => void | Promise<void>;
}

export interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    path?: string;
    domain?: string;
}

export interface AuthConfig {
    cookieOptions?: {
        accessToken?: CookieOptions;
        refreshToken?: CookieOptions;
    };
    tokenNames?: {
        accessToken?: string;
        refreshToken?: string;
    };
    tokenExpiresIn?: {
        accessToken?: string | number; // e.g. "15m", "1h"
        refreshToken?: string | number; // e.g. "7d", "30d"
    };
}
