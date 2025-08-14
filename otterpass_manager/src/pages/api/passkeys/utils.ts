import { randomBytes, verify, createHash } from 'crypto';
import * as cbor from 'cbor';
import coseToJwk from 'cose-to-jwk';
import { promises as fs } from 'fs';
import path from 'path';

interface ClientDataJSON {
  type: 'webauthn.create' | 'webauthn.get';
  challenge: string;
  origin: string;
  crossOrigin: boolean;
}

interface Credential {
  id: string;
  pubKey: string;
}

// Database file path
const DB_FILE_PATH = path.join(process.cwd(), 'data', 'mock-db.json');

// Mock database for demonstration purposes
const db = {
  challenges: new Map<string, string>(),
  credentials: new Map<string, Credential>(),
  linkmaps: new Map<string, Array<string>>()
};

// Load database from disk if it exists
async function loadDatabase() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Check if database file exists
    try {
      const data = await fs.readFile(DB_FILE_PATH, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Convert back to Maps
      db.challenges.clear();
      db.credentials.clear();
      db.linkmaps.clear();
      
      if (parsedData.challenges) {
        parsedData.challenges.forEach(([key, value]: [string, string]) => {
          db.challenges.set(key, value);
        });
      }
      
      if (parsedData.credentials) {
        parsedData.credentials.forEach(([key, value]: [string, Credential]) => {
          db.credentials.set(key, value);
        });
      }
      
      if (parsedData.linkmaps) {
        parsedData.linkmaps.forEach(([key, value]: [string, Array<string>]) => {
          db.linkmaps.set(key, value);
        });
      }
      
      console.log('Database loaded from disk');
    } catch (error) {
      // File doesn't exist or is invalid, start with empty database
      console.log(error, 'No existing database found, starting with empty database');
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
}

// Save database to disk
async function saveDatabase() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Convert Maps to arrays for JSON serialization
    const dataToSave = {
      challenges: Array.from(db.challenges.entries()),
      credentials: Array.from(db.credentials.entries()),
      linkmaps: Array.from(db.linkmaps.entries()),
    };
    
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(dataToSave, null, 2));
    console.log('Database saved to disk');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Initialize database on module load
loadDatabase();

export function uint8ArrayToHexString(uint8Array: Uint8Array) {
  return Array.from(uint8Array)
    .map(b => ('00' + b.toString(16)).slice(-2))
    .join('');
}

const saveChallenge = async (userId: string, challenge: string) => {
  db.challenges.set(userId, challenge);
  await saveDatabase();
};

const getChallenge = (userId: string): string | undefined =>
  db.challenges.get(userId);

const deleteChallenge = async (userId: string) => {
  db.challenges.delete(userId);
  await saveDatabase();
};

const saveCredential = async (userId: string, credential: Credential) => {
  db.credentials.set(userId, credential);
  await saveDatabase();
};

const getCredential = (userId: string) => db.credentials.get(userId);

// Linkmaps operations
const saveLinkmap = async (userId: string, links: Array<string>) => {
  db.linkmaps.set(userId, links);
  await saveDatabase();
};

const getLinkmap = (userId: string): Array<string> | undefined => 
  db.linkmaps.get(userId);

const addToLinkmap = async (userId: string, link: string) => {
  const existingLinks = db.linkmaps.get(userId) || [];
  existingLinks.push(link);
  db.linkmaps.set(userId, existingLinks);
  await saveDatabase();
};

const removeFromLinkmap = async (userId: string, link: string) => {
  const existingLinks = db.linkmaps.get(userId) || [];
  const filteredLinks = existingLinks.filter(l => l !== link);
  db.linkmaps.set(userId, filteredLinks);
  await saveDatabase();
};

const generateChallenge = (): string => randomBytes(32).toString('base64');

const verifyRegistration = async (
  attestationObject: Buffer,
  clientDataJSON: Buffer
) => {
  const decodedAttestationObject = await cbor.decodeFirst(attestationObject);
  const { fmt, authData, attStmt } = decodedAttestationObject;
  
  console.log('Attestation format:', fmt);
  console.log('Attestation statement:', attStmt);
  
  // Handle different attestation formats
  if (fmt === 'none') {
    // For 'none' attestation, there's no signature to verify
    console.log('Using none attestation format - skipping signature verification');
    
    // Extract the COSE key
    const coseKeyBuffer = extractCoseKey(authData);
    
    // Convert it to JWK
    const jwk = coseToJwk(coseKeyBuffer);
    const pubKeyJWK = btoa(JSON.stringify(jwk));
    
    return { isVerified: true, pubKeyJWK };
  }
  
  // For other formats, try to extract signature
  const { sig } = attStmt || {};
  
  if (!sig) {
    console.log('No signature found in attestation statement');
    throw new Error('No signature found in attestation statement');
  }

  // Extract the COSE key
  const coseKeyBuffer = extractCoseKey(authData);

  // Convert it to JWK
  const jwk = coseToJwk(coseKeyBuffer);
  const pubKeyJWK = btoa(JSON.stringify(jwk));

  const clientDataHash = createHash('SHA256').update(clientDataJSON).digest();

  const dataToVerify = Buffer.concat([authData, clientDataHash]);

  // Verify the signature against the data
  const isVerified = verify(
    null, // For ECDSA, the algorithm is determined by the key
    dataToVerify,
    {
      key: jwk,
      format: 'jwk', // Specifying the format as JWK
      type: 'spki', // Public key
    },
    sig
  );

  return { isVerified, pubKeyJWK };
};

const verifyLogin = async (
  authData: Buffer,
  clientDataJSON: Buffer,
  sig: Buffer,
  pubKeyJwk: string
) => {
  const jwk = JSON.parse(Buffer.from(pubKeyJwk, 'base64').toString());

  const clientDataHash = createHash('SHA256').update(clientDataJSON).digest();

  const dataToVerify = Buffer.concat([authData, clientDataHash]);

  // Verify the signature against the data
  const isVerified = verify(
    null, // For ECDSA, the algorithm is determined by the key
    dataToVerify,
    {
      key: jwk,
      format: 'jwk', // Specifying the format as JWK
      type: 'spki', // Public key
    } as unknown as Parameters<typeof verify>[2],
    sig
  );

  return isVerified;
};

const extractCoseKey = (authData: Buffer): Buffer => {
  // Skip the RP ID hash, flags, sign count, and AAGUID
  const fixedLength = 32 + 1 + 4 + 16; // 53 bytes

  // Read the credential ID length (2 bytes, big endian)
  const credentialIdLength = authData.readUInt16BE(fixedLength);

  // Calculate the start of the COSE key
  const coseKeyStartIndex = fixedLength + 2 + credentialIdLength; // +2 for the length field itself

  // Extract the COSE key
  return authData.slice(coseKeyStartIndex);
};

const destructClientDataJSON = (clientDataJSON: Buffer): ClientDataJSON => {
  return JSON.parse(clientDataJSON.toString());
};

const compareChallenges = (c1: string, c2: string) => {
  return (
    Buffer.from(c1, 'base64').toString() ===
    Buffer.from(c2, 'base64').toString()
  );
};

export {
  verifyRegistration,
  verifyLogin,
  destructClientDataJSON,
  generateChallenge,
  getChallenge,
  getCredential,
  saveChallenge,
  deleteChallenge,
  saveCredential,
  compareChallenges,
  saveLinkmap,
  getLinkmap,
  addToLinkmap,
  removeFromLinkmap,
  db,
};
