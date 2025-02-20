import { Database } from "./database.js";
import { MessageExample } from './types.mjs';
import { validateJSON } from './validator.mjs';
export class MyConnections {
    // MAKE SURE NOTHING IS EVALUATED ON LOAD, SINCE THIS CLASS IS USED IN ./server FOR TYPE CHECKING
    static serverPeer;
    static clientPeers;
    static heartBeatID;
    static dyingNodeConn;
    static nodes;
    static init() {
        this.serverPeer = new Peer({
            config: {
                'iceServers': [
                    // { urls: "stun:stun.l.google.com:19302" },
                    // { urls: "stun:stun.l.google.com:5349" },
                    // { urls: "stun:stun1.l.google.com:3478" },
                    // { urls: "stun:stun1.l.google.com:5349" },
                    // { urls: "stun:stun2.l.google.com:19302" },
                    // { urls: "stun:stun2.l.google.com:5349" },
                    { urls: "stun:stun3.l.google.com:3478" },
                    { urls: "stun:stun3.l.google.com:5349" },
                    { urls: "stun:stun4.l.google.com:19302" },
                    { urls: "stun:stun4.l.google.com:5349" }
                ]
            }
        });
        this.serverPeer.on('open', (id) => this.handleServerOpen(id));
        this.serverPeer.on("error", (err) => this.handleServerError(err));
    }
    static async getNodes() {
        try {
            const response = await fetch('https://bigjumble.github.io/Ouroboros/nodes.json');
            const data = await response.json();
            window.logToTerminal(`Retrieved server nodes data from GitHub Pages`);
            window.logToTerminal(JSON.stringify(data));
            const nodes = JSON.parse(data);
            if (nodes)
                this.nodes = JSON.parse(data);
            // this.getDataFromDyingNode();
        }
        catch (error) {
            window.logToTerminal(`Failed to get node data: ${JSON.stringify(error)}`);
        }
    }
    static handleServerOpen(id) {
        window.logToTerminal(`Connected to Signaling Server.`);
        window.logToTerminal(`Fetching old node data from GitHub Pages...`);
        this.getNodes();
        this.serverPeer.on('connection', (conn) => this.handleConnection(conn));
        this.serverPeer.on("disconnected", () => this.handleServerDisconnect());
        // setInterval(() => this.heartBeat(), 15000);
    }
    static handleServerDisconnect() {
        window.logToTerminal("DISCONNECTED FROM SERVER! RECONNECTING...");
        this.serverPeer.reconnect();
    }
    static handleServerError(err) {
        // if (`${err}`.includes("ouroboros-node")) return;
        if (`${err}`.includes("Lost connection to server")) {
            this.serverPeer.reconnect();
        }
        // if (!`${err}`.includes("is taken")) {
        //     window.logToTerminal(`${err}, CLEANING UP!`);
        //     this.cleanup();
        // }
        // else {
        //     window.logToTerminal(`ALL IS LOST AND THERE IS NO HOPE! jk`);
        // }
    }
    static cleanup() {
        for (const peerId in this.clientPeers) {
            this.clientPeers[peerId].conn.close();
            delete this.clientPeers[peerId];
        }
        if (this.dyingNodeConn) {
            this.dyingNodeConn.close();
        }
        this.serverPeer.destroy();
        this.init();
    }
    // static getDataFromDyingNode() {
    //     this.dyingNodeConn = this.serverPeer.connect(`ouroboros-node-${(nodeId + 1) % 2}-3c4n89384fyn73c4345`);
    //     this.dyingNodeConn.on('open', () => {
    //         window.logToTerminal("GETTING DATA FROM A DYING NODE!");
    //         this.dyingNodeConn.on('data', (data) => {
    //             Database.restore(JSON.parse(data));
    //             this.dyingNodeConn.close();
    //         })
    //     })
    //     this.dyingNodeConn.on('error', (data) => { window.logToTerminal(data) })
    //     this.dyingNodeConn.on('close', () => { window.logToTerminal("I GOT DATA! DYING NODE CLOSED.") })
    // }
    static handleConnection(conn) {
        conn.on('open', () => this.handleOpen(conn));
    }
    static handleOpen(conn) {
        window.logToTerminal(conn.peer);
        // if (conn.peer === `ouroboros-node-${(this.nodeId + 1) % 2}-3c4n89384fyn73c4345`) {
        //     this.handleDying(conn);
        //     return;
        // }
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
        window.logToTerminal("DATA SENT! SHUTTING DOWN!");
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
