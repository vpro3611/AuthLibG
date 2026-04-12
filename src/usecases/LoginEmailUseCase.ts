import { AuthUser, UserRepoReader, BcryptInterface, AuthHooks } from '../ports/interfaces';
import { Email } from '../domain/Email';
import { Password } from '../domain/Password';
import { InvalidCredentialsError, UserNotFoundError } from '../domain/errors';

export class LoginEmailUseCase<TUser extends AuthUser> {
    constructor(
        private readonly userRepoReader: UserRepoReader<TUser>,
        private readonly bcrypter: BcryptInterface,
        private readonly hooks: AuthHooks<TUser> = {}
    ) {}

    async execute(email: string, password: string): Promise<TUser> {
        const emailValid = Email.create(email);
        const passwordValid = Password.validatePlain(password);

        const user = await this.userRepoReader.getUserByEmail(emailValid.getValue());
        if (!user) {
            throw new UserNotFoundError('User not found');
        }

        if (this.hooks.beforeLogin) {
            await this.hooks.beforeLogin(user);
        }

        const comparePasswords = await this.bcrypter.compare(passwordValid, user.getPasswordHash());
        if (!comparePasswords) {
            throw new InvalidCredentialsError('Invalid credentials');
        }

        return user;
    }
}