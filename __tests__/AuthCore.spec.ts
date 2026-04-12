import { AuthCore, AuthCoreDependencies } from '../src/AuthCore';
import { AuthUser, UserRepoReader, BcryptInterface, RefreshTokenRepoInterface, TokenServiceInterface, TransactionManagerInterface } from '../src/ports/interfaces';
import { InvalidCredentialsError, InvalidTokenError } from '../src/domain/errors';

// Dummy User Implementation
class DummyUser implements AuthUser {
    constructor(
        public id: string,
        public email: string,
        private passwordHash: string,
        public isBanned: boolean = false,
        public isVerified: boolean = true
    ) {}

    getId(): string { return this.id; }
    getPasswordHash(): string { return this.passwordHash; }
}

// Dummy Implementations for Ports
const dummyBcrypt: BcryptInterface = {
    hash: async (data: string) => data + '_hashed',
    compare: async (data: string, encrypted: string) => data + '_hashed' === encrypted
};

const dummyTokenRepo: RefreshTokenRepoInterface = {
    create: async () => {},
    findValidByHash: async (hash: string) => {
        if (hash === 'valid_hash') return { id: '1', userId: 'user1', expiresAt: new Date(Date.now() + 10000) };
        return null;
    },
    revoke: async () => {},
    revokeByHash: async () => {}
};

const dummyJwtService: TokenServiceInterface = {
    generateAccessToken: () => 'access_token',
    generateRefreshToken: () => 'refresh_token',
    verifyRefreshToken: (token: string) => {
        if (token === 'valid_refresh') return { sub: 'user1' };
        throw new InvalidTokenError('Invalid token');
    },
    getRefreshTokenExpiresInMs: () => 604800000,
};

const dummyTxManager: TransactionManagerInterface = {
    runInTransaction: async <T>(cb: (client: any) => Promise<T>): Promise<T> => cb({}) // mock client
};

// Mock sha256 to return predictable hash for tests
jest.mock('js-sha256', () => ({
    sha256: (data: string) => {
        if (data === 'valid_refresh') return 'valid_hash';
        return 'hash_of_' + data;
    }
}));

describe('AuthCore Integration Dummies', () => {
    let dummyUsers: DummyUser[];
    let userRepoReader: UserRepoReader<DummyUser>;

    beforeEach(() => {
        dummyUsers = [
            new DummyUser('user1', 'good@example.com', 'StrongPass123!_hashed'),
            new DummyUser('user2', 'banned@example.com', 'StrongPass123!_hashed', true, true),
            new DummyUser('user3', 'unverified@example.com', 'StrongPass123!_hashed', false, false),
        ];

        userRepoReader = {
            getUserById: async (id: string) => dummyUsers.find(u => u.id === id) || null,
            getUserByUsername: async () => null,
            getUserByEmail: async (email: string) => dummyUsers.find(u => u.email === email) || null
        };
    });

    const createAuthCore = (hooks = {}) => {
        const deps: AuthCoreDependencies<DummyUser> = {
            tokenRepo: dummyTokenRepo,
            jwtService: dummyJwtService,
            txManager: dummyTxManager,
            userRepoReaderFactory: () => userRepoReader,
            userRepoWriterFactory: () => ({ save: async () => dummyUsers[0], markAsVerified: async () => {} }),
            emailSender: { sendVerificationEmail: async () => {} },
            emailVerificationRepoFactory: () => ({ 
                deleteByUserIdAndType: async () => {}, 
                saveToken: async () => {},
                findByTokenHash: async () => null,
                deleteByTokenHash: async () => {}
            }),
            bcrypter: dummyBcrypt,
            hooks
        };
        return new AuthCore<DummyUser>(deps);
    };

    // Dummy 1: Successful Login
    it('1. Should login successfully with correct credentials', async () => {
        const authCore = createAuthCore();
        const result = await authCore.loginByEmail('good@example.com', 'StrongPass123!');
        
        expect(result.user.getId()).toBe('user1');
        expect(result.accessToken).toBe('access_token');
        expect(result.refreshToken).toBe('refresh_token');
    });

    // Dummy 2: Login Failure (Wrong Password)
    it('2. Should throw InvalidCredentialsError on wrong password', async () => {
        const authCore = createAuthCore();
        await expect(authCore.loginByEmail('good@example.com', 'WrongPass123!'))
            .rejects.toThrow(InvalidCredentialsError);
    });

    // Dummy 3: Hook Rejects Banned User
    it('3. Should reject login if user is banned (using hooks)', async () => {
        const hooks = {
            beforeLogin: (user: DummyUser) => {
                if (user.isBanned) throw new Error('User is permanently banned from the platform');
            }
        };
        const authCore = createAuthCore(hooks);
        
        await expect(authCore.loginByEmail('banned@example.com', 'StrongPass123!'))
            .rejects.toThrow('User is permanently banned from the platform');
    });

    // Dummy 4: Hook Rejects Unverified User
    it('4. Should reject login if user is unverified (using hooks)', async () => {
        const hooks = {
            beforeLogin: (user: DummyUser) => {
                if (!user.isVerified) throw new Error('Please verify your email before logging in');
            }
        };
        const authCore = createAuthCore(hooks);
        
        await expect(authCore.loginByEmail('unverified@example.com', 'StrongPass123!'))
            .rejects.toThrow('Please verify your email before logging in');
    });

    // Dummy 5: Successful Token Refresh
    it('5. Should refresh tokens successfully', async () => {
        const hooks = {
            beforeLogin: (user: DummyUser) => {
                if (user.isBanned) throw new Error('User is banned');
            }
        };
        const authCore = createAuthCore(hooks);
        
        // Refresh with a valid refresh token mock
        const result = await authCore.refresh('valid_refresh');
        
        expect(result.user.getId()).toBe('user1');
        expect(result.accessToken).toBe('access_token');
        expect(result.refreshToken).toBe('refresh_token');
    });
});
