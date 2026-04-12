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
import { sha256 } from 'js-sha256';
import * as crypto from 'crypto';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export interface AuthCoreDependencies<TUser extends AuthUser> {
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

export class AuthCore<TUser extends AuthUser> {
    constructor(private deps: AuthCoreDependencies<TUser>) {}

    async register(username: string, email: string, password: string) {
        return this.deps.txManager.runInTransaction(async (client) => {
            const reader = this.deps.userRepoReaderFactory(client);
            const writer = this.deps.userRepoWriterFactory(client);
            const verifRepo = this.deps.emailVerificationRepoFactory(client);
            
            const useCase = new RegisterUseCase(
                reader, writer, this.deps.bcrypter, 
                this.deps.emailSender, verifRepo, this.deps.hooks
            );
            const user = await useCase.execute(username, email, password);
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
            const useCase = new LoginEmailUseCase(reader, this.deps.bcrypter, this.deps.hooks);
            const user = await useCase.execute(email, password);
            const tokens = await this.generateTokens(user.getId());
            return { user, ...tokens };
        });
    }

    async loginByUsername(username: string, password: string) {
        return this.deps.txManager.runInTransaction(async (client) => {
            const reader = this.deps.userRepoReaderFactory(client);
            const useCase = new LoginUsernameUseCase(reader, this.deps.bcrypter, this.deps.hooks);
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

        await this.deps.tokenRepo.create({
            id: crypto.randomUUID(),
            userId: userId,
            tokenHash: hashedRefreshToken,
            expiresAt: new Date(Date.now() + ONE_WEEK)
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
