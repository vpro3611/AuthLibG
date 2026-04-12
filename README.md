# AuthCore Library (AuthLibG)

> **A framework-agnostic, authentication core for modern Node.js applications.**

AuthLibG is a pure business-logic library that handles the heavy lifting of authentication—registration, login, JWT management, and email verification—while giving you complete control over your database schema and web framework.

---

## ⚡️ Quick Overview

### What it solves
- **Decoupled Auth Logic**: Separate your authentication rules from Express/Fastify/NestJS.
- **JWT Lifecycle**: Automated Access and Refresh token generation, hashing, and rotation.
- **Email Verification**: Built-in flow for registration confirmation.
- **Versatile Adapters**: Swap between PostgreSQL, In-Memory, or custom repositories instantly.
- **Hook System**: Run custom validation (e.g., checking if a user is banned) without touching the library code.

### What it does NOT solve
- **HTTP Routing**: You define the endpoints; the library provides the logic.
- **UI Components**: There are no login forms or buttons here.
- **User Database Schema**: You bring your own User table; the library only dictates the Refresh Token table.

---

## 🛠 Setting Up

### 1. Installation
```bash
npm install auth-core-lib
```

### 2. Database Initialization
AuthLibG requires a specific table for tracking refresh tokens. We provide a CLI tool to scaffold it for you:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
npx auth-core-init-db
```

### 3. Basic Configuration
Initialize the `AuthCore` facade with your dependencies:

```typescript
import { 
    AuthCore, 
    BcryptAdapter, 
    TokenServiceJWT, 
    InMemoryRefreshTokenRepo, 
    ConsoleEmailSender 
} from 'auth-core-lib';

const auth = new AuthCore({
    jwtService: new TokenServiceJWT('your-secure-secret', {
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '7d'
    }),
    bcrypter: new BcryptAdapter(10),
    tokenRepo: new InMemoryRefreshTokenRepo(), // Or RefreshTokenRepoPg
    txManager: myTransactionManager,
    userRepoReaderFactory: (client) => new MyUserReader(client),
    userRepoWriterFactory: (client) => new MyUserWriter(client),
    emailSender: new ConsoleEmailSender(),
    emailVerificationRepoFactory: (client) => new MyVerifRepo(client),
    hooks: {
        beforeLogin: async (user) => {
            if (user.isBanned) throw new Error("Account suspended");
        }
    }
});
```

---

## 📖 User Guide

### Authentication Flow

| Action | Method | Description |
|--------|--------|-------------|
| **Register** | `auth.register(user, email, pass, path)` | Hashes password, saves user, and sends verification email. |
| **Verify** | `auth.verifyEmail(token)` | Confirms the email token and marks user as verified. |
| **Login (Email)** | `auth.loginByEmail(email, pass)` | Validates credentials and returns `{user, accessToken, refreshToken}`. |
| **Login (User)** | `auth.loginByUsername(name, pass)` | Alternative login via username. |
| **Refresh** | `auth.refresh(token)` | Rotates tokens and invalidates the old refresh token. |
| **Logout** | `auth.logout(token)` | Revokes the specific refresh token session. |

### Cookie Configuration
The library provides a helper to generate secure cookie options for your web framework:

```typescript
const options = auth.getCookieOptions();

// Example with Express:
res.cookie(options.names.accessToken, result.accessToken, options.accessToken);
res.cookie(options.names.refreshToken, result.refreshToken, options.refreshToken);
```

---

## 🧭 When to Use It

### Use AuthLibG when:
- You are building a **Modular Monolith** or **Microservice** and want consistent auth logic.
- You want to switch frameworks (e.g., Express to Fastify) without rewriting your auth system.
- You need a secure, production-ready JWT rotation system with database persistence.
- You want to maintain a clean "Ports and Adapters" (Hexagonal) architecture.

### Do NOT use AuthLibG when:
- You are building a very simple CRUD app where hardcoded Express middleware is enough.
- You want an all-in-one solution that includes UI and Routing (like NextAuth or Passport.js).

---

## ⚙️ Configuration Reference

### `AuthConfig` Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tokenExpiresIn.accessToken` | `string \| number` | `"15m"` | TTL for access tokens. |
| `tokenExpiresIn.refreshToken` | `string \| number` | `"7d"` | TTL for refresh tokens. |
| `cookieOptions.accessToken` | `CookieOptions` | `httpOnly: true` | Overrides for access token cookies. |
| `tokenNames.accessToken` | `string` | `"access_token"` | The name used in cookie generation. |

---

## 🧪 Development & Testing
The library is built with **tsup** for dual-module (ESM/CJS) support.

```bash
# Build the library
npm run build

# Run unit and integration tests
npm test
```

---

## 📜 License
MIT License. See `LICENSE` for details.
