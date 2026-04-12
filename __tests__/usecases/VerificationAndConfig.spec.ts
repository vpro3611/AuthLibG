import { VerifyEmailUseCase } from '../../src/usecases/VerifyEmailUseCase';
import { RegisterUseCase } from '../../src/usecases/RegisterUseCase';
import { CookieHelper } from '../../src/utils/CookieHelper';
import { AuthUser, EmailVerificationInterface, UserRepoWriter, UserRepoReader, BcryptInterface, EmailSenderInterface } from '../../src/ports/interfaces';
import { InvalidTokenError } from '../../src/domain/errors';

class MockUser implements AuthUser {
    getId() { return '1'; }
    getPasswordHash() { return 'hashed'; }
}

describe('Email Verification and Configuration', () => {
    describe('VerifyEmailUseCase', () => {
        const mockWriter: UserRepoWriter<MockUser> = {
            save: async () => new MockUser(),
            markAsVerified: jest.fn()
        };

        it('should throw error for invalid token', async () => {
            const mockRepo: EmailVerificationInterface = {
                deleteByUserIdAndType: async () => {},
                saveToken: async () => {},
                findByTokenHash: async () => null,
                deleteByTokenHash: async () => {}
            };
            const useCase = new VerifyEmailUseCase(mockRepo, mockWriter);
            await expect(useCase.execute('invalid')).rejects.toThrow(InvalidTokenError);
        });

        it('should throw error for expired token', async () => {
            const mockRepo: EmailVerificationInterface = {
                deleteByUserIdAndType: async () => {},
                saveToken: async () => {},
                findByTokenHash: async () => ({ userId: '1', tokenType: 'register', expiresAt: new Date(Date.now() - 1000) }),
                deleteByTokenHash: jest.fn()
            };
            const useCase = new VerifyEmailUseCase(mockRepo, mockWriter);
            await expect(useCase.execute('some-token')).rejects.toThrow('Token expired');
            expect(mockRepo.deleteByTokenHash).toHaveBeenCalled();
        });
    });

    describe('RegisterUseCase Custom Path', () => {
        it('should call email sender with custom path', async () => {
            const mockSender: EmailSenderInterface = {
                sendVerificationEmail: jest.fn()
            };
            const mockReader: UserRepoReader<MockUser> = {
                getUserById: async () => null, getUserByEmail: async () => null, getUserByUsername: async () => null
            };
            const mockWriter: UserRepoWriter<MockUser> = {
                save: async () => new MockUser(), markAsVerified: async () => {}
            };
            const mockRepo: EmailVerificationInterface = {
                deleteByUserIdAndType: async () => {}, saveToken: async () => {}, 
                findByTokenHash: async () => null, deleteByTokenHash: async () => {}
            };
            const mockBcrypt: BcryptInterface = { hash: async () => 'hash', compare: async () => true };

            const useCase = new RegisterUseCase(mockReader, mockWriter, mockBcrypt, mockSender, mockRepo, {});
            await useCase.execute('user', 'test@test.com', 'Pass123456789!', '/custom/verify');

            expect(mockSender.sendVerificationEmail).toHaveBeenCalledWith(
                'test@test.com', expect.any(String), '/custom/verify', 'register'
            );
        });
    });

    describe('CookieHelper', () => {
        it('should respect custom config', () => {
            const config = {
                cookieOptions: {
                    accessToken: { maxAge: 100, secure: true }
                }
            };
            const options = CookieHelper.getAccessTokenOptions(config);
            expect(options.maxAge).toBe(100);
            expect(options.secure).toBe(true);
            expect(options.httpOnly).toBe(true); // Default remains
        });
    });
});
