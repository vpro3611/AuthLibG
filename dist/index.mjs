// src/domain/errors.ts
var DomainError = class extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
};
var InvalidEmailError = class extends DomainError {
};
var InvalidUsernameError = class extends DomainError {
};
var InvalidPasswordError = class extends DomainError {
};
var InvalidTokenError = class extends DomainError {
};
var TokenExpiredError = class extends DomainError {
};
var UserNotFoundError = class extends DomainError {
};
var InvalidCredentialsError = class extends DomainError {
};
var UsernameAlreadyExistsError = class extends DomainError {
};
var EmailAlreadyExistsError = class extends DomainError {
};

// src/domain/Email.ts
var Email = class _Email {
  constructor(value) {
    this.value = value;
  }
  value;
  static PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  static create(rawEmail) {
    const normalized = rawEmail.toLowerCase().trim();
    if (normalized.length < 5 || normalized.length > 255 || !this.PATTERN.test(normalized)) {
      throw new InvalidEmailError(`Invalid email format: ${normalized}`);
    }
    return new _Email(normalized);
  }
  getValue() {
    return this.value;
  }
};

// src/domain/Username.ts
var Username = class _Username {
  constructor(value) {
    this.value = value;
  }
  value;
  static create(rawUsername) {
    const normalized = rawUsername.trim();
    if (normalized.length < 3 || normalized.length > 255) {
      throw new InvalidUsernameError(`Username must be between 3 and 255 characters`);
    }
    return new _Username(normalized);
  }
  getValue() {
    return this.value;
  }
};

// src/domain/Password.ts
var Password = class _Password {
  constructor(hash2) {
    this.hash = hash2;
  }
  hash;
  static PATTERN = /^(?=.{12,255}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).*$/;
  static validatePlain(password) {
    if (password.length < 12 || password.length > 255 || !this.PATTERN.test(password)) {
      throw new InvalidPasswordError("Password does not meet complexity requirements");
    }
    return password;
  }
  static fromHash(hash2) {
    return new _Password(hash2);
  }
  getHash() {
    return this.hash;
  }
};

// src/usecases/LoginEmailUseCase.ts
var LoginEmailUseCase = class {
  constructor(userRepoReader, bcrypter, hooks = {}) {
    this.userRepoReader = userRepoReader;
    this.bcrypter = bcrypter;
    this.hooks = hooks;
  }
  userRepoReader;
  bcrypter;
  hooks;
  async execute(email, password) {
    const emailValid = Email.create(email);
    const passwordValid = Password.validatePlain(password);
    const user = await this.userRepoReader.getUserByEmail(emailValid.getValue());
    if (!user) {
      throw new UserNotFoundError("User not found");
    }
    if (this.hooks.beforeLogin) {
      await this.hooks.beforeLogin(user);
    }
    const comparePasswords = await this.bcrypter.compare(passwordValid, user.getPasswordHash());
    if (!comparePasswords) {
      throw new InvalidCredentialsError("Invalid credentials");
    }
    return user;
  }
};

// src/usecases/LoginUsernameUseCase.ts
var LoginUsernameUseCase = class {
  constructor(userRepoReader, bcrypter, hooks = {}) {
    this.userRepoReader = userRepoReader;
    this.bcrypter = bcrypter;
    this.hooks = hooks;
  }
  userRepoReader;
  bcrypter;
  hooks;
  async execute(username, password) {
    const usernameValid = Username.create(username);
    const passwordValid = Password.validatePlain(password);
    const user = await this.userRepoReader.getUserByUsername(usernameValid.getValue());
    if (!user) throw new UserNotFoundError("User not found");
    if (this.hooks.beforeLogin) {
      await this.hooks.beforeLogin(user);
    }
    const comparePasswords = await this.bcrypter.compare(passwordValid, user.getPasswordHash());
    if (!comparePasswords) throw new InvalidCredentialsError("Invalid credentials");
    return user;
  }
};

