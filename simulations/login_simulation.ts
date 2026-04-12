import { 
    AuthCore, 
    BcryptAdapter, 
    TokenServiceJWT, 
    InMemoryRefreshTokenRepo, 
    AuthUser
} from '../src';

class AppUser implements AuthUser {
    constructor(
        public id: string,
        public email: string,
        public passwordHash: string,
        public isVerified: boolean
    ) {}
    getId() { return this.id; }
    getPasswordHash() { return this.passwordHash; }
}

async function runLoginSimulation() {
    console.log('--- STARTING LOGIN SIMULATION ---');

    // 1. Pre-populate DB with a hashed password
    const bcrypter = new BcryptAdapter();
    const hashedPassword = await bcrypter.hash('StrongPass123!');
    
    const verifiedUser = new AppUser('user-123', 'verified@example.com', hashedPassword, true);
    const unverifiedUser = new AppUser('user-456', 'unverified@example.com', hashedPassword, false);
    
    const userDatabase = new Map<string, AppUser>([
        [verifiedUser.id, verifiedUser],
        [unverifiedUser.id, unverifiedUser]
    ]);

    // 2. Initialize AuthCore with a Hook to enforce verification
    const authCore = new AuthCore<AppUser>({
        jwtService: new TokenServiceJWT('simulation-secret-key'),
        bcrypter: bcrypter,
        tokenRepo: new InMemoryRefreshTokenRepo(),
        txManager: { runInTransaction: async (cb) => cb({}) },
        userRepoReaderFactory: () => ({
            getUserById: async (id) => userDatabase.get(id) || null,
            getUserByEmail: async (email) => Array.from(userDatabase.values()).find(u => u.email === email) || null,
            getUserByUsername: async () => null,
        }),
        userRepoWriterFactory: () => ({} as any),
        emailSender: {} as any,
        emailVerificationRepoFactory: () => ({} as any),
        
        hooks: {
            beforeLogin: (user) => {
                console.log(`[Hook] Checking if user ${user.email} is verified...`);
                if (!user.isVerified) {
                    throw new Error('USER_NOT_VERIFIED');
                }
                console.log('[Hook] User is verified. Proceeding.');
            }
        }
    });

    // SCENARIO 1: Successful Login
    console.log('\nScenario 1: Logging in with verified account...');
    try {
        const { accessToken } = await authCore.loginByEmail('verified@example.com', 'StrongPass123!');
        console.log('Result: Login Successful! Access Token generated.');
    } catch (e: any) {
        console.log('Result: Login Failed!', e.message);
    }

    // SCENARIO 2: Wrong Password
    console.log('\nScenario 2: Logging in with wrong password...');
    try {
        await authCore.loginByEmail('verified@example.com', 'WrongPassword!!!');
    } catch (e: any) {
        console.log('Result: Login Failed as expected!', e.constructor.name); // Should be InvalidCredentialsError
    }

    // SCENARIO 3: Hook Rejection (Unverified)
    console.log('\nScenario 3: Logging in with unverified account...');
    try {
        await authCore.loginByEmail('unverified@example.com', 'StrongPass123!');
    } catch (e: any) {
        console.log('Result: Login Rejected by Hook!', e.message);
    }

    console.log('\n--- LOGIN SIMULATION COMPLETE ---');
}

runLoginSimulation();