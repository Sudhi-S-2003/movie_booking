import { Schema, model } from 'mongoose';
import mongoose from 'mongoose';

export interface IPasskey {
  userId: any;
  credentialID: string;        // Base64URL string representation of credential ID
  publicKey: Buffer;           // Hashed/raw cryptographic public key
  counter: number;             // Sign-in counter to detect clone/replay attacks
  deviceType: 'singleDevice' | 'multiDevice'; // E.g., hardware key vs synced keychain
  backedUp: boolean;           // If credential is backed up
  transports?: string[];       // Array: 'internal', 'usb', 'nfc', 'ble'
  friendlyName: string;        // User-defined name (e.g. "My MacBook TouchID")
  createdAt: Date;
}

export type PasskeyDoc = mongoose.HydratedDocument<IPasskey>;

const PasskeySchema = new Schema<IPasskey>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  credentialID: { type: String, required: true, unique: true },
  publicKey: { type: Buffer, required: true },
  counter: { type: Number, required: true, default: 0 },
  deviceType: { type: String, required: true },
  backedUp: { type: Boolean, default: false },
  transports: [String],
  friendlyName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Passkey = model<IPasskey>('Passkey', PasskeySchema);