// src/usecases/RegisterUseCase.ts
import * as crypto from "crypto";
var RegisterUseCase = class {
  constructor(userRepoReader, userRepoWriter, bcrypter, emailSender, emailVerificationRepo, hooks = {}) {
    this.userRepoReader = userRepoReader;
    this.userRepoWriter = userRepoWriter;
    this.bcrypter = bcrypter;
    this.emailSender = emailSender;
    this.emailVerificationRepo = emailVerificationRepo;
    this.hooks = hooks;
  }
  userRepoReader;
  userRepoWriter;
  bcrypter;
  emailSender;
  emailVerificationRepo;
  hooks;
  async execute(username, email, password, verificationPath) {
    const usernameValid = Username.create(username);
    const emailValid = Email.create(email);
    const passwordValid = Password.validatePlain(password);
    if (this.hooks.beforeRegister) {
      await this.hooks.beforeRegister(emailValid.getValue(), usernameValid.getValue());
    }
    const existingUsername = await this.userRepoReader.getUserByUsername(usernameValid.getValue());
    if (existingUsername) throw new UsernameAlreadyExistsError("Username already exists");
    const existingEmail = await this.userRepoReader.getUserByEmail(emailValid.getValue());
    if (existingEmail) throw new EmailAlreadyExistsError("Email already exists");
    const passwordHash = await this.bcrypter.hash(passwordValid);
    const user = await this.userRepoWriter.save({
      username: usernameValid.getValue(),
      email: emailValid.getValue(),
      passwordHash
    });
    await this.emailVerificationRepo.deleteByUserIdAndType(user.getId(), "register");
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await this.emailVerificationRepo.saveToken({
      id: crypto.randomUUID(),
      userId: user.getId(),
      tokenHash,
      createdAt: /* @__PURE__ */ new Date(),
      expiresAt: new Date(Date.now() + 1e3 * 60 * 60),
      // 1 hour
      tokenType: "register"
    });
    await this.emailSender.sendVerificationEmail(emailValid.getValue(), rawToken, verificationPath, "register");
    if (this.hooks.afterRegister) {
      await this.hooks.afterRegister(user);
    }
    return user;
  }
};

// src/usecases/RefreshUseCase.ts
import { sha256 } from "js-sha256";
var RefreshUseCase = class {
  constructor(userRepoReader, refreshRepo, jwtService, hooks = {}) {
    this.userRepoReader = userRepoReader;
    this.refreshRepo = refreshRepo;
    this.jwtService = jwtService;
    this.hooks = hooks;
  }
  userRepoReader;
  refreshRepo;
  jwtService;
  hooks;
  async execute(refreshToken) {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const hashed = sha256(refreshToken);
    const existingToken = await this.refreshRepo.findValidByHash(hashed);
    if (!existingToken) throw new InvalidTokenError("Invalid refresh token");
    if (existingToken.expiresAt < /* @__PURE__ */ new Date()) throw new InvalidTokenError("Refresh token expired");
    const user = await this.userRepoReader.getUserById(payload.sub);
    if (!user) throw new UserNotFoundError("User not found");
    if (this.hooks.beforeLogin) {
      await this.hooks.beforeLogin(user);
    }
    await this.refreshRepo.revoke(existingToken.id);
    return user;
  }
};

// src/usecases/VerifyEmailUseCase.ts
import * as crypto2 from "crypto";
var VerifyEmailUseCase = class {
  constructor(verificationRepo, userRepoWriter) {
    this.verificationRepo = verificationRepo;
    this.userRepoWriter = userRepoWriter;
  }
  verificationRepo;
  userRepoWriter;
  async execute(rawToken) {
    const tokenHash = crypto2.createHash("sha256").update(rawToken).digest("hex");
    const record = await this.verificationRepo.findByTokenHash(tokenHash);
    if (!record) {
      throw new InvalidTokenError("Invalid or expired token");
    }
    if (record.expiresAt < /* @__PURE__ */ new Date()) {
      await this.verificationRepo.deleteByTokenHash(tokenHash);
      throw new InvalidTokenError("Token expired");
    }
    if (record.tokenType !== "register") {
      throw new InvalidTokenError("Invalid token type");
    }
    await this.userRepoWriter.markAsVerified(record.userId);
    await this.verificationRepo.deleteByTokenHash(tokenHash);
  }
};

// src/utils/CookieHelper.ts
var CookieHelper = class {
  static DEFAULT_ACCESS_TOKEN_AGE = 15 * 60 * 1e3;
  // 15m
  static DEFAULT_REFRESH_TOKEN_AGE = 7 * 24 * 60 * 60 * 1e3;
  // 7d
  static getAccessTokenOptions(config) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: this.DEFAULT_ACCESS_TOKEN_AGE,
      path: "/",
      ...config?.cookieOptions?.accessToken
    };
  }
  static getRefreshTokenOptions(config) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: this.DEFAULT_REFRESH_TOKEN_AGE,
      path: "/",
      ...config?.cookieOptions?.refreshToken
    };
  }
  static getTokenNames(config) {
    return {
      accessToken: config?.tokenNames?.accessToken || "access_token",
      refreshToken: config?.tokenNames?.refreshToken || "refresh_token"
    };
  }
};

