# Otter_PassGen
Private key locally hosted password generator using Chrome extensions (HTML,CSS, JavaScript), and generator written with Python (Flask, NumPy, crypt)

# How to Use
It consists of two main components, the Chromium compatible extension frontend and the Flask-based Python backend.

## Chromium based extension

![image](https://github.com/user-attachments/assets/157f83db-10f0-4964-9239-ff862325a020)

Look at how adorable the characters are! 

### Password scrambler

There are two inputs, the address (the private key generated with keygen.py relative to the backend's root directory) and the "code", a special code that only you know!
The inputs are hashed with SHA256 before sent directly to the local server running on your machine.

### Web AuthN based authentication with Passkey

This requires the OtterServer with WebAuthN support. Clicking on the biometric button on the right of the code input field activates the authentication session that has a lifetime of 10 seconds.

![image](https://github.com/user-attachments/assets/e74e478a-32cb-49fd-974e-12425e9c3d77)

After authentication is successful, the password is automatically filled in.

![image](https://github.com/user-attachments/assets/1bb62e22-da70-45fe-b553-03609cb07a43)

### Passkey setup

On first initialization, you will be required to add a Passkey. You can also edit Passkeys by authenticating and clicking on the gear icon to change the current configuration.

![image](https://github.com/user-attachments/assets/71c27326-8a68-43ad-8394-5cb03ccf7b01)

## Flask-based backend

![image](https://github.com/user-attachments/assets/70901b07-07bc-4ee0-a7e5-de150f426dc8)

The backend is a Flask powered web server that runs locally on your machine and is responsible for generating unique passwords based on the input private key generated and the "code" supplied by you.
There are two flavours:

- OtterServer, this backend only supports password generation direct from address and user inputted code.
- OtterServer_WebAuthN, this adds support for WebAuthN allowing for passkey and biometric authentication support. The server requires a virtualenv such as pipenv or conda for proper functionality.

# Art Credits
Credits to @chockie for the art assets used in this project.
