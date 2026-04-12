import { PoolClient } from 'pg';

declare class DomainError extends Error {
    constructor(message: string);
}
declare class InvalidEmailError extends DomainError {
}
declare class InvalidUsernameError extends DomainError {
}
declare class InvalidPasswordError extends DomainError {
}
declare class InvalidTokenError extends DomainError {
}
declare class TokenExpiredError extends DomainError {
}
declare class UserNotFoundError extends DomainError {
}
declare class InvalidCredentialsError extends DomainError {
}
declare class UsernameAlreadyExistsError extends DomainError {
}
declare class EmailAlreadyExistsError extends DomainError {
}

declare class Email {
    private readonly value;
    private constructor();
    private static readonly PATTERN;
    static create(rawEmail: string): Email;
    getValue(): string;
}

declare class Username {
    private readonly value;
    private constructor();
    static create(rawUsername: string): Username;
    getValue(): string;
}

declare class Password {
    private readonly hash;
    private constructor();
    private static readonly PATTERN;
    static validatePlain(password: string): string;
    static fromHash(hash: string): Password;
    getHash(): string;
}

interface AuthUser {
    getId(): string;
    getPasswordHash(): string;
}
interface UserRepoReader<TUser extends AuthUser> {
    getUserById(id: string): Promise<TUser | null>;
    getUserByUsername(username: string): Promise<TUser | null>;
    getUserByEmail(email: string): Promise<TUser | null>;
}
interface UserRepoWriter<TUser extends AuthUser> {
    save(user: Omit<TUser, "getId"> | any): Promise<TUser>;
    markAsVerified(userId: string): Promise<void>;
}
interface BcryptInterface {
    hash(data: string): Promise<string>;
    compare(data: string, encrypted: string): Promise<boolean>;
}
interface EmailSenderInterface {
    sendVerificationEmail(email: string, token: string, path: string, type: string): Promise<void>;
}
interface EmailVerificationInterface {
    deleteByUserIdAndType(userId: string, type: string): Promise<void>;
    saveToken(data: {
        id: string;
        userId: string;
        tokenHash: string;
        createdAt: Date;
        expiresAt: Date;
        tokenType: string;
    }): Promise<void>;
    findByTokenHash(hash: string): Promise<{
        userId: string;
        tokenType: string;
        expiresAt: Date;
    } | null>;
    deleteByTokenHash(hash: string): Promise<void>;
}
interface RefreshTokenRepoInterface {
    create(data: {
        id: string;
        userId: string;
        tokenHash: string;
        expiresAt: Date;
    }): Promise<void>;
    findValidByHash(hash: string): Promise<{
        id: string;
        userId: string;
        expiresAt: Date;
    } | null>;
    revoke(id: string): Promise<void>;
    revokeByHash(hash: string): Promise<void>;
}
interface TokenServiceInterface {
    generateAccessToken(userId: string): string;
    generateRefreshToken(userId: string): string;
    verifyRefreshToken(token: string): {
        sub: string;
    };
    getRefreshTokenExpiresInMs(): number;
}
interface TransactionManagerInterface {
    runInTransaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}
interface AuthHooks<TUser extends AuthUser> {
    beforeLogin?: (user: TUser) => void | Promise<void>;
    beforeRegister?: (email: string, username: string) => void | Promise<void>;
    afterRegister?: (user: TUser) => void | Promise<void>;
}
interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    path?: string;
    domain?: string;
}
interface AuthConfig {
    cookieOptions?: {
        accessToken?: CookieOptions;
        refreshToken?: CookieOptions;
    };
    tokenNames?: {
        accessToken?: string;
        refreshToken?: string;
    };
    tokenExpiresIn?: {
        accessToken?: string | number;
        refreshToken?: string | number;
    };
}

declare class LoginEmailUseCase<TUser extends AuthUser> {
    private readonly userRepoReader;
    private readonly bcrypter;
    private readonly hooks;
    constructor(userRepoReader: UserRepoReader<TUser>, bcrypter: BcryptInterface, hooks?: AuthHooks<TUser>);
    execute(email: string, password: string): Promise<TUser>;
}

