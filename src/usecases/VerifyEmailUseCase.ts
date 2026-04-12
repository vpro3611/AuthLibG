import { EmailVerificationInterface, UserRepoWriter, AuthUser } from '../ports/interfaces';
import { InvalidTokenError } from '../domain/errors';
import * as crypto from 'crypto';

export class VerifyEmailUseCase<TUser extends AuthUser> {
    constructor(
        private readonly verificationRepo: EmailVerificationInterface,
        private readonly userRepoWriter: UserRepoWriter<TUser>
    ) {}

    async execute(rawToken: string): Promise<void> {
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const record = await this.verificationRepo.findByTokenHash(tokenHash);

        if (!record) {
            throw new InvalidTokenError('Invalid or expired token');
        }

        if (record.expiresAt < new Date()) {
            await this.verificationRepo.deleteByTokenHash(tokenHash);
            throw new InvalidTokenError('Token expired');
        }

        if (record.tokenType !== 'register') {
            throw new InvalidTokenError('Invalid token type');
        }

        await this.userRepoWriter.markAsVerified(record.userId);
        await this.verificationRepo.deleteByTokenHash(tokenHash);
    }
}
