# Docker Setup Instructions

## Setup

- Clone this repository and change into the top-level directory

If a key is not provided, use keygen.py to generate a key before building.

Building and running your application
When you're ready, start your application by running: 
```bash
docker compose up --build.
```

It will be ready for use... Almost. The HOST_IP environment variable must be set to the IP that is reported in the logs for proper functionality.

Deploying Otter-PassGen to different devices or on a local LAN
First, build your image, e.g.: docker build -t myapp .. If your cloud uses a different CPU architecture than your development machine (e.g., you are on a Mac M1 and your cloud provider is amd64), you'll want to build the image for that platform, e.g.: docker build --platform=linux/amd64 -t myapp ..

Consult Docker's getting started docs for more detail on loading and running Docker images.

References
Docker's Python guide

If the database is corrupt or passkeys cannot be registered:

- Remove the old database:
```bash
rm app.db
```
- Create the database:
```bash
flask create-db
```

The application should be ready for passkey registration.