// src/AuthCore.ts
import { sha256 as sha2562 } from "js-sha256";
import * as crypto3 from "crypto";
var AuthCore = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  async register(username, email, password, verificationPath = "/verify-email") {
    return this.deps.txManager.runInTransaction(async (client) => {
      const reader = this.deps.userRepoReaderFactory(client);
      const writer = this.deps.userRepoWriterFactory(client);
      const verifRepo = this.deps.emailVerificationRepoFactory(client);
      const useCase = new RegisterUseCase(
        reader,
        writer,
        this.deps.bcrypter,
        this.deps.emailSender,
        verifRepo,
        this.deps.hooks
      );
      const user = await useCase.execute(username, email, password, verificationPath);
      return { user };
    });
  }
  async verifyEmail(token) {
    return this.deps.txManager.runInTransaction(async (client) => {
      const writer = this.deps.userRepoWriterFactory(client);
      const verifRepo = this.deps.emailVerificationRepoFactory(client);
      const useCase = new VerifyEmailUseCase(verifRepo, writer);
      await useCase.execute(token);
    });
  }
  async loginByEmail(email, password) {
    return this.deps.txManager.runInTransaction(async (client) => {
      const reader = this.deps.userRepoReaderFactory(client);
      const useCase = new LoginEmailUseCase(reader, this.deps.bcrypter, this.deps.hooks);
      const user = await useCase.execute(email, password);
      const tokens = await this.generateTokens(user.getId());
      return { user, ...tokens };
    });
  }
  async loginByUsername(username, password) {
    return this.deps.txManager.runInTransaction(async (client) => {
      const reader = this.deps.userRepoReaderFactory(client);
      const useCase = new LoginUsernameUseCase(reader, this.deps.bcrypter, this.deps.hooks);
      const user = await useCase.execute(username, password);
      const tokens = await this.generateTokens(user.getId());
      return { user, ...tokens };
    });
  }
  async refresh(refreshToken) {
    return this.deps.txManager.runInTransaction(async (client) => {
      const reader = this.deps.userRepoReaderFactory(client);
      const useCase = new RefreshUseCase(
        reader,
        this.deps.tokenRepo,
        this.deps.jwtService,
        this.deps.hooks
      );
      const user = await useCase.execute(refreshToken);
      const tokens = await this.generateTokens(user.getId());
      return { user, ...tokens };
    });
  }
  async logout(refreshToken) {
    return this.deps.txManager.runInTransaction(async () => {
      const hashed = sha2562(refreshToken);
      await this.deps.tokenRepo.revokeByHash(hashed);
    });
  }
  async generateTokens(userId) {
    const accessToken = this.deps.jwtService.generateAccessToken(userId);
    const refreshToken = this.deps.jwtService.generateRefreshToken(userId);
    const hashedRefreshToken = sha2562(refreshToken);
    const ttl = this.deps.jwtService.getRefreshTokenExpiresInMs();
    await this.deps.tokenRepo.create({
      id: crypto3.randomUUID(),
      userId,
      tokenHash: hashedRefreshToken,
      expiresAt: new Date(Date.now() + ttl)
    });
    return { accessToken, refreshToken };
  }
  getCookieOptions() {
    return {
      accessToken: CookieHelper.getAccessTokenOptions(this.deps.config),
      refreshToken: CookieHelper.getRefreshTokenOptions(this.deps.config),
      names: CookieHelper.getTokenNames(this.deps.config)
    };
  }
};

// src/infrastructure/TokenServiceJWT.ts
import * as jwt from "jsonwebtoken";
import ms from "ms";
var TokenServiceJWT = class {
  constructor(secret, options) {
    this.secret = secret;
    if (!secret) {
      throw new Error("JWT secret must be provided");
    }
    this.accessTokenExpiresIn = options?.accessTokenExpiresIn || "15m";
    this.refreshTokenExpiresIn = options?.refreshTokenExpiresIn || "7d";
  }
  secret;
  accessTokenExpiresIn;
  refreshTokenExpiresIn;
  generateAccessToken(userId) {
    return jwt.sign({ sub: userId }, this.secret, {
      expiresIn: this.accessTokenExpiresIn
    });
  }
  generateRefreshToken(userId) {
    return jwt.sign({ sub: userId }, this.secret, {
      expiresIn: this.refreshTokenExpiresIn
    });
  }
  verifyAccessToken(token) {
    return this.verify(token);
  }
  verifyRefreshToken(token) {
    return this.verify(token);
  }
  verify(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (e) {
      if (e.name === "TokenExpiredError") {
        throw new TokenExpiredError("Token expired");
      }
      throw new InvalidTokenError("Invalid token");
    }
  }
  getRefreshTokenExpiresInMs() {
    if (typeof this.refreshTokenExpiresIn === "number") {
      return this.refreshTokenExpiresIn;
    }
    return ms(this.refreshTokenExpiresIn);
  }
};

