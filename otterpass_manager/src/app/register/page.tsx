'use client';
import Sha256 from '../../pages/api/algos'
import { Box, Button, Card, CssBaseline, FormControl, FormLabel, Stack, styled, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';

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

const RegisterPasskey = () => {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    try {
      // Step 1: Request registration options from the server
      const registerOptionsResponse = await fetch('/api/passkeys/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'registerOptions', userId }),
      });
      const registerOptions = await registerOptionsResponse.json();

      // Convert the server response from Base64 into ArrayBuffers
      registerOptions.challenge = base64ToArrayBuffer(
        registerOptions.challenge
      );
      registerOptions.user.id = base64ToArrayBuffer(
        window.btoa(registerOptions.user.id)
      );

      // Step 2: Create a new credential
      const newCredential: PublicKeyCredential =
        (await navigator.credentials.create({
          publicKey: registerOptions,
        })) as PublicKeyCredential;

      // Prepare the data to be pushed to backend (converting ArrayBuffers back to Base64)
      const credential = {
        id: newCredential.id,
        rawId: btoa(
          String.fromCharCode(...new Uint8Array(newCredential.rawId))
        ),
        response: {
          attestationObject: arrayBufferToBase64(
            (newCredential.response as AuthenticatorAttestationResponse).attestationObject
          ),
          clientDataJSON: arrayBufferToBase64(
            newCredential.response.clientDataJSON
          ),
        },
        type: newCredential.type,
      };

      // Step 3: Register the credential with the server
      const registerResponse = await fetch('/api/passkeys/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registerCredential',
          userId,
          credential,
        }),
      });

      if (registerResponse.ok) {
        setMessage('Registration successful! You can now login');
      window.location.href = '/login';
      } else {
        setMessage('Registration failed.');
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during registration.');
    }
  };

  // Helper function to convert Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Helper function to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));
  };

  return (
    <div>
<CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Register
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
                helperText={message + userId}
                onInput={(e) => setUserId(Sha256.hash((e.target as HTMLInputElement).value))   }
                id="username"
                type="username"
                name="username"
                placeholder="username"
                autoComplete="user"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={false ? 'error' : 'primary'}
              />
            </FormControl>
            <Button
              fullWidth
              variant="contained"
              onClick={handleRegister}
            >
              Authenticate with Passkey
            </Button>
            <Button
              variant="text"
              href="/login"
              sx={{ alignSelf: 'center' }}
            >
              Already have an account? Sign in!
            </Button>
          </Box>
        </Card>
      </SignInContainer>
</div>
  );
};

export default RegisterPasskey;
