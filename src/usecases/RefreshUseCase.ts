import { 
    AuthUser, UserRepoReader, RefreshTokenRepoInterface, 
    TokenServiceInterface, AuthHooks 
} from '../ports/interfaces';
import { InvalidTokenError, UserNotFoundError } from '../domain/errors';
import { sha256 } from 'js-sha256';

export class RefreshUseCase<TUser extends AuthUser> {
    constructor(
        private readonly userRepoReader: UserRepoReader<TUser>,
        private readonly refreshRepo: RefreshTokenRepoInterface,
        private readonly jwtService: TokenServiceInterface,
        private readonly hooks: AuthHooks<TUser> = {}
    ) {}

    async execute(refreshToken: string) {
        const payload = this.jwtService.verifyRefreshToken(refreshToken);
        const hashed = sha256(refreshToken);

        const existingToken = await this.refreshRepo.findValidByHash(hashed);
        if (!existingToken) throw new InvalidTokenError("Invalid refresh token");
        if (existingToken.expiresAt < new Date()) throw new InvalidTokenError("Refresh token expired");

        const user = await this.userRepoReader.getUserById(payload.sub);
        if (!user) throw new UserNotFoundError("User not found");

        if (this.hooks.beforeLogin) {
            await this.hooks.beforeLogin(user);
        }

        await this.refreshRepo.revoke(existingToken.id);
        
        return user;
    }
}