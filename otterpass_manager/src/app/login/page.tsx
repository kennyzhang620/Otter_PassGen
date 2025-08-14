'use client';
import { Box, Button, Card, CssBaseline, FormControl, FormLabel, Stack, styled, TextField, Typography } from '@mui/material';
import Checkbox from '@mui/joy/Checkbox';
import LockIcon from '@mui/icons-material/Lock';
import React, { useEffect, useState } from 'react';
import Manager from '../manager';
import Sha256, { xorStrings } from '../../pages/api/algos'

// Database handling for login credentials (fields: u, p)
type LoginEntry = {
  u: string;
  p: string;
};

let loginDb: IDBDatabase | null = null;

function openLoginDatabase(callback: (data: LoginEntry[]) => void) {
  const request = indexedDB.open("loginDatabase", 1);

  request.onsuccess = (event) => {
    const target = event.target as IDBOpenDBRequest;
    if (target) {
      loginDb = target.result;
      loadLoginData(callback);
    }
  };

  request.onerror = (event) => {
    console.error("Login DB error: ", event);
  };

  request.onupgradeneeded = (event) => {
    const target = event.target as IDBOpenDBRequest;
    if (target) {
      loginDb = target.result;
      const objectStore = loginDb.createObjectStore("Login_os", {
        keyPath: "u",
        autoIncrement: false,
      });
      objectStore.createIndex("p", "p", { unique: false });
      console.log("Login DB setup complete");
    }
  };
}

function loadLoginData(callback: (data: LoginEntry[]) => void) {
  if (!loginDb) return;
  const transaction = loginDb.transaction(["Login_os"], "readonly");
  const objectStore = transaction.objectStore("Login_os");
  const request = objectStore.getAll();

  request.onsuccess = () => {
    callback(request.result as LoginEntry[]);
  };
  request.onerror = () => {
    console.error("Error loading login data");
    callback([]);
  };
}

function createLoginEntry(u: string, p: string) {
  return {u: u, p: p} as LoginEntry;
}

function saveLoginEntry(entry: LoginEntry) {
  if (!loginDb) return;
  const transaction = loginDb.transaction(["Login_os"], "readwrite");
  const objectStore = transaction.objectStore("Login_os");
  const request = objectStore.put(entry);

  request.onsuccess = () => {
    console.log("Login entry saved:", entry);
  };
  request.onerror = () => {
    console.error("Error saving login entry:", request.error);
  };
}

function removeLoginEntry() {
  if (!loginDb) return;
  const transaction = loginDb.transaction(["Login_os"], "readwrite");
  const objectStore = transaction.objectStore("Login_os");
  const request = objectStore.clear();

  request.onsuccess = () => {
    console.log("Login entry saved:");
  };
  request.onerror = () => {
    console.error("Error saving login entry:", request.error);
  };
}


const SignInContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

