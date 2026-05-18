# 🔑 Passkeys Security (WebAuthn / FIDO2) Documentation

This document describes the technical architecture, security design, and implementation of **Passkeys (WebAuthn)** on our platform. 

Passkeys provide a completely passwordless, phishing-resistant, and credential-stuffing-resistant authentication experience by utilizing standard asymmetric public-key cryptography instead of shared secrets (passwords).

---

## 🔒 Passkeys Cryptographic Design

Rather than transmitting or storing a secret password, Passkeys work through a cryptographic handshake using standard biometrics (Touch ID, Face ID, Windows Hello) or physical hardware keys (YubiKeys):

1. **The Private Key** remains securely isolated inside the device's secure enclave (TPM or Secure Element) and is never transmitted to the network or stored on our servers.
2. **The Public Key** is sent to our server during registration and saved in the MongoDB `Passkey` collection.
3. **The Challenge Handshake** uses standard digital signatures. During sign-in, the server sends a unique, cryptographically random challenge. The authenticator signs this challenge using the private key, and the server validates the signature using the registered public key.

---

## 🛠️ System Architecture

Our WebAuthn integration is powered by the highly respected and FIDO-compliant **SimpleWebAuthn** ecosystem:
* **Backend**: Powered by `@simplewebauthn/server` for ECDSA/RSA signature assertions, replay-counter checks, and challenge verification.
* **Frontend**: Powered by `@simplewebauthn/browser` to trigger browser-native biometrics and serialize raw ArrayBuffers into standard JSON objects.

### 1. Database Model (`Passkey`)

We store credentials in the `Passkey` MongoDB schema:

* `userId`: Reference to the `User` document.
* `credentialID`: The globally unique ID for the public key credential (stored as a Base64URL string).
* `publicKey`: The raw public key bytes (stored as a binary Buffer).
* `counter`: An incrementing sign-in counter. If the incoming counter is lower than or equal to the saved counter, the server terminates the session to prevent clone/replay attacks.
* `friendlyName`: A user-defined label (e.g. "iPhone 15 Pro", "My YubiKey 5").
* `deviceType`: Tells if the credential is a single-device key (e.g. hardware token) or multi-device (e.g. synced via iCloud Keychain/Google Password Manager).

---

## ⚙️ Handshake Protocols

### Registration Handshake (Add Passkey)

```
Client (Browser)                           Server (Express)
      |                                           |
      | -------- 1. GET registration options ---> |
      | <------- 2. JSON Challenge & RP details - | (Generates options, saves challenge to session)
      |                                           |
      | (Triggers navigator.credentials.create)   |
      | (User scans fingerprint / Face ID)        |
      |                                           |
      | -------- 3. POST attestation response --> |
      | <------- 4. Verified Passkey Saved ------ | (Verifies signature, stores ID & Public Key)
      |                                           |
```

### Authentication Handshake (Biometric Login)

```
Client (Browser)                           Server (Express)
      |                                           |
      | -------- 1. GET authentication options -> |
      | <------- 2. JSON Challenge & Creds list - | (Generates options, saves challenge to session)
      |                                           |
      | (Triggers navigator.credentials.get)      |
      | (User authenticates with biometrics)      |
      |                                           |
      | -------- 3. POST assertion response ----> |
      | <------- 4. JWT & Rotated Refresh Token - | (Verifies assertion, logs user in)
      |                                           |
```

---

## 🧑‍💻 Code Walkthrough & Files

The Passkey security implementation spans the following files:

### Backend Implementation
1. **[passkey.model.ts](../server/src/models/passkey.model.ts)**:
   MongoDB mongoose schema for the `Passkey` collection.
2. **[passkey.controller.ts](../server/src/controllers/passkey.controller.ts)**:
   WebAuthn registration and verification controllers utilizing `@simplewebauthn/server`.
3. **[passkey.routes.ts](../server/src/routes/passkey.routes.ts)**:
   Express route registration mapping `/api/auth/passkey/*` endpoints.

### Frontend Implementation
1. **[PasskeySettings.tsx](../client/src/pages/dashboards/PasskeySettings.tsx)**:
   A premium security panel letting users view their active Passkeys, register new biometrics, and remove devices.
2. **[Login.tsx](../client/src/pages/Login.tsx)**:
   Adds a "Sign In with Passkey" biometric trigger that signs users in with a single touch, completely password-free.

---

## 🛡️ Enterprise Security Considerations

1. **Replay Attack Defense**: Every WebAuthn challenge is a cryptographically strong, cryptographically secure random value generated on-demand by Node's native `crypto` module, and is single-use only.
2. **Authenticator Clone Protection**: The `counter` property is checked on every single login. If an authenticator is cloned, the counters will get out of sync, and our server will immediately detect and block the compromised key.
3. **Phishing Defense**: WebAuthn binds the credential to the specific **Origin Domain** (e.g. `localhost` or `cinemaconnect.com`). Even if a user is tricked into visiting a fake clone site, the browser's credential API will refuse to sign the challenge because the domain origin does not match.
