import { Database } from "./database.js";
import { MessageExample } from './types.mjs';
import { validateJSON } from './validator.mjs';
export class MyConnections {
    // MAKE SURE NOTHING IS EVALUATED ON LOAD, SINCE THIS CLASS IS USED IN SERVER FOR TYPE CHECKING
    static peer;
    static clientPeers = {};
    static init() {
        this.peer = new Peer("ouroboros-node-0-3c4n89384fyn73c4345");
        this.peer.on('open', function (id) {
            console.log('My peer ID is: ' + id);
        });
        this.peer.on('connection', this.handleConnection.bind(this));
        setInterval(() => this.heartBeat(), 15000);
    }
    static handleConnection(conn) {
        conn.on('open', () => this.handleOpen(conn));
    }
    static handleOpen(conn) {
        this.clientPeers[conn.peer] = { conn, isAlive: true };
        conn.on('data', (data) => this.handleData(conn.peer, data));
    }
    static handleData(peerId, data) {
        if (data === "pong") {
            this.clientPeers[peerId].isAlive = true;
            return;
        }
        const num = Number(data);
        if (!isNaN(num)) {
            window.logToTerminal(`Received number: ${num}`);
            this.clientPeers[peerId].conn.send(Database.get(num));
            return;
        }
        const parsed = validateJSON(data, MessageExample);
        if (parsed.success) {
            Database.store(parsed.data);
            const latest = Database.getLatest();
            for (const cli in this.clientPeers) {
                this.clientPeers[cli].conn.send(latest);
            }
        }
        else {
            window.logToTerminal(parsed.error);
        }
        // window.sendDataToNode(peerId, data);
    }
    static heartBeat() {
        for (const cli in this.clientPeers) {
            if (this.clientPeers[cli].isAlive === false) {
                this.clientPeers[cli].conn.close();
                delete this.clientPeers[cli];
                // console.log("Dead:", cli);
                window.logToTerminal(`Disconnected: ${cli}`);
                continue;
            }
            // console.log("Pinging:", cli);
            this.clientPeers[cli].isAlive = false;
            this.clientPeers[cli].conn.send("ping");
        }
    }
    static send(peerid, message) {
        this.clientPeers[peerid].conn.send(message);
    }
}
