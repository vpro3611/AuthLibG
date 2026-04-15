import { RegisterUseCase } from '../../src/usecases/RegisterUseCase';
import { AuthUser, UserRepoReader, UserRepoWriter, BcryptInterface, EmailVerificationInterface, EmailSenderInterface } from '../../src/ports/interfaces';

class MockUser implements AuthUser {
    getId() { return '1'; }
    getPasswordHash() { return 'hashed'; }
}

const mockReader: UserRepoReader<MockUser> = {
    getUserById: async () => null,
    getUserByEmail: async (e) => e === 'taken@example.com' ? new MockUser() : null,
    getUserByUsername: async (u) => u === 'taken' ? new MockUser() : null,
    getUserByGoogleId: async () => null,
};

const mockWriter: UserRepoWriter<MockUser> = {
    save: async () => new MockUser(),
    markAsVerified: async () => {},
    linkGoogleId: async () => {},
};

const mockBcrypt: BcryptInterface = {
    hash: async () => 'hashed',
    compare: async () => true,
};

const mockEmailVerif: EmailVerificationInterface = {
    deleteByUserIdAndType: async () => {},
    saveToken: async () => {},
    findByTokenHash: async () => null,
    deleteByTokenHash: async () => {}
};

const mockEmailSender: EmailSenderInterface = {
    sendVerificationEmail: async () => {},
};

describe('RegisterUseCase', () => {
    it('should register successfully', async () => {
        const useCase = new RegisterUseCase(mockReader, mockWriter, mockBcrypt, mockEmailSender, mockEmailVerif, {});
        const user = await useCase.execute('newuser', 'new@example.com', 'StrongPass123!', '/verify');
        expect(user.getId()).toBe('1');
    });

    it('should fail if email is taken', async () => {
        const useCase = new RegisterUseCase(mockReader, mockWriter, mockBcrypt, mockEmailSender, mockEmailVerif, {});
        await expect(useCase.execute('newuser', 'taken@example.com', 'StrongPass123!', '/verify')).rejects.toThrow();
    });
});
