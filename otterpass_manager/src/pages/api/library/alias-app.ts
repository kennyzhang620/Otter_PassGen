import type { NextApiRequest, NextApiResponse } from 'next';
import { db, getLinkmap } from '../passkeys/utils';
import { xorStrings } from '../algos';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`New call to /api/library/alias-app. Method: ${req.method}`);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed' 
    });
  }

  try {
    const { credentialId, fqdm } = req.body;

    if (!credentialId || !fqdm) {
      return res.status(400).json({
        success: false,
        error: 'credentialId is required'
      });
    }

    const links = getLinkmap(credentialId);
    let paddedFqdm = fqdm;
    // Pad fqdm to the same length as credentialId
    if (fqdm.length < credentialId.length) {
      paddedFqdm = fqdm.padEnd(credentialId.length, ' ');
    } else if (fqdm.length > credentialId.length) {
      paddedFqdm = fqdm.slice(0, credentialId.length);
    }
    
    if (paddedFqdm.length > 0) {

      if (links) {

        const ind = links.findIndex(link => link === paddedFqdm);

        if (ind !== -1) {
            links[ind] = xorStrings(paddedFqdm, credentialId);
        }
        else {
            links.push(xorStrings(paddedFqdm, credentialId));
            console.log("Push")
        }

      }
      else {
        db.linkmaps.set(credentialId, [xorStrings(paddedFqdm, credentialId)]);
        console.log("Append")
  }

}

    return res.status(200).json({
      success: true,
    });

  } catch (error) {
    console.error('Alias API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
