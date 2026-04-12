import { LoginUsernameUseCase } from '../../src/usecases/LoginUsernameUseCase';
import { AuthUser, UserRepoReader, BcryptInterface } from '../../src/ports/interfaces';

class MockUser implements AuthUser {
    getId() { return '1'; }
    getPasswordHash() { return 'hashed'; }
}

const mockRepoReader: UserRepoReader<MockUser> = {
    getUserById: async () => null,
    getUserByEmail: async () => null,
    getUserByUsername: async (u) => u === 'user123' ? new MockUser() : null,
};

const mockBcrypt: BcryptInterface = {
    hash: async () => 'hash',
    compare: async (p, h) => p === 'StrongPass123!' && h === 'hashed',
};

describe('LoginUsernameUseCase', () => {
    it('should login successfully', async () => {
        const useCase = new LoginUsernameUseCase(mockRepoReader, mockBcrypt, {});
        const user = await useCase.execute('user123', 'StrongPass123!');
        expect(user.getId()).toBe('1');
    });

    it('should fail on invalid username format', async () => {
        const useCase = new LoginUsernameUseCase(mockRepoReader, mockBcrypt, {});
        await expect(useCase.execute('ab', 'StrongPass123!')).rejects.toThrow();
    });
});