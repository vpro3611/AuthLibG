import { InvalidPasswordError } from './errors';

export class Password {
    private constructor(private readonly hash: string) {}
    private static readonly PATTERN = /^(?=.{12,255}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).*$/;

    static validatePlain(password: string): string {
        if (password.length < 12 || password.length > 255 || !this.PATTERN.test(password)) {
            throw new InvalidPasswordError('Password does not meet complexity requirements');
        }
        return password;
    }
    static fromHash(hash: string): Password { return new Password(hash); }
    getHash(): string { return this.hash; }
}