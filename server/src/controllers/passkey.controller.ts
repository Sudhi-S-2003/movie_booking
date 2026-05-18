import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { env } from '../env.js';
import { User } from '../models/user.model.js';
import { Passkey } from '../models/passkey.model.js';
import { Session } from '../models/session.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { generateRandomToken } from '../utils/token.utils.js';
import type { SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '../interfaces/auth.interface.js';

const rpID = new URL(env.FRONTEND_URL).hostname;

const generateToken = (id: string, role: string, sessionId: string) =>
  jwt.sign(
    { id, role, sessionId } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] } as SignOptions
  );

// --- Passkey Registration (Adding Passkey to Logged In Account) ---

export const getRegistrationOptions = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userPasskeys = await Passkey.find({ userId: user._id } as any);

    const options = await generateRegistrationOptions({
      rpName: env.APP_NAME,
      rpID,
      userID: new TextEncoder().encode(user._id.toString()),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: userPasskeys.map(pk => ({
        id: pk.credentialID,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    // Generate a stateless challenge token to verify it in the next request
    const challengeToken = jwt.sign(
      { challenge: options.challenge },
      env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.status(200).json({
      success: true,
      options,
      challengeToken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const verifyRegistration = async (req: Request, res: Response) => {
  try {
    const { response, friendlyName, challengeToken } = req.body;
    if (!response || !friendlyName || !challengeToken) {
      return res.status(400).json({ success: false, message: 'Missing verification data' });
    }

    // Decode and verify the stateless challenge token
    let decodedChallenge: string;
    try {
      const decoded = jwt.verify(challengeToken, env.JWT_SECRET) as { challenge: string };
      decodedChallenge = decoded.challenge;
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Challenge expired. Please try again.' });
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: decodedChallenge,
      expectedOrigin: env.FRONTEND_URL,
      expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return res.status(400).json({ success: false, message: 'Passkey verification failed' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    // Save public key credential
    await Passkey.create({
      userId: user._id as any,
      credentialID: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      friendlyName: friendlyName.trim() || 'Biometric Key',
    } as any);

    return res.status(201).json({
      success: true,
      message: 'Passkey registered successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// --- Passkey Authentication (Passwordless Login) ---

export const getAuthenticationOptions = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    let allowCredentials: any[] = [];
    let userToAuth: any = null;

    if (email) {
      userToAuth = await User.findOne({ email: email.toString().trim().toLowerCase() });
      if (userToAuth) {
        const userPasskeys = await Passkey.find({ userId: userToAuth._id } as any);
        allowCredentials = userPasskeys.map(pk => ({
          id: pk.credentialID,
          type: 'public-key',
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Generate a stateless challenge token to verify it in the next request
    const challengeToken = jwt.sign(
      { challenge: options.challenge, targetUserId: userToAuth?._id?.toString() },
      env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.status(200).json({
      success: true,
      options,
      challengeToken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const verifyAuthentication = async (req: Request, res: Response) => {
  try {
    const { response, challengeToken } = req.body;
    if (!response || !challengeToken) {
      return res.status(400).json({ success: false, message: 'Missing authentication verification data' });
    }

    // Decode and verify the stateless challenge token
    let decodedChallenge: string;
    let targetUserId: string | undefined;
    try {
      const decoded = jwt.verify(challengeToken, env.JWT_SECRET) as { challenge: string; targetUserId?: string };
      decodedChallenge = decoded.challenge;
      targetUserId = decoded.targetUserId;
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Challenge expired. Please try again.' });
    }

    const base64UrlCredId = response.id;
    
    // Find the registered Passkey
    const passkey = await Passkey.findOne({ credentialID: base64UrlCredId });
    if (!passkey) {
      return res.status(404).json({ success: false, message: 'Credential not registered on this device' });
    }

    // Cross-validate userID if specified in Step 1
    if (targetUserId && passkey.userId.toString() !== targetUserId) {
      return res.status(400).json({ success: false, message: 'Credential ownership mismatch' });
    }

    const user = await User.findById(passkey.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: decodedChallenge,
      expectedOrigin: env.FRONTEND_URL,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (!verified || !authenticationInfo) {
      return res.status(400).json({ success: false, message: 'Biometric verify failed' });
    }

    // Update counter to avoid clones/replay attacks
    passkey.counter = authenticationInfo.newCounter;
    await passkey.save();

    // Authenticate and create a session
    const refreshToken = generateRandomToken();
    const session = await Session.create({
      userId: user._id,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
      refreshToken,
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const token = generateToken(user._id.toString(), user.role, session._id.toString());

    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// --- Fetch User's Registered Passkeys ---
export const getMyPasskeys = async (req: Request, res: Response) => {
  try {
    const passkeys = await Passkey.find({ userId: req.user!._id } as any)
      .select('-publicKey')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      passkeys,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// --- Remove Passkey ---
export const deletePasskey = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Passkey.findOneAndDelete({ _id: id, userId: req.user!._id } as any);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Passkey not found or not owned by user' });
    }

    return res.status(200).json({
      success: true,
      message: 'Passkey removed successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
