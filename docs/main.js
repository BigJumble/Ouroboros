import { Database } from "./database.js";
import { MessageExample } from './types.mjs';
import { validateJSON } from './validator.mjs';
export class MyConnections {
    // MAKE SURE NOTHING IS EVALUATED ON LOAD, SINCE THIS CLASS IS USED IN SERVER FOR TYPE CHECKING
    static peer;
    static clientPeers = {};
    static heartBeatID;
    static dyingNodeConn;
    static nodeId;
    static init(nodeId) {
        this.nodeId = nodeId;
        this.peer = new Peer(`ouroboros-node-${nodeId}-3c4n89384fyn73c4345`);
        this.peer.on('open', (id) => {
            window.logToTerminal(`OPENED: ${id}`);
            this.getDataFromDyingNode(nodeId);
        });
        this.peer.on('connection', (conn) => this.handleConnection(conn));
        setInterval(() => this.heartBeat(), 15000);
    }
    static getDataFromDyingNode(nodeId) {
        this.dyingNodeConn = this.peer.connect(`ouroboros-node-${(nodeId + 1) % 2}-3c4n89384fyn73c4345`);
        this.dyingNodeConn.on('open', () => {
            window.logToTerminal("GETTING DATA FROM A DYING NODE!");
            this.dyingNodeConn.on('data', (data) => {
                Database.store(JSON.parse(data));
                this.dyingNodeConn.close();
            });
        });
        this.dyingNodeConn.on('error', (data) => { window.logToTerminal(data); });
        this.dyingNodeConn.on('close', () => { window.logToTerminal("I GOT DATA! DYING NODE CLOSED."); });
    }
    static handleConnection(conn) {
        conn.on('open', () => this.handleOpen(conn));
    }
    static handleOpen(conn) {
        window.logToTerminal(conn.peer);
        if (conn.peer === `ouroboros-node-${(this.nodeId + 1) % 2}-3c4n89384fyn73c4345`) {
            this.handleDying(conn);
            return;
        }
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
    static handleDying(conn) {
        window.logToTerminal("I'M DYING! SENDING ALL DATA TO NEW NODE!");
        window.logToTerminal("DISCONNECTING ALL USERS!");
        for (const cli in this.clientPeers) {
            // this.clientPeers[cli].conn.send("switch-node");
            this.clientPeers[cli].conn.close();
            window.logToTerminal(`DISCONNECTED ${cli}`);
        }
        conn.send(JSON.stringify(Database.messages));
        window.killmyself();
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
