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
