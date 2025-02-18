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

There is a third hidden input, base which is derived from the website's fully qualified domain name (www.example.com) 
This input is hashed and sent over which allows the password scrambler to vary its input based on the current tab, whilst only requiring the user (you) to remember the code (or use passkey).

### Web AuthN based authentication with Passkey

This requires the OtterServer with WebAuthN support. Clicking on the biometric button on the right of the code input field activates the authentication session that has a lifetime of 10 seconds.

![image](https://github.com/user-attachments/assets/e74e478a-32cb-49fd-974e-12425e9c3d77)

After authentication is successful, the password is automatically filled in.

![image](https://github.com/user-attachments/assets/1bb62e22-da70-45fe-b553-03609cb07a43)

### Automatic login based on supplied code
By using a Passkey, the backend can authenticate you and automatically generate the password based on a pre-existing code you supply! The code is hashed and only accessible to the server and never transmitted to the extension. To start, enter the code into the field and click on the biometric icon to start setting up a passkey based on that context.

### Passkey setup

On first initialization, you will be required to add a Passkey. You can also edit Passkeys by authenticating and clicking on the gear icon to change the current configuration.

![image](https://github.com/user-attachments/assets/71c27326-8a68-43ad-8394-5cb03ccf7b01)

## Flask-based backend

![image](https://github.com/user-attachments/assets/70901b07-07bc-4ee0-a7e5-de150f426dc8)

The backend is a Flask powered web server that runs locally on your machine and is responsible for generating unique passwords based on the input private key generated and the "code" supplied by you.
There are two flavours:

- OtterServer, this backend only supports password generation direct from address and user inputted code.
- OtterServer_WebAuthN, this adds support for WebAuthN allowing for passkey and biometric authentication support. The server requires a virtualenv such as pipenv or conda for proper functionality.

### The Flow

- The hashed base, salt and unhashed path to the key relative to the server is retrieved from the extension's POST request.
- The base is used as the input vector to be transformed and converted from string to numerical numpy array for processing.
- The salt is used as a seed for the Python random number generator to scramble the base. The base is recursively scrambled 3 times.
- The key (which is a NxN invertible matrix with a minimum condition value of 500000 or more) is multiplied with the base to generate a new vector.
- The vector is unrolled and modular arithmetic is applied to map extraneous values into the range of ASCII values, based on whether or not numeric values or symbols are desired.
- The vector is converted into a string and transmitted back to the Chrome extension as a reply to the POST request.

# Art Credits
Credits to @chockie for the art assets used in this project.
