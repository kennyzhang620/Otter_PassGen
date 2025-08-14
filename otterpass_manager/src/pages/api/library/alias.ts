import type { NextApiRequest, NextApiResponse } from 'next';
import { getLinkmap } from '../passkeys/utils';
import { xorStrings } from '../algos';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`New call to /api/library/alias. Method: ${req.method}`);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed' 
    });
  }

  try {
    const { credentialId } = req.body;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: 'credentialId is required'
      });
    }

    const links = getLinkmap(credentialId) || [];

    return res.status(200).json({
      success: true,
      data: links.map(x => xorStrings(x, credentialId))
    });

  } catch (error) {
    console.error('Alias API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
