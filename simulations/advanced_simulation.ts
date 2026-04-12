import { 
    AuthCore, BcryptAdapter, TokenServiceJWT, InMemoryRefreshTokenRepo, 
    ConsoleEmailSender, AuthUser, AuthConfig 
} from '../src';

class AppUser implements AuthUser {
    constructor(public id: string, public email: string, public passwordHash: string, public isVerified: boolean = false) {}
    getId() { return this.id; }
    getPasswordHash() { return this.passwordHash; }
}

const userDatabase = new Map<string, AppUser>();
const tokenDatabase = new Map<string, any>();

// Custom Config for Cookies
const customConfig: AuthConfig = {
    cookieOptions: {
        accessToken: { maxAge: 60000, secure: true, sameSite: 'strict' },
        refreshToken: { path: '/auth/refresh' }
    },
    tokenNames: { accessToken: 'myapp_sid' }
};

const authCore = new AuthCore<AppUser>({
    jwtService: new TokenServiceJWT('adv-secret'),
    bcrypter: new BcryptAdapter(),
    tokenRepo: new InMemoryRefreshTokenRepo(),
    txManager: { runInTransaction: async (cb) => cb({}) },
    userRepoReaderFactory: () => ({
        getUserById: async (id) => userDatabase.get(id) || null,
        getUserByEmail: async (email) => Array.from(userDatabase.values()).find(u => u.email === email) || null,
        getUserByUsername: async () => null,
    }),
    userRepoWriterFactory: () => ({
        save: async (data: any) => {
            const u = new AppUser('user-'+Date.now(), 'test@test.com', data.passwordHash);
            userDatabase.set(u.id, u);
            return u;
        },
        markAsVerified: async (id) => { if(userDatabase.has(id)) userDatabase.get(id)!.isVerified = true; }
    }),
    emailSender: {
        sendVerificationEmail: async (email, token, path) => {
            console.log(`[Email] To: ${email}, Link: ${path}?token=${token}`);
        }
    },
    emailVerificationRepoFactory: () => ({
        deleteByUserIdAndType: async () => {},
        saveToken: async (data) => { tokenDatabase.set(data.tokenHash, data); },
        findByTokenHash: async (hash) => tokenDatabase.get(hash),
        deleteByTokenHash: async (hash) => { tokenDatabase.delete(hash); }
    }),
    config: customConfig
});

async function run() {
    console.log('--- ADVANCED SIMULATION: CUSTOM PATH & CONFIG ---');
    
    // 1. Register with Custom Path
    console.log('Action: Registering with custom path "/auth/confirm"...');
    await authCore.register('jesse', 'test@test.com', 'Pass123456789!', '/auth/confirm');

    // 2. Test Configuration
    const cookies = authCore.getCookieOptions();
    console.log('\nResult: Access Token Cookie Name:', cookies.names.accessToken);
    console.log('Result: Access Token MaxAge:', cookies.accessToken.maxAge);
    console.log('Result: Refresh Token Path:', cookies.refreshToken.path);

    console.log('\n--- ADVANCED SIMULATION COMPLETE ---');
}

run();
