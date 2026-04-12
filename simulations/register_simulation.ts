import { 
    AuthCore, 
    BcryptAdapter, 
    TokenServiceJWT, 
    InMemoryRefreshTokenRepo, 
    ConsoleEmailSender,
    AuthUser
} from '../src';

// 1. Define our User entity for this simulation
class AppUser implements AuthUser {
    constructor(
        public id: string,
        public username: string,
        public email: string,
        public passwordHash: string,
        public isVerified: boolean = false
    ) {}
    getId() { return this.id; }
    getPasswordHash() { return this.passwordHash; }
}

// 2. Setup In-Memory storage for Users and Verification Tokens
const userDatabase = new Map<string, AppUser>();
const verificationTokens = new Map<string, any>();

// 3. Initialize AuthCore with default adapters
const authCore = new AuthCore<AppUser>({
    jwtService: new TokenServiceJWT('simulation-secret-key'),
    bcrypter: new BcryptAdapter(),
    tokenRepo: new InMemoryRefreshTokenRepo(),
    txManager: { runInTransaction: async (cb) => cb({}) },
    
    userRepoReaderFactory: () => ({
        getUserById: async (id) => userDatabase.get(id) || null,
        getUserByEmail: async (email) => Array.from(userDatabase.values()).find(u => u.email === email) || null,
        getUserByUsername: async (username) => Array.from(userDatabase.values()).find(u => u.username === username) || null,
    }),
    
    userRepoWriterFactory: () => ({
        save: async (data: any) => {
            const newUser = new AppUser(Math.random().toString(36).substr(2, 9), data.username, data.email, data.passwordHash);
            userDatabase.set(newUser.id, newUser);
            console.log(`[DB] Saved new user: ${newUser.username} (${newUser.id})`);
            return newUser;
        },
        markAsVerified: async (userId: string) => {
            const user = userDatabase.get(userId);
            if (user) {
                user.isVerified = true;
                console.log(`[DB] User ${userId} marked as VERIFIED`);
            }
        }
    }),
    
    emailSender: new ConsoleEmailSender(),
    
    emailVerificationRepoFactory: () => ({
        deleteByUserIdAndType: async () => {},
        saveToken: async (data) => {
            verificationTokens.set(data.tokenHash, data);
            console.log(`[DB] Saved verification token record`);
        },
        findByTokenHash: async (hash) => {
            return verificationTokens.get(hash) || null;
        },
        deleteByTokenHash: async (hash) => {
            verificationTokens.delete(hash);
            console.log(`[DB] Deleted verification token record`);
        }
    })
});

async function runRegistrationSimulation() {
    console.log('--- STARTING REGISTRATION + VERIFICATION SIMULATION ---');
    
    try {
        // STEP 1: REGISTER
        console.log('Action: Registering user "johndoe"...');
        const { user } = await authCore.register('johndoe', 'john@example.com', 'SecurePass123!');
        
        console.log(`Initial DB State: isVerified =`, userDatabase.get(user.id)?.isVerified);

        // STEP 2: EXTRACT TOKEN (Simulation: getting token from "email")
        // In reality, the user clicks the link in their email. 
        // Our ConsoleEmailSender logged the rawToken. For this simulation, we'll find it in our mock token repo.
        const tokenRecord = Array.from(verificationTokens.values())[0];
        console.log('\nAction: Simulating user clicking email link...');
        
        // We need the RAW token, but our mock repo stores the HASH. 
        // In a real scenario, the raw token is in the URL.
        // Let's monkeypatch the email sender to capture the raw token for this test.
        // Since we already ran register, let's just cheat and use a known token for simulation purposes
        // or re-run with a captured token.
        
        console.log('Note: To keep it simple, we will directly verify using the simulation logic.');
        
        // For the sake of simulation, let's just trigger verification. 
        // To do it "properly" we'd need to capture the raw token from the ConsoleEmailSender output.
        // Let's assume the raw token was "captured-token-123" by modifying how we register.
    } catch (error: any) {
        console.error('Result: Failed!', error.message);
    }
}

// Improved Simulation with Token Capture
async function runFullFlow() {
    let capturedRawToken = '';
    
    // Override email sender just to capture the token
    (authCore as any).deps.emailSender = {
        sendVerificationEmail: async (email: string, token: string) => {
            capturedRawToken = token;
            console.log(`[Simulation] Captured raw token from "email": ${token}`);
        }
    };

    console.log('\n--- FULL FLOW: REGISTER -> VERIFY -> LOGIN ---');
    
    // 1. Register
    const { user } = await authCore.register('testuser', 'test@test.com', 'Password123!!!');
    console.log(`User created. isVerified: ${userDatabase.get(user.id)?.isVerified}`);

    // 2. Verify
    console.log(`Action: Verifying email with token ${capturedRawToken}...`);
    await authCore.verifyEmail(capturedRawToken);
    console.log(`Result: isVerified after verification: ${userDatabase.get(user.id)?.isVerified}`);

    // 3. Login Options / Cookies
    console.log('\n--- COOKIE CONFIGURATION CHECK ---');
    const options = authCore.getCookieOptions();
    console.log('Generated Cookie Options:', JSON.stringify(options, null, 2));

    console.log('\n--- FULL FLOW COMPLETE ---');
}

runFullFlow();
