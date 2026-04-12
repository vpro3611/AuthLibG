import { AuthUser, UserRepoReader, UserRepoWriter, BcryptInterface, EmailSenderInterface, EmailVerificationInterface, AuthHooks } from '../ports/interfaces';
import { Username } from '../domain/Username';
import { Email } from '../domain/Email';
import { Password } from '../domain/Password';
import { UsernameAlreadyExistsError, EmailAlreadyExistsError } from '../domain/errors';
import * as crypto from 'crypto';

export class RegisterUseCase<TUser extends AuthUser> {
    constructor(
        private readonly userRepoReader: UserRepoReader<TUser>,
        private readonly userRepoWriter: UserRepoWriter<TUser>,
        private readonly bcrypter: BcryptInterface,
        private readonly emailSender: EmailSenderInterface,
        private readonly emailVerificationRepo: EmailVerificationInterface,
        private readonly hooks: AuthHooks<TUser> = {}
    ) {}

    async execute(username: string, email: string, password: string): Promise<TUser> {
        const usernameValid = Username.create(username);
        const emailValid = Email.create(email);
        const passwordValid = Password.validatePlain(password);

        if (this.hooks.beforeRegister) {
            await this.hooks.beforeRegister(emailValid.getValue(), usernameValid.getValue());
        }

        const existingUsername = await this.userRepoReader.getUserByUsername(usernameValid.getValue());
        if (existingUsername) throw new UsernameAlreadyExistsError('Username already exists');

        const existingEmail = await this.userRepoReader.getUserByEmail(emailValid.getValue());
        if (existingEmail) throw new EmailAlreadyExistsError('Email already exists');

        const passwordHash = await this.bcrypter.hash(passwordValid);

        // Save raw user data; the app's UserRepoWriter handles mapping it to the DB entity
        const user = await this.userRepoWriter.save({
            username: usernameValid.getValue(),
            email: emailValid.getValue(),
            passwordHash: passwordHash
        });

        // Verification flow
        await this.emailVerificationRepo.deleteByUserIdAndType(user.getId(), "register");
        
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await this.emailVerificationRepo.saveToken({
            id: crypto.randomUUID(),
            userId: user.getId(),
            tokenHash: tokenHash,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
            tokenType: "register"
        });

        await this.emailSender.sendVerificationEmail(emailValid.getValue(), rawToken, "/public/verify-email", "register");

        if (this.hooks.afterRegister) {
            await this.hooks.afterRegister(user);
        }

        return user;
    }
}