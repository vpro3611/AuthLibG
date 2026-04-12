import { InvalidUsernameError } from './errors';

export class Username {
    private constructor(private readonly value: string) {}
    static create(rawUsername: string): Username {
        const normalized = rawUsername.trim();
        if (normalized.length < 3 || normalized.length > 255) {
            throw new InvalidUsernameError(`Username must be between 3 and 255 characters`);
        }
        return new Username(normalized);
    }
    getValue(): string { return this.value; }
}