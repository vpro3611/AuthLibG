import { InvalidEmailError } from './errors';

export class Email {
    private constructor(private readonly value: string) {}
    private static readonly PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    static create(rawEmail: string): Email {
        const normalized = rawEmail.toLowerCase().trim();
        if (normalized.length < 5 || normalized.length > 255 || !this.PATTERN.test(normalized)) {
            throw new InvalidEmailError(`Invalid email format: ${normalized}`);
        }
        return new Email(normalized);
    }
    getValue(): string { return this.value; }
}