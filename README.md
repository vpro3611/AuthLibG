# AuthCore Library (AuthLibG)

> **A framework-agnostic, enterprise-grade authentication core for modern Node.js applications.**

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
- **User Database Schema**: You bring your own User table; the library only dictates the Refresh/Verification Token tables.

---

## 🛠 Setting Up

### 1. Installation
```bash
npm install auth-core-lib
```

### 2. Database Initialization
AuthLibG requires specific tables for tracking refresh and verification tokens. We provide a CLI tool to scaffold them for you:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
npx auth-core-init-db
```

---

## 🏗 Customization & "Danger Zones"

AuthLibG is built on a **Ports and Adapters** architecture. You can customize almost everything by implementing the provided interfaces.

### 🟢 Safe to Overwrite (Extension Points)
You are encouraged to provide your own implementations for:
- **`EmailSenderInterface`**: Connect to SendGrid, AWS SES, or Mailgun.
- **`BcryptInterface`**: Use a different hashing algorithm if required.
- **`TransactionManagerInterface`**: Adapt to your specific DB driver (TypeORM, Prisma, Kysely, etc.).
- **`AuthHooks`**: This is the primary way to inject application logic (e.g., "only verified users can login").

### 🟡 Handle with Care (The User Bridge)
Because AuthLibG doesn't know what your `users` table looks like, you **MUST** implement the following interfaces to bridge your schema with the library:

1.  **`AuthUser`**: Your User entity must implement `getId()` and `getPasswordHash()`.
2.  **`UserRepoReader`**: Must implement methods to find your user by ID, Email, or Username (`getUserById(id: string`, `getUserByUsername(username: string)`, `getUserByEmail(email: string)`).
3.  **`UserRepoWriter`**: Must implement `save()` and `markAsVerified()`.

> **Critical**: Ensure `markAsVerified()` actually updates your database persistent state, or users will never be able to pass "isVerified" hooks in future sessions.

### 🔴 Not Recommended to Overwrite (UB Risk)
While you *can* implement your own `RefreshTokenRepoInterface` and `EmailVerificationInterface`, it is **not recommended** unless you mirror the library's internal hashing logic exactly.
- **Undefined Behavior (UB)**: The library expects `sha256` hashing for refresh tokens and email tokens. If your custom repo doesn't match this, logins will fail, and verification links will be permanently invalid.
- **Recommendation**: Use the provided `RefreshTokenRepoPg` and `EmailVerificationRepoPg` with the scaffolded schema.

---

## 📖 User Guide

### Authentication Flow

| Action | Method | Description |
|--------|--------|-------------|
| **Register** | `auth.register(user, email, pass, path)` | Hashes password, saves user, and sends verification email. |
| **Verify** | `auth.verifyEmail(token)` | Confirms the email token and marks user as verified. |
| **Login (Email)** | `auth.loginByEmail(email, pass)` | Validates credentials and returns `{user, accessToken, refreshToken}`. |
| **Refresh** | `auth.refresh(token)` | Rotates tokens and invalidates the old refresh token. |

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
- You want to switch frameworks (e.g., Express to Fastify) without rewriting auth.
- You need a secure, production-ready JWT rotation system with database persistence.
- You want to maintain a clean "Ports and Adapters" (Hexagonal) architecture.

### Do NOT use AuthLibG when:
- You want an all-in-one solution that includes UI and Routing (like NextAuth or Passport.js).

---

## ⚙️ Configuration Reference

### `AuthConfig` Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tokenExpiresIn.accessToken` | `string \| number` | `"15m"` | TTL for access tokens (e.g., "30m", "1h"). |
| `tokenExpiresIn.refreshToken` | `string \| number` | `"7d"` | TTL for refresh tokens (e.g., "30d"). |
| `cookieOptions.accessToken` | `CookieOptions` | `httpOnly: true` | Overrides for access token cookies. |

---

## 🧪 Development
```bash
npm run build # Builds dual CJS/ESM modules
npm test      # Runs suite of 21 tests
```

---

## 📜 License
MIT License. See `LICENSE` for details.
