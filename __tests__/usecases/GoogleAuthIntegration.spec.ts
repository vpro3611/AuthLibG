import { LoginGoogleUseCase } from '../../src/usecases/LoginGoogleUseCase';
import { UserRepoReader, UserRepoWriter, GoogleTokenVerifierInterface, AuthUser, AuthHooks } from '../../src/ports/interfaces';
import { Email } from '../../src/domain/Email';

class MockUser implements AuthUser {
    constructor(private id: string, private email: string, private googleId?: string) {}
    getId() { return this.id; }
    getPasswordHash() { return 'hashed'; }
    getEmail() { return this.email; }
    getGoogleId() { return this.googleId; }
}

describe('GoogleAuth Integration - Serious Tests', () => {
    let users: MockUser[] = [];
    let reader: UserRepoReader<MockUser>;
    let writer: UserRepoWriter<MockUser>;
    let verifier: jest.Mocked<GoogleTokenVerifierInterface>;
    let hooks: AuthHooks<MockUser>;
    let useCase: LoginGoogleUseCase<MockUser>;

    beforeEach(() => {
        users = [
            new MockUser('1', 'existing@example.com'),
            new MockUser('2', 'linked@example.com', 'google-linked'),
        ];

        reader = {
            getUserById: async (id) => users.find(u => u.getId() === id) || null,
            getUserByEmail: async (email) => users.find(u => u.getEmail() === email) || null,
            getUserByUsername: async () => null,
            getUserByGoogleId: async (googleId) => users.find(u => u.getGoogleId() === googleId) || null,
        };

        writer = {
            save: async (data: any) => {
                const newUser = new MockUser(Math.random().toString(), data.email, data.googleId);
                users.push(newUser);
                return newUser;
            },
            linkGoogleId: async (userId, googleId) => {
                const user = users.find(u => u.getId() === userId);
                if (user) {
                    (user as any).googleId = googleId;
                }
            },
            markAsVerified: async () => {},
        };

        verifier = {
            verify: jest.fn(),
        };

        hooks = {
            beforeLogin: jest.fn(),
            afterRegister: jest.fn(),
        };

        useCase = new LoginGoogleUseCase(reader, writer, verifier, hooks);
    });

    it('should login an existing Google user and trigger beforeLogin hook', async () => {
        verifier.verify.mockResolvedValue({ sub: 'google-linked', email: 'linked@example.com' });
        
        const user = await useCase.execute('valid-token');
        
        expect(user.getId()).toBe('2');
        expect(hooks.beforeLogin).toHaveBeenCalledWith(user);
        expect(hooks.afterRegister).not.toHaveBeenCalled();
    });

    it('should link a Google account to an existing email-only account and trigger beforeLogin', async () => {
        verifier.verify.mockResolvedValue({ sub: 'google-new', email: 'existing@example.com' });
        
        const user = await useCase.execute('valid-token');
        
        expect(user.getId()).toBe('1');
        expect(user.getGoogleId()).toBe('google-new');
        expect(hooks.beforeLogin).toHaveBeenCalledWith(user);
        expect(hooks.afterRegister).not.toHaveBeenCalled();
    });

    it('should register a new user via Google and trigger afterRegister hook', async () => {
        verifier.verify.mockResolvedValue({ sub: 'google-brand-new', email: 'new@example.com', name: 'New User' });
        
        const user = await useCase.execute('valid-token');
        
        expect(user.getEmail()).toBe('new@example.com');
        expect(user.getGoogleId()).toBe('google-brand-new');
        expect(hooks.afterRegister).toHaveBeenCalledWith(user);
        expect(hooks.beforeLogin).not.toHaveBeenCalled();
    });

    it('should fail if Google token verification fails', async () => {
        verifier.verify.mockRejectedValue(new Error('Invalid Google Token'));
        
        await expect(useCase.execute('invalid-token')).rejects.toThrow('Invalid Google Token');
        expect(hooks.beforeLogin).not.toHaveBeenCalled();
        expect(hooks.afterRegister).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
        verifier.verify.mockResolvedValue({ sub: 'google-error', email: 'error@example.com' });
        jest.spyOn(writer, 'save').mockRejectedValue(new Error('DB Connection Failed'));
        
        await expect(useCase.execute('valid-token')).rejects.toThrow('DB Connection Failed');
    });
});
