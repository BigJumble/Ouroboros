import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
app.use(express.static("./out"));

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    // Echo back to the client
    ws.send(data.toString());
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
  console.log('WebSocket server running on ws://localhost:3001');
});