import { AuthUser, UserRepoReader, UserRepoWriter, GoogleTokenVerifierInterface, AuthHooks } from '../ports/interfaces';
import { Email } from '../domain/Email';

export class LoginGoogleUseCase<TUser extends AuthUser> {
    constructor(
        private readonly userRepoReader: UserRepoReader<TUser>,
        private readonly userRepoWriter: UserRepoWriter<TUser>,
        private readonly googleVerifier: GoogleTokenVerifierInterface,
        private readonly hooks: AuthHooks<TUser> = {}
    ) {}

    async execute(idToken: string): Promise<TUser> {
        const googleUser = await this.googleVerifier.verify(idToken);
        const emailValid = Email.create(googleUser.email);

        let user = await this.userRepoReader.getUserByGoogleId(googleUser.sub);
        
        if (user) {
            if (this.hooks.beforeLogin) await this.hooks.beforeLogin(user);
            return user;
        }

        user = await this.userRepoReader.getUserByEmail(emailValid.getValue());

        if (user) {
            await this.userRepoWriter.linkGoogleId(user.getId(), googleUser.sub);
            if (this.hooks.beforeLogin) await this.hooks.beforeLogin(user);
            return user;
        }

        user = await this.userRepoWriter.save({
            username: googleUser.name || googleUser.email.split('@')[0],
            email: emailValid.getValue(),
            googleId: googleUser.sub,
            isVerified: true
        });

        if (this.hooks.afterRegister) await this.hooks.afterRegister(user);
        
        return user;
    }
}
