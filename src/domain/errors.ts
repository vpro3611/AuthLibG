export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
export class InvalidEmailError extends DomainError {}
export class InvalidUsernameError extends DomainError {}
export class InvalidPasswordError extends DomainError {}
export class InvalidTokenError extends DomainError {}
export class TokenExpiredError extends DomainError {}
export class UserNotFoundError extends DomainError {}
export class InvalidCredentialsError extends DomainError {}
export class UsernameAlreadyExistsError extends DomainError {}
export class EmailAlreadyExistsError extends DomainError {}