// src/infrastructure/RefreshTokenRepoPg.ts
var RefreshTokenRepoPg = class {
  constructor(client) {
    this.client = client;
  }
  client;
  async create(data) {
    const query = `
            INSERT INTO refresh_tokens (id, user_id, token_hash, created_at, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        `;
    await this.client.query(query, [data.id, data.userId, data.tokenHash, /* @__PURE__ */ new Date(), data.expiresAt]);
  }
  async findValidByHash(hash2) {
    const query = `
            SELECT id, user_id as "userId", expires_at as "expiresAt"
            FROM refresh_tokens
            WHERE token_hash = $1 AND is_revoked = false
        `;
    const result = await this.client.query(query, [hash2]);
    return result.rows[0] || null;
  }
  async revoke(id) {
    const query = `UPDATE refresh_tokens SET is_revoked = true WHERE id = $1`;
    await this.client.query(query, [id]);
  }
  async revokeByHash(hash2) {
    const query = `UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1`;
    await this.client.query(query, [hash2]);
  }
};

// src/infrastructure/EmailVerificationRepoPg.ts
var EmailVerificationRepoPg = class {
  constructor(client) {
    this.client = client;
  }
  client;
  async deleteByUserIdAndType(userId, type) {
    const query = "DELETE FROM email_verification_tokens WHERE user_id = $1 AND token_type = $2";
    await this.client.query(query, [userId, type]);
  }
  async saveToken(data) {
    const query = `
            INSERT INTO email_verification_tokens (id, user_id, token_hash, created_at, expires_at, token_type)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
    await this.client.query(query, [data.id, data.userId, data.tokenHash, data.createdAt, data.expiresAt, data.tokenType]);
  }
  async findByTokenHash(hash2) {
    const query = 'SELECT user_id as "userId", token_type as "tokenType", expires_at as "expiresAt" FROM email_verification_tokens WHERE token_hash = $1';
    const result = await this.client.query(query, [hash2]);
    return result.rows[0] || null;
  }
  async deleteByTokenHash(hash2) {
    const query = "DELETE FROM email_verification_tokens WHERE token_hash = $1";
    await this.client.query(query, [hash2]);
  }
};

// src/adapters/BcryptAdapter.ts
import * as bcrypt from "bcryptjs";
var BcryptAdapter = class {
  constructor(saltRounds = 10) {
    this.saltRounds = saltRounds;
  }
  saltRounds;
  async hash(data) {
    return bcrypt.hash(data, this.saltRounds);
  }
  async compare(data, encrypted) {
    return bcrypt.compare(data, encrypted);
  }
};

// src/adapters/ConsoleEmailSender.ts
var ConsoleEmailSender = class {
  async sendVerificationEmail(email, token, path, type) {
    console.log("====================================");
    console.log(`[EmailSender] To: ${email}`);
    console.log(`[EmailSender] Type: ${type}`);
    console.log(`[EmailSender] Link: ${path}?token=${token}`);
    console.log("====================================");
  }
};

// src/adapters/InMemoryRefreshTokenRepo.ts
var InMemoryRefreshTokenRepo = class {
  tokens = /* @__PURE__ */ new Map();
  async create(data) {
    this.tokens.set(data.id, { ...data, isRevoked: false });
  }
  async findValidByHash(hash2) {
    for (const token of this.tokens.values()) {
      if (token.tokenHash === hash2 && !token.isRevoked) {
        return token;
      }
    }
    return null;
  }
  async revoke(id) {
    const token = this.tokens.get(id);
    if (token) token.isRevoked = true;
  }
  async revokeByHash(hash2) {
    for (const token of this.tokens.values()) {
      if (token.tokenHash === hash2) {
        token.isRevoked = true;
      }
    }
  }
};
export {
  AuthCore,
  BcryptAdapter,
  ConsoleEmailSender,
  CookieHelper,
  DomainError,
  Email,
  EmailAlreadyExistsError,
  EmailVerificationRepoPg,
  InMemoryRefreshTokenRepo,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidPasswordError,
  InvalidTokenError,
  InvalidUsernameError,
  LoginEmailUseCase,
  LoginUsernameUseCase,
  Password,
  RefreshTokenRepoPg,
  RefreshUseCase,
  RegisterUseCase,
  TokenExpiredError,
  TokenServiceJWT,
  UserNotFoundError,
  Username,
  UsernameAlreadyExistsError,
  VerifyEmailUseCase
};
//# sourceMappingURL=index.mjs.map