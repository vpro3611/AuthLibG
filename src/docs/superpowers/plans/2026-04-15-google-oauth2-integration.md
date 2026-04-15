# Google OAuth2 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google OAuth2 login/registration support in `AuthLibG` via a frontend-informed `idToken` flow.

**Architecture:** A new `LoginGoogleUseCase` will verify the token, then find (by Google ID or email), link, or create a new user. The `AuthCore` class will be updated with a `loginByGoogle` method.

**Tech Stack:** TypeScript, `js-sha256`, `crypto`.

---

### Task 1: Update Ports and Interfaces

**Files:**
- Modify: `src/ports/interfaces.ts`

- [ ] **Step 1: Update `AuthUser` to include optional fields**
- [ ] **Step 2: Add Google-related interfaces and update repository ports**

```typescript
// src/ports/interfaces.ts (snippet)

export interface GoogleUserIdentity {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
}

export interface GoogleTokenVerifierInterface {
    verify(idToken: string): Promise<GoogleUserIdentity>;
}

export interface UserRepoReader<TUser extends AuthUser> {
    getUserById(id: string): Promise<TUser | null>;
    getUserByUsername(username: string): Promise<TUser | null>;
    getUserByEmail(email: string): Promise<TUser | null>;
    getUserByGoogleId(googleId: string): Promise<TUser | null>; // New method
}

export interface UserRepoWriter<TUser extends AuthUser> {
    save(user: { 
        username: string, 
        email: string, 
        passwordHash?: string, 
        googleId?: string, // Added
        isVerified?: boolean // Added
    }): Promise<TUser>;
    markAsVerified(userId: string): Promise<void>;
    linkGoogleId(userId: string, googleId: string): Promise<void>; // New method
}

export interface AuthCoreDependencies<TUser extends AuthUser> {
    // ... existing
    googleVerifier?: GoogleTokenVerifierInterface; // New
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ports/interfaces.ts
git commit -m "feat: add google oauth2 ports and update repository interfaces"
```

---

### Task 2: Implement `LoginGoogleUseCase`

**Files:**
- Create: `src/usecases/LoginGoogleUseCase.ts`
- Create: `tests/usecases/LoginGoogleUseCase.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/usecases/LoginGoogleUseCase.test.ts
import { LoginGoogleUseCase } from '../../src/usecases/LoginGoogleUseCase';
import { UserRepoReader, UserRepoWriter, GoogleTokenVerifierInterface, AuthUser } from '../../src/ports/interfaces';

describe('LoginGoogleUseCase', () => {
    let reader: jest.Mocked<UserRepoReader<any>>;
    let writer: jest.Mocked<UserRepoWriter<any>>;
    let verifier: jest.Mocked<GoogleTokenVerifierInterface>;
    let useCase: LoginGoogleUseCase<any>;

    beforeEach(() => {
        reader = {
            getUserByGoogleId: jest.fn(),
            getUserByEmail: jest.fn(),
        } as any;
        writer = {
            save: jest.fn(),
            linkGoogleId: jest.fn(),
        } as any;
        verifier = {
            verify: jest.fn(),
        } as any;
        useCase = new LoginGoogleUseCase(reader, writer, verifier);
    });

    it('should login if user already exists with googleId', async () => {
        const identity = { sub: 'google-123', email: 'test@example.com' };
        verifier.verify.mockResolvedValue(identity);
        const existingUser = { getId: () => 'user-1' } as any;
        reader.getUserByGoogleId.mockResolvedValue(existingUser);

        const result = await useCase.execute('valid-token');

        expect(result).toBe(existingUser);
        expect(reader.getUserByGoogleId).toHaveBeenCalledWith('google-123');
    });

    it('should link and login if user exists with email but no googleId', async () => {
        const identity = { sub: 'google-123', email: 'test@example.com' };
        verifier.verify.mockResolvedValue(identity);
        reader.getUserByGoogleId.mockResolvedValue(null);
        const existingUser = { getId: () => 'user-1' } as any;
        reader.getUserByEmail.mockResolvedValue(existingUser);

        const result = await useCase.execute('valid-token');

        expect(result).toBe(existingUser);
        expect(writer.linkGoogleId).toHaveBeenCalledWith('user-1', 'google-123');
    });

    it('should register and login if user does not exist', async () => {
        const identity = { sub: 'google-123', email: 'new@example.com', name: 'New User' };
        verifier.verify.mockResolvedValue(identity);
        reader.getUserByGoogleId.mockResolvedValue(null);
        reader.getUserByEmail.mockResolvedValue(null);
        const newUser = { getId: () => 'user-2' } as any;
        writer.save.mockResolvedValue(newUser);

        const result = await useCase.execute('valid-token');

        expect(result).toBe(newUser);
        expect(writer.save).toHaveBeenCalledWith(expect.objectContaining({
            email: 'new@example.com',
            googleId: 'google-123',
            isVerified: true
        }));
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test tests/usecases/LoginGoogleUseCase.test.ts`
Expected: FAIL (class not found)

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/usecases/LoginGoogleUseCase.ts
import { AuthUser, UserRepoReader, UserRepoWriter, GoogleTokenVerifierInterface, AuthHooks } from '../ports/interfaces';
import { Email } from '../domain/Email';

