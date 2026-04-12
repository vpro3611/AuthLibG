import { AuthUser, UserRepoReader, BcryptInterface, AuthHooks } from '../ports/interfaces';
import { Username } from '../domain/Username';
import { Password } from '../domain/Password';
import { InvalidCredentialsError, UserNotFoundError } from '../domain/errors';

export class LoginUsernameUseCase<TUser extends AuthUser> {
    constructor(
        private readonly userRepoReader: UserRepoReader<TUser>,
        private readonly bcrypter: BcryptInterface,
        private readonly hooks: AuthHooks<TUser> = {}
    ) {}

    async execute(username: string, password: string): Promise<TUser> {
        const usernameValid = Username.create(username);
        const passwordValid = Password.validatePlain(password);

        const user = await this.userRepoReader.getUserByUsername(usernameValid.getValue());
        if (!user) throw new UserNotFoundError('User not found');

        if (this.hooks.beforeLogin) {
            await this.hooks.beforeLogin(user);
        }

        const comparePasswords = await this.bcrypter.compare(passwordValid, user.getPasswordHash());
        if (!comparePasswords) throw new InvalidCredentialsError('Invalid credentials');

        return user;
    }
}