const LoginWithPasskey = () => {
  const [userId, setUserId] = useState('');
  const [userH, setHash] = useState('');
  const [message, setMessage] = useState<string>('');
  const [active, setActive] = useState(false);
  const [saveCreds, setCreds] = useState(false);

  const [autoV, setAuto] = useState(false);


// Load login data on mount
  useEffect(() => {
  openLoginDatabase((data) => {
    if (data.length > 0) {
      setUserId(data[0].u);
      setHash(data[0].p);
      setAuto(true);
      setCreds(true);
    }
  });
}, []);
  

  const loginWithPasskey = async () => {
    try {
      // First, get the user's credential ID to auto-select the passkey
      const credentialResponse = await fetch('/api/passkeys/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'getCredential', userId }),
      });
      const credentialData = await credentialResponse.json();

      // Request a challenge from the server for login
      const loginOptionsResponse = await fetch('/api/passkeys/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'loginOptions', userId }),
      });
      const loginOptions = await loginOptionsResponse.json();

      // Convert the server response from Base64 into ArrayBuffers
      loginOptions.challenge = base64ToArrayBuffer(loginOptions.challenge);

      // Add allowCredentials to auto-select the specific passkey
      if (credentialData.success && credentialData.credential) {
        console.log('Credential data:', credentialData.credential);
        try {
          // The credential ID from the server is already a base64 string
          // We need to convert it to ArrayBuffer for the WebAuthn API
          loginOptions.allowCredentials = [{
            id: base64ToArrayBuffer(credentialData.credential.id),
            type: 'public-key',
          }];
        } catch (error) {
          console.error('Error converting credential ID:', error);
          console.log('Credential ID received:', credentialData.credential.id);
          // Continue without allowCredentials if conversion fails
        }
      }
      else {
          setMessage('No credentials found.');
          return;
      }

      // Use the Web Authentication API to get the credential
      const assertion = await navigator.credentials.get({
        publicKey: loginOptions,
      });

      if (!assertion) {
        setMessage('No credentials found.');
        return;
      }

      // Prepare the credential information to be sent to the server
      const credential = prepareCredentialForVerification(
        assertion as PublicKeyCredential
      );
      console.log(assertion)
      // Send the credential to the server for verification
      const verificationResponse = await fetch('/api/passkeys/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verifyCredential',
          userId,
          credential,
        }),
      });

      const verificationResult = await verificationResponse.json();

      if (verificationResult.success) {
        setMessage('Login successful!');
        const k = Sha256.hash(credentialData.credential.pubKey);
        const l = createLoginEntry(userId, xorStrings(userH, k))
        if (!autoV && saveCreds)
            saveLoginEntry(l)

        if (autoV && saveCreds) {
          setUserId(l.u);
          setHash(l.p);
        }

        if (autoV && !saveCreds) {
          removeLoginEntry();
        }

        setActive(true);
      } else {
        setMessage('Login failed: ' + verificationResult.message);
      }
    } catch (error) {
      console.error(error);
      setMessage('Login failed with an error.');
    }
  };

  // Helper function to convert Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string) => {
    // Ensure the base64 string is properly padded
    const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
    
    // Replace URL-safe characters with standard base64 characters
    const standardBase64 = paddedBase64.replace(/-/g, '+').replace(/_/g, '/');
    
    try {
      const binaryString = window.atob(standardBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('Invalid base64 string:', base64);
      throw error;
    }
  };

  // Helper function to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));
  };

  // Function to prepare the credential information for verification
  const prepareCredentialForVerification = (assertion: PublicKeyCredential) => {
    const response = assertion.response as AuthenticatorAssertionResponse;
    return {
      id: assertion.id,
      rawId: arrayBufferToBase64(assertion.rawId),
      type: assertion.type,
      response: {
        clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
        authenticatorData: arrayBufferToBase64(response.authenticatorData),
        signature: arrayBufferToBase64(response.signature),
        userHandle: response.userHandle
          ? arrayBufferToBase64(response.userHandle)
          : null,
      },
    };
  };

  return (
<div>
  {
  active ? <div>

    <Manager hashin={userH} uid={userId}></Manager>

  </div> : 


  <div>
  {  autoV ? <div>

    <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            onSubmit={() => {}}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 2,
            }}
          >
            <LockIcon sx={{ width: 400, height:400, textAlign:'center' }} />
            <Checkbox label="Auto Sign-in" checked={saveCreds} onChange={() => {setCreds(!saveCreds)}} />
            <Button
              fullWidth
              variant="contained"
              onClick={loginWithPasskey}
            >
              Authenticate with Passkey
            </Button>
          </Box>
        </Card>
      </SignInContainer>

  </div> : <div>

  <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            onSubmit={() => {}}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 2,
            }}
          >
            <FormControl>
              <FormLabel htmlFor="username">Username</FormLabel>
              <TextField
                error={false}
                helperText={''}
                id="username"
                type="username"
                name="username"
                placeholder="username"
                autoComplete="user"
                // new TextDecoder().decode(uint8array);
                onInput={(e) => setUserId(Sha256.hash((e.target as HTMLInputElement).value))   }
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={false ? 'error' : 'primary'}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={false}
                helperText={message + userId}
                id="password"
                type="password"
                name="password"
                placeholder="password"
                autoComplete="user"
                // new TextDecoder().decode(uint8array);
                onInput={(e) => setHash(Sha256.hash((e.target as HTMLInputElement).value))   }
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={false ? 'error' : 'primary'}
              />
            </FormControl> 
            <Checkbox label="Auto Sign-in" checked={saveCreds} onChange={() => {setCreds(!saveCreds)}} />
            <Button
              fullWidth
              variant="contained"
              onClick={loginWithPasskey}
            >
              Authenticate with Passkey
            </Button>
            <Button
              variant="text"
              href="/register"
              sx={{ alignSelf: 'center' }}
            >
              Don&apos;t have an account? Create one!
            </Button>
          </Box>
        </Card>
      </SignInContainer>

  </div> }

  </div> 

  }

</div>
  );
};

export default LoginWithPasskey;