export class LoginGoogleUseCase<TUser extends AuthUser> {
    constructor(
        private readonly userRepoReader: UserRepoReader<TUser>,
        private readonly userRepoWriter: UserRepoWriter<TUser>,
        private readonly googleVerifier: GoogleTokenVerifierInterface,
        private readonly hooks: AuthHooks<TUser> = {}
    ) {}

    async execute(idToken: string): Promise<TUser> {
        const googleUser = await this.googleVerifier.verify(idToken);
        const emailValid = Email.create(googleUser.email);

        let user = await this.userRepoReader.getUserByGoogleId(googleUser.sub);
        
        if (user) {
            if (this.hooks.beforeLogin) await this.hooks.beforeLogin(user);
            return user;
        }

        user = await this.userRepoReader.getUserByEmail(emailValid.getValue());

        if (user) {
            await this.userRepoWriter.linkGoogleId(user.getId(), googleUser.sub);
            if (this.hooks.beforeLogin) await this.hooks.beforeLogin(user);
            return user;
        }

        user = await this.userRepoWriter.save({
            username: googleUser.name || googleUser.email.split('@')[0],
            email: emailValid.getValue(),
            googleId: googleUser.sub,
            isVerified: true
        });

        if (this.hooks.afterRegister) await this.hooks.afterRegister(user);
        
        return user;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/usecases/LoginGoogleUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/usecases/LoginGoogleUseCase.ts tests/usecases/LoginGoogleUseCase.test.ts
git commit -m "feat: implement LoginGoogleUseCase with tests"
```

---

### Task 3: Update `AuthCore` with `loginByGoogle`

**Files:**
- Modify: `src/AuthCore.ts`

- [ ] **Step 1: Add `loginByGoogle` method to `AuthCore`**

```typescript
// src/AuthCore.ts (snippet)

    async loginByGoogle(idToken: string) {
        if (!this.deps.googleVerifier) {
            throw new Error('GoogleTokenVerifierInterface is not configured in AuthCoreDependencies');
        }
        return this.deps.txManager.runInTransaction(async (client) => {
            const reader = this.deps.userRepoReaderFactory(client);
            const writer = this.deps.userRepoWriterFactory(client);
            
            const useCase = new LoginGoogleUseCase(
                reader, writer, this.deps.googleVerifier!, this.deps.hooks
            );
            const user = await useCase.execute(idToken);
            const tokens = await this.generateTokens(user.getId());
            return { user, ...tokens };
        });
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/AuthCore.ts
git commit -m "feat: add loginByGoogle method to AuthCore"
```

---

### Task 4: Export and Finalize

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Export new types and use case**

```typescript
// src/index.ts (add)
export * from './usecases/LoginGoogleUseCase';
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: export LoginGoogleUseCase and finalize integration"
```
