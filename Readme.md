ak_3rC5lAt4BkuZ6Pwu
as_JpUcoeOjfGVq8wVB4U7Jk4uT--nR4jf4qj67OjORcEs

npx http-server

---

# 🎬 CinemaConnect - High-Performance Movie Booking Platform

Welcome to the development workspace of **CinemaConnect**! This platform features an elite, production-grade security architecture designed to keep user data and server transactions completely safe.

## 🔐 Advanced Security Features

1. **Two-Factor Authentication (TOTP 2FA)**
   * Biometric-compatible, high-entropy standard TOTP secrets with custom dynamic QR scanning.
   * Secure, cryptographically hashed single-use backup recovery codes.
   * Completely isolated authentication pending barrier under `/login/verify-2fa` using safe temporary session JWTs.

2. **Refresh Token Rotation (RTR)**
   * Cryptographically secure, opaque random tokens with 80-character high entropy.
   * Automated response-interceptor silent refresh mechanism on the client.
   * Replay detection automatically invalidates whole sessions if an older refresh token is re-submitted.

3. **🔑 Passkeys (WebAuthn / FIDO2) - Passwordless Sign-In**
   * Experience fully passwordless, secure login using standard face recognition, fingerprint scanning, or physical USB keys.
   * Complete architectural, database, and handshake information can be found in our dedicated documentation:
     👉 **[Passkeys Security Documentation (passkey_readme.md)](./docs/passkey_readme.md)**