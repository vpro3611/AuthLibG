import express from 'express';
import { 
    AuthCore, 
    TokenServiceJWT, 
    InMemoryRefreshTokenRepo,
    BcryptAdapter
} from '../src';

/**
 * This is a minimal example showing how to integrate AuthLibG with an Express app.
 */

const app = express();
app.use(express.json());

// 1. Setup your library instance (usually in a separate container/file)
const auth = new AuthCore({
    jwtService: new TokenServiceJWT('your-secret'),
    tokenRepo: new InMemoryRefreshTokenRepo(),
    txManager: { runInTransaction: async (cb) => cb({}) }, // Dummy for example
    userRepoReaderFactory: () => ({ /* your reader impl */ } as any),
    userRepoWriterFactory: () => ({ /* your writer impl */ } as any),
    emailVerificationRepoFactory: () => ({ /* your verif impl */ } as any),
    // emailSender and bcrypter will use defaults if not provided
});

// 2. Registration Route
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Pass the path where your frontend handles email verification
        await auth.register(username, email, password, '/verify-email');
        
        res.status(201).json({ message: 'User registered. Please check your email.' });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// 3. Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await auth.loginByEmail(email, password);
        
        // Get secure cookie options from the library
        const options = auth.getCookieOptions();
        
        res.cookie(options.names.accessToken, result.accessToken, options.accessToken);
        res.cookie(options.names.refreshToken, result.refreshToken, options.refreshToken);
        
        res.json({ user: result.user });
    } catch (e: any) {
        res.status(401).json({ error: e.message });
    }
});

app.listen(3000, () => console.log('Auth Example listening on port 3000'));
