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

---

## 🛠 Setting Up

### 1. Installation
```bash
npm install auth-core-lib
```

### 2. Database Initialization
AuthLibG requires specific tables for tracking sessions and verification. Use the CLI tool to scaffold them for your database engine:

**PostgreSQL (Automatic)**
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
export DB_TYPE="postgres"
npx auth-core-init-db
```

**MySQL / SQLite (Manual/Guide)**
```bash
export DB_TYPE="mysql" # or "sqlite"
npx auth-core-init-db
```
*Note: For MySQL and SQLite, the tool will output the exact SQL schema for you to copy into your migration system.*

---

## 🏗 Customization & "Danger Zones"

### 🟢 Safe to Overwrite (Extension Points)
- **`EmailSenderInterface`**: Connect to SendGrid, AWS SES, or Mailgun.
- **`BcryptInterface`**: Use a different hashing algorithm if required.
- **`TransactionManagerInterface`**: Adapt to your specific DB driver (TypeORM, Prisma, Kysely, etc.).

### 🟡 Handle with Care (The User Bridge)
You **MUST** implement the following to bridge your user schema with the library:
1.  **`AuthUser`**: Your User entity must implement `getId()` and `getPasswordHash()`.
2.  **`UserRepoReader`**: Implement methods to find users by ID, Email, or Username.
3.  **`UserRepoWriter`**: Implement `save()` and `markAsVerified()`.

### 🔴 Not Recommended to Overwrite (UB Risk)
- **`RefreshTokenRepoInterface`** & **`EmailVerificationInterface`**: The library relies on internal `sha256` hashing patterns for these tokens. Overwriting them without matching this logic will break the auth flow.

---

## 📖 User Guide

### Authentication Flow

| Action | Method | Description |
|--------|--------|-------------|
| **Register** | `auth.register(user, email, pass, path)` | Hashes password, saves user, and sends verification email. |
| **Verify** | `auth.verifyEmail(token)` | Confirms the email token and marks user as verified. |
| **Login (Email)** | `auth.loginByEmail(email, pass)` | Validates credentials and returns `{user, accessToken, refreshToken}`. |
| **Refresh** | `auth.refresh(token)` | Rotates tokens and invalidates the old refresh token. |

---

## ⚙️ Configuration Reference

### `AuthConfig` Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tokenExpiresIn.accessToken` | `string \| number` | `"15m"` | TTL for access tokens (e.g., "30m", "1h"). |
| `tokenExpiresIn.refreshToken` | `string \| number` | `"7d"` | TTL for refresh tokens (e.g., "30d"). |

---

## 📜 License
MIT License. See `LICENSE` for details.
