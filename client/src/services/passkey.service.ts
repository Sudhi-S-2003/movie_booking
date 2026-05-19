import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { authApi, type AuthResponse } from './api/auth.api.js';

export const passkeyService = {
  /**
   * Guides the user through a passwordless registration process:
   * 1. Fetches challenge options from the backend.
   * 2. Prompts the browser's credential manager (Touch ID / Face ID / USB).
   * 3. Sends the generated cryptographic proof back to the server.
   */
  register: async (friendlyName: string): Promise<void> => {
    // 1. Get options from the server
    const optRes = await authApi.getPasskeyRegistrationOptions();

    // 2. Trigger browser authenticator popups
    const attestationResponse = await startRegistration({ optionsJSON: optRes.options });

    // 3. Verify registration on the server
    await authApi.verifyPasskeyRegistration({
      response: attestationResponse,
      friendlyName: friendlyName.trim(),
      challengeToken: optRes.challengeToken,
    });
  },

  /**
   * Authenticates the user passwordlessly using a registered passkey:
   * 1. Fetches challenge options from the backend.
   * 2. Prompts the browser's credential manager to sign the challenge.
   * 3. Sends the signed proof to the backend and returns the session credentials.
   */
  authenticate: async (email?: string): Promise<AuthResponse> => {
    // 1. Get authentication options from the server
    const optRes = await authApi.getPasskeyAuthenticationOptions(email);

    // 2. Trigger browser WebAuthn biometrics login dialog
    const assertionResponse = await startAuthentication({ optionsJSON: optRes.options });

    // 3. Verify assertion on the server and return authenticated user
    return await authApi.verifyPasskeyAuthentication({
      response: assertionResponse,
      challengeToken: optRes.challengeToken,
    });
  }
};
