import type { NextApiRequest, NextApiResponse } from 'next';
import {
  compareChallenges,
  db,
  deleteChallenge,
  destructClientDataJSON,
  generateChallenge,
  getChallenge,
  saveChallenge,
  saveCredential,
  verifyRegistration,
} from './utils';
import Sha256 from '../algos';

// Load backend service URL from environment variable
const HOST_IP = process.env.HOST_IP || 'localhost';


interface CredentialForRegistration {
  id: string;
  rawId: string;
  type: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { action, userId, credential } = req.body as {
    action: string;
    userId: string;
    credential?: CredentialForRegistration;
  };

  console.log(`New call to /register. Action: ${action}`);

  if (db.credentials.has(Sha256.hash(userId))) return res.status(401).json({ error: 'Invalid action' });

  if (action === 'registerOptions') {
    const challenge = generateChallenge();
    await saveChallenge(Sha256.hash(userId), challenge);

    const registerOptions = {
      challenge,
      rp: { id: HOST_IP, name: 'OtterCoGen' },
      user: {
        id: Sha256.hash(userId),
        name: `${Sha256.hash(userId)}`,
        displayName: `${Sha256.hash(userId)}@` + HOST_IP,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      timeout: 60000,
      attestation: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'preferred',
      },
    };

    res.status(200).json(registerOptions);
  } else if (action === 'registerCredential') {
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required for registration' });
    }
    
    const attObj = Buffer.from(credential.response.attestationObject, 'base64');
    const cdjObj = Buffer.from(credential.response.clientDataJSON, 'base64');

    try {
      const expectedChallenge = getChallenge(Sha256.hash(userId));

      if (!expectedChallenge) {
        return res
          .status(400)
          .json({ error: 'Challenge not found or expired.' });
      }

      const { challenge, type } = destructClientDataJSON(cdjObj);

      if (type != 'webauthn.create') {
        throw new Error('Wrong type, expected webauthn.create');
      }

      if (!compareChallenges(challenge, expectedChallenge)) {
        throw new Error('Expected challenge mismatch');
      }

      const { isVerified, pubKeyJWK } = await verifyRegistration(
        attObj,
        cdjObj
      );

      if (!isVerified) {
        throw new Error('Signature mismatch');
      }

      await saveCredential(Sha256.hash(userId), { id: credential.id, pubKey: pubKeyJWK });
      await deleteChallenge(Sha256.hash(userId));

      res.status(200).json({ success: true });
    } catch (error) {
      console.log(error);
      res
        .status(401)
        .json({ success: false, message: (error as Error).message });
    }
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }

  console.log(db);
}
