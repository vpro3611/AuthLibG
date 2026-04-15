import { LoginEmailUseCase } from '../../src/usecases/LoginEmailUseCase';
import { AuthUser, UserRepoReader, BcryptInterface, AuthHooks } from '../../src/ports/interfaces';

class MockUser implements AuthUser {
    getId() { return '1'; }
    getPasswordHash() { return 'hashed'; }
    isActive = true;
}

const mockRepoReader: UserRepoReader<MockUser> = {
    getUserById: async () => null,
    getUserByUsername: async () => null,
    getUserByEmail: async (e) => e === 'test@example.com' ? new MockUser() : null,
    getUserByGoogleId: async () => null,
};

const mockBcrypt: BcryptInterface = {
    hash: async () => 'hash',
    compare: async (p, h) => p === 'StrongPass123!' && h === 'hashed',
};

describe('LoginEmailUseCase', () => {
    it('should login successfully and run hooks', async () => {
        let hookRan = false;
        const hooks: AuthHooks<MockUser> = {
            beforeLogin: (u) => { hookRan = true; if (!u.isActive) throw new Error("Banned"); }
        };
        const useCase = new LoginEmailUseCase(mockRepoReader, mockBcrypt, hooks);
        
        const user = await useCase.execute('test@example.com', 'StrongPass123!');
        expect(user.getId()).toBe('1');
        expect(hookRan).toBe(true);
    });

    it('should fail on invalid credentials', async () => {
        const useCase = new LoginEmailUseCase(mockRepoReader, mockBcrypt, {});
        await expect(useCase.execute('test@example.com', 'WrongPass123!')).rejects.toThrow();
    });
});
