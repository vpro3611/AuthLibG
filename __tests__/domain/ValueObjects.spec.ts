import { Email } from '../../src/domain/Email';
import { Username } from '../../src/domain/Username';
import { Password } from '../../src/domain/Password';
import { DomainError } from '../../src/domain/errors';

describe('Value Objects', () => {
    it('creates a valid email', () => {
        const email = Email.create('test@example.com');
        expect(email.getValue()).toBe('test@example.com');
    });
    
    it('fails on invalid email', () => {
        expect(() => Email.create('invalid')).toThrow(DomainError);
    });

    it('creates a valid username', () => {
        const username = Username.create('user123');
        expect(username.getValue()).toBe('user123');
    });

    it('fails on short username', () => {
        expect(() => Username.create('ab')).toThrow(DomainError);
    });

    it('validates a strong password', () => {
        const pass = Password.validatePlain('StrongPass123!');
        expect(pass).toBe('StrongPass123!');
    });

    it('fails on weak password', () => {
        expect(() => Password.validatePlain('weak')).toThrow(DomainError);
    });
});