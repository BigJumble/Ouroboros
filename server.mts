// import express from 'express';


// const app = express();
// app.use(express.static("./docs"));
// app.listen(3000, () => console.log('Server running on http://localhost:3000'));



import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.static("./docs"));

// Function to get public IP
async function getPublicIP() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    return response.data.ip;
  } catch (error) {
    console.error('Error fetching public IP:', error.message);
    return null;
  }
}

// Start server and log IP
app.listen(3000, async () => {
  const publicIP = await getPublicIP();
  console.log('Server running on http://localhost:3000');
  console.log('Public IP address:', publicIP);
});


// import { WebSocketServer } from 'ws';
// import { createServer } from 'http';
// const server = createServer(app);
// const wss = new WebSocketServer({ server });

// wss.on('connection', (ws) => {
//   console.log('New client connected');

//   ws.on('message', (data) => {
//     console.log('Received:', data.toString());
//     // Echo back to the client
//     ws.send(data.toString());
//   });

//   ws.on('close', () => {
//     console.log('Client disconnected');
//   });
// });

// server.listen(3001, () => {
//   console.log('Server running on http://localhost:3001');
//   console.log('WebSocket server running on ws://localhost:3001');
// });