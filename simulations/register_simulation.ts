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
        }
    }),
    
    emailSender: new ConsoleEmailSender(),
    
    emailVerificationRepoFactory: () => ({
        deleteByUserIdAndType: async () => {},
        saveToken: async (data) => {
            verificationTokens.set(data.userId, data);
            console.log(`[DB] Saved verification token for user ${data.userId}`);
        }
    })
});

async function runRegistrationSimulation() {
    console.log('--- STARTING REGISTRATION SIMULATION ---');
    
    try {
        console.log('Action: Registering user "johndoe"...');
        const { user } = await authCore.register('johndoe', 'john@example.com', 'SecurePass123!');
        
        console.log('Result: Success!');
        console.log(`User in DB:`, userDatabase.get(user.id));
        console.log('--- REGISTRATION SIMULATION COMPLETE ---');
    } catch (error: any) {
        console.error('Result: Failed!', error.message);
    }
}

runRegistrationSimulation();