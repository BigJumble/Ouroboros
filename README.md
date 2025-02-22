# Ouroboros
A self-sustaining P2P server system using GitHub Actions runners

## Overview
Ouroboros is a unique P2P server implementation that uses GitHub Actions runners to maintain a persistent server presence. It creates a self-sustaining cycle where each server instance spawns its successor before terminating, ensuring continuous uptime within GitHub Actions' time constraints.

## How It Works

### Server Lifecycle
1. A GitHub Actions runner starts up and initializes a PeerJS peer that acts as a server
2. The server runs for approximately 2 hours (to avoid WebRTC timeout issues)
3. Before termination, it:
   - Triggers a new runner instance 
   - Transfers all data to the new server
   - Updates the server ID in GitHub Pages
4. The cycle continues with the new server instance

### Key Components
- **GitHub Actions**: Provides the compute infrastructure via runners
- **PeerJS**: Handles WebRTC P2P connections and provides a free signaling server
- **GitHub Pages**: Stores and serves the current active server ID
- **Puppeteer**: Runs the server code in a browser environment since WebRTC is not supported in Node.js

### Workflows
- `ouroboros.yml`: Main server workflow that runs the P2P server
- `static.yml`: Updates the active server IDs on GitHub Pages
- `staticRestore.yml`: Restores server IDs if needed

## Setup

1. Fork this repository
2. Create a GitHub Personal Access Token with runners access
3. Add the token as a repository secret named `RUN`
4. Enable GitHub Pages for the repository
5. Trigger the initial server by running the "Run Ouroboros server" workflow

## Technical Details

### Server Handoff Process
1. New server starts and retrieves the previous server's ID from GitHub Pages
2. After a brief delay (to allow Pages to update), it connects to the old server
3. Old server validates the new server's identity
4. Data is transferred to the new server
5. Old server terminates, new server becomes active

### Connection Management
- Server maintains a list of connected peers
- Messages are validated before processing

## Limitations
- GitHub Actions runners have a 6-hour maximum runtime
- Each runner has 16 GB of RAM and 4 cores
- Potential brief interruptions during server handoff
- GitHub may shut this down at any time

## Future Work (will not continue development)
- Implement multiple **Ouroboros** nodes to avoid downtime and provide horizontal scaling
- Implement message deletion when reaching **RAM** limits
- Implement a more robust server handoff process
- Implement a more robust way to transfer data
- Implement backup **Signaling Server** using **Reverse Proxy** (**Ngrok**)

## License
MIT License - See LICENSE file for details