interface AuthCoreDependencies<TUser extends AuthUser> {
    tokenRepo: RefreshTokenRepoInterface;
    jwtService: TokenServiceInterface;
    txManager: TransactionManagerInterface;
    userRepoReaderFactory: (client: any) => UserRepoReader<TUser>;
    userRepoWriterFactory: (client: any) => UserRepoWriter<TUser>;
    bcrypter: BcryptInterface;
    emailSender: EmailSenderInterface;
    emailVerificationRepoFactory: (client: any) => EmailVerificationInterface;
    hooks?: AuthHooks<TUser>;
    config?: AuthConfig;
}
declare class AuthCore<TUser extends AuthUser> {
    private deps;
    constructor(deps: AuthCoreDependencies<TUser>);
    register(username: string, email: string, password: string, verificationPath?: string): Promise<{
        user: TUser;
    }>;
    verifyEmail(token: string): Promise<void>;
    loginByEmail(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: TUser;
    }>;
    loginByUsername(username: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: TUser;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: TUser;
    }>;
    logout(refreshToken: string): Promise<void>;
    generateTokens(userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getCookieOptions(): {
        accessToken: CookieOptions;
        refreshToken: CookieOptions;
        names: {
            accessToken: string;
            refreshToken: string;
        };
    };
}

declare class TokenServiceJWT implements TokenServiceInterface {
    private readonly secret;
    private readonly accessTokenExpiresIn;
    private readonly refreshTokenExpiresIn;
    constructor(secret: string, options?: {
        accessTokenExpiresIn?: string | number;
        refreshTokenExpiresIn?: string | number;
    });
    generateAccessToken(userId: string): string;
    generateRefreshToken(userId: string): string;
    verifyRefreshToken(token: string): {
        sub: string;
    };
    getRefreshTokenExpiresInMs(): number;
}

declare class RefreshUseCase<TUser extends AuthUser> {
    private readonly userRepoReader;
    private readonly refreshRepo;
    private readonly jwtService;
    private readonly hooks;
    constructor(userRepoReader: UserRepoReader<TUser>, refreshRepo: RefreshTokenRepoInterface, jwtService: TokenServiceInterface, hooks?: AuthHooks<TUser>);
    execute(refreshToken: string): Promise<TUser>;
}

declare class RefreshTokenRepoPg implements RefreshTokenRepoInterface {
    private readonly client;
    constructor(client: PoolClient);
    create(data: {
        id: string;
        userId: string;
        tokenHash: string;
        expiresAt: Date;
    }): Promise<void>;
    findValidByHash(hash: string): Promise<{
        id: string;
        userId: string;
        expiresAt: Date;
    } | null>;
    revoke(id: string): Promise<void>;
    revokeByHash(hash: string): Promise<void>;
}

declare class LoginUsernameUseCase<TUser extends AuthUser> {
    private readonly userRepoReader;
    private readonly bcrypter;
    private readonly hooks;
    constructor(userRepoReader: UserRepoReader<TUser>, bcrypter: BcryptInterface, hooks?: AuthHooks<TUser>);
    execute(username: string, password: string): Promise<TUser>;
}

declare class RegisterUseCase<TUser extends AuthUser> {
    private readonly userRepoReader;
    private readonly userRepoWriter;
    private readonly bcrypter;
    private readonly emailSender;
    private readonly emailVerificationRepo;
    private readonly hooks;
    constructor(userRepoReader: UserRepoReader<TUser>, userRepoWriter: UserRepoWriter<TUser>, bcrypter: BcryptInterface, emailSender: EmailSenderInterface, emailVerificationRepo: EmailVerificationInterface, hooks?: AuthHooks<TUser>);
    execute(username: string, email: string, password: string, verificationPath: string): Promise<TUser>;
}

declare class VerifyEmailUseCase<TUser extends AuthUser> {
    private readonly verificationRepo;
    private readonly userRepoWriter;
    constructor(verificationRepo: EmailVerificationInterface, userRepoWriter: UserRepoWriter<TUser>);
    execute(rawToken: string): Promise<void>;
}

declare class BcryptAdapter implements BcryptInterface {
    private readonly saltRounds;
    constructor(saltRounds?: number);
    hash(data: string): Promise<string>;
    compare(data: string, encrypted: string): Promise<boolean>;
}

declare class ConsoleEmailSender implements EmailSenderInterface {
    sendVerificationEmail(email: string, token: string, path: string, type: string): Promise<void>;
}

declare class InMemoryRefreshTokenRepo implements RefreshTokenRepoInterface {
    private tokens;
    create(data: {
        id: string;
        userId: string;
        tokenHash: string;
        expiresAt: Date;
    }): Promise<void>;
    findValidByHash(hash: string): Promise<{
        id: string;
        userId: string;
        expiresAt: Date;
    } | null>;
    revoke(id: string): Promise<void>;
    revokeByHash(hash: string): Promise<void>;
}

declare class CookieHelper {
    private static readonly DEFAULT_ACCESS_TOKEN_AGE;
    private static readonly DEFAULT_REFRESH_TOKEN_AGE;
    static getAccessTokenOptions(config?: AuthConfig): CookieOptions;
    static getRefreshTokenOptions(config?: AuthConfig): CookieOptions;
    static getTokenNames(config?: AuthConfig): {
        accessToken: string;
        refreshToken: string;
    };
}

export { type AuthConfig, AuthCore, type AuthCoreDependencies, type AuthHooks, type AuthUser, BcryptAdapter, type BcryptInterface, ConsoleEmailSender, CookieHelper, type CookieOptions, DomainError, Email, EmailAlreadyExistsError, type EmailSenderInterface, type EmailVerificationInterface, InMemoryRefreshTokenRepo, InvalidCredentialsError, InvalidEmailError, InvalidPasswordError, InvalidTokenError, InvalidUsernameError, LoginEmailUseCase, LoginUsernameUseCase, Password, type RefreshTokenRepoInterface, RefreshTokenRepoPg, RefreshUseCase, RegisterUseCase, TokenExpiredError, type TokenServiceInterface, TokenServiceJWT, type TransactionManagerInterface, UserNotFoundError, type UserRepoReader, type UserRepoWriter, Username, UsernameAlreadyExistsError, VerifyEmailUseCase };
