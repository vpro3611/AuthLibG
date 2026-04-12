import { 
    AuthUser, UserRepoReader, UserRepoWriter, BcryptInterface, 
    AuthHooks, TokenServiceInterface, RefreshTokenRepoInterface,
    TransactionManagerInterface, EmailSenderInterface, EmailVerificationInterface,
    AuthConfig
} from './ports/interfaces';
import { LoginEmailUseCase } from './usecases/LoginEmailUseCase';
import { LoginUsernameUseCase } from './usecases/LoginUsernameUseCase';
import { RegisterUseCase } from './usecases/RegisterUseCase';
import { RefreshUseCase } from './usecases/RefreshUseCase';
import { VerifyEmailUseCase } from './usecases/VerifyEmailUseCase';
import { CookieHelper } from './utils/CookieHelper';
import { BcryptAdapter } from './adapters/BcryptAdapter';
import { NodemailerAdapter } from './adapters/NodemailerAdapter';
import { sha256 } from 'js-sha256';
import * as crypto from 'crypto';

export interface AuthCoreDependencies<TUser extends AuthUser> {
    tokenRepo: RefreshTokenRepoInterface;
    jwtService: TokenServiceInterface;
    txManager: TransactionManagerInterface;
    userRepoReaderFactory: (client: any) => UserRepoReader<TUser>;
    userRepoWriterFactory: (client: any) => UserRepoWriter<TUser>;
    emailVerificationRepoFactory: (client: any) => EmailVerificationInterface;
    bcrypter?: BcryptInterface;
    emailSender?: EmailSenderInterface;
    hooks?: AuthHooks<TUser>;
    config?: AuthConfig;
}

export class AuthCore<TUser extends AuthUser> {
    private readonly bcrypter: BcryptInterface;
    private readonly emailSender: EmailSenderInterface;

    constructor(private deps: AuthCoreDependencies<TUser>) {
        this.bcrypter = deps.bcrypter || new BcryptAdapter();
        this.emailSender = deps.emailSender || new NodemailerAdapter();
    }

    async register(username: string, email: string, password: string, verificationPath: string = '/verify-email') {
        return this.deps.txManager.runInTransaction(async (client) => {
            const reader = this.deps.userRepoReaderFactory(client);
            const writer = this.deps.userRepoWriterFactory(client);
            const verifRepo = this.deps.emailVerificationRepoFactory(client);
            
            const useCase = new RegisterUseCase(
                reader, writer, this.bcrypter, 
                this.emailSender, verifRepo, this.deps.hooks
            );
            const user = await useCase.execute(username, email, password, verificationPath);
            return { user };
        });
    }

    async verifyEmail(token: string) {
        return this.deps.txManager.runInTransaction(async (client) => {
            const writer = this.deps.userRepoWriterFactory(client);
            const verifRepo = this.deps.emailVerificationRepoFactory(client);
            const useCase = new VerifyEmailUseCase(verifRepo, writer);
            await useCase.execute(token);
        });
    }

    async loginByEmail(email: string, password: string) {
        return this.deps.txManager.runInTransaction(async (client) => {
            const reader = this.deps.userRepoReaderFactory(client);
            const useCase = new LoginEmailUseCase(reader, this.bcrypter, this.deps.hooks);
            const user = await useCase.execute(email, password);
            const tokens = await this.generateTokens(user.getId());
            return { user, ...tokens };
        });
    }

    async loginByUsername(username: string, password: string) {
        return this.deps.txManager.runInTransaction(async (client) => {
            const reader = this.deps.userRepoReaderFactory(client);
            const useCase = new LoginUsernameUseCase(reader, this.bcrypter, this.deps.hooks);
            const user = await useCase.execute(username, password);
            const tokens = await this.generateTokens(user.getId());
            return { user, ...tokens };
        });
    }

    async refresh(refreshToken: string) {
        return this.deps.txManager.runInTransaction(async (client) => {
            const reader = this.deps.userRepoReaderFactory(client);
            const useCase = new RefreshUseCase(
                reader, 
                this.deps.tokenRepo, 
                this.deps.jwtService, 
                this.deps.hooks
            );
            
            const user = await useCase.execute(refreshToken);
            const tokens = await this.generateTokens(user.getId());
            
            return { user, ...tokens };
        });
    }

    async logout(refreshToken: string) {
        return this.deps.txManager.runInTransaction(async () => {
            const hashed = sha256(refreshToken);
            await this.deps.tokenRepo.revokeByHash(hashed);
        });
    }

    async generateTokens(userId: string) {
        const accessToken = this.deps.jwtService.generateAccessToken(userId);
        const refreshToken = this.deps.jwtService.generateRefreshToken(userId);
        const hashedRefreshToken = sha256(refreshToken);

        const ttl = this.deps.jwtService.getRefreshTokenExpiresInMs();

        await this.deps.tokenRepo.create({
            id: crypto.randomUUID(),
            userId: userId,
            tokenHash: hashedRefreshToken,
            expiresAt: new Date(Date.now() + ttl)
        });

        return { accessToken, refreshToken };
    }

    getCookieOptions() {
        return {
            accessToken: CookieHelper.getAccessTokenOptions(this.deps.config),
            refreshToken: CookieHelper.getRefreshTokenOptions(this.deps.config),
            names: CookieHelper.getTokenNames(this.deps.config)
        };
    }
}
