import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../passkeys/utils';
import Sha256 from '../algos';

// Load backend service URL from environment variable
const BACKEND_SERVICE_URL = process.env.BACKEND_SERVICE_URL || 'http://127.0.0.1:4867';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`New call to /api/library/generator. Method: ${req.method}`);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed' 
    });
  }

  try {
    const { action, num, symbols, address, base, salt, hash, idfd, ofdm } = req.body;

    switch (action) {
      case 'generatePassword':
        // Proxy request to the same endpoint as tableCell.tsx
        const proxyData = { 
          num: num || true, 
          symbols: symbols || true, 
          address: address || '', 
          base: base || '', 
          salt: salt || '', 
          hash: hash || '',
          idfd: idfd || 0,
          ofdm: ofdm || '',
        };

        try {
          const response = await fetch(BACKEND_SERVICE_URL, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(proxyData)
          });

          if (response.ok) {
            const responseText = await response.text();
            
            if (ofdm.length > 0) {
                const rv = db.linkmaps.get(Sha256.hash(address))

                if (rv) {
                    if (rv.length <= idfd) {
                        rv.push(ofdm);
                    }
                    else {
                        rv[idfd] = ofdm;
                    }
                }
                else {
                    db.linkmaps.set(Sha256.hash(address), [ofdm]);
                }
            }

            return res.status(200).send(responseText);
          } 
          else 
          {
            return res.status(response.status).json({
              success: false,
              error: `Proxy request failed: ${response.statusText}`
            });
          }
        } catch (proxyError) {
          console.error('Proxy error:', proxyError);
          return res.status(500).json({
            success: false,
            error: 'Failed to connect to password generation service'
          });
        }

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions: generatePassword'
        });
    }

  } catch (error) {
    console.error('Generator API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
