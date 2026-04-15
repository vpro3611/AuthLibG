# Google OAuth2 Integration Design Spec

**Date**: 2026-04-15  
**Topic**: Google OAuth2 Integration (Frontend-Informed Token Flow)  
**Approver**: User  

## 1. Goal
Implement Google OAuth2 support in the `AuthLibG` library. This will allow users to sign in or register automatically using a Google ID token from the frontend.

## 2. Approach: Frontend-Informed Token Flow
The frontend handles the initial Google Sign-In and sends an `idToken` to the backend. The library then verifies this token, links it to a user account, or creates a new one.

## 3. Key Architectural Changes

### 3.1 Ports and Interfaces
New interfaces will be added to `src/ports/interfaces.ts` to support Google authentication:

*   **`GoogleUserIdentity`**: A structure for the Google user data fetched after token verification.
*   **`GoogleTokenVerifierInterface`**: A port for the Google token verification service.
*   **`UserRepoReader`**: Added `getUserByGoogleId(googleId: string): Promise<TUser | null>`.
*   **`UserRepoWriter`**: Updated `save` to include optional `googleId`, and added `linkGoogleId(userId: string, googleId: string): Promise<void>`.

### 3.2 `AuthCore` Updates
*   Added optional `googleVerifier` to `AuthCoreDependencies`.
*   New `loginByGoogle(idToken: string)` method to `AuthCore`.

### 3.3 New Use Case: `LoginGoogleUseCase`
This use case coordinates the logic for Google login:
1.  **Verify Token**: Uses the provided `GoogleTokenVerifierInterface` to verify the `idToken`.
2.  **Find User**:
    *   First, try to find a user by their unique `googleId`.
    *   If not found, try to find a user by their `email` (fetched from Google).
    *   If found by email, **link** the Google ID to the existing account.
3.  **Create User**: If no user exists, create a new one (marked as verified) with the Google identity.
4.  **Complete Login**: Trigger existing `beforeLogin` or `afterRegister` hooks and return the user.

## 4. Design for Isolation & Safety
*   **Optional Dependencies**: The `googleVerifier` is optional in `AuthCoreDependencies` to avoid breaking existing setups.
*   **Interface Stability**: The `UserRepoReader` and `UserRepoWriter` changes will be made carefully to ensure existing implementations remain functional (though they won't support Google login until updated).
*   **No breaking changes**: All updates will be additive and follow existing patterns.

## 5. Testing Strategy
*   **Unit Tests**: Mock `GoogleTokenVerifierInterface` and repository interfaces to verify `LoginGoogleUseCase` logic (registration vs. linking vs. login).
*   **Integration Tests**: Test the updated `AuthCore` and repositories (if possible) to ensure end-to-end functionality.
