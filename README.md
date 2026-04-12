# auth-core-lib

A framework-agnostic, robust authentication core library for Node.js. Extract your business logic from Express/Fastify and keep your auth flow clean, testable, and reusable.

## Features
- **Framework Agnostic**: Works with Express, Fastify, NestJS, etc.
- **ORM Agnostic**: You provide the repository adapters.
- **Hook System**: Run application-specific rules (like checking `isBanned` or `isVerified`) without polluting the auth logic.
- **Batteries Included**: Comes with `BcryptAdapter`, `ConsoleEmailSender`, and `InMemoryRefreshTokenRepo` for quick prototyping, and a PostgreSQL adapter for production.

## Installation

```bash
npm install auth-core-lib
```

## Quick Start

```typescript
import { AuthCore, BcryptAdapter, TokenServiceJWT, InMemoryRefreshTokenRepo } from 'auth-core-lib';

const authCore = new AuthCore({
    jwtService: new TokenServiceJWT('my-super-secret-key'),
    bcrypter: new BcryptAdapter(),
    tokenRepo: new InMemoryRefreshTokenRepo(),
    txManager: { runInTransaction: async (cb) => cb({}) }, // Dummy tx manager
    userRepoReaderFactory: () => myAppUserReader,
    userRepoWriterFactory: () => myAppUserWriter,
    emailSender: new ConsoleEmailSender(),
    emailVerificationRepoFactory: () => myAppEmailVerifRepo,
    hooks: {
        beforeLogin: (user) => {
            if (user.isBanned) throw new Error("User is banned!");
        }
    }
});

// Using it in your controller:
app.post('/login', async (req, res) => {
    try {
        const { user, accessToken, refreshToken } = await authCore.loginByEmail(req.body.email, req.body.password);
        res.json({ accessToken, refreshToken });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
```