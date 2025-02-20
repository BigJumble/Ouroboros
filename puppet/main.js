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
    static currentNodeID;
    static oldNodeID;
    static oldNodeConn;
    // static oldNodes: ServerNodes;
    static async getNodesData() {
        const nodes = await window.getNodes();
        return nodes;
    }
    static init() {
        this.nodes = {};
        // this.oldNodes = {};
        this.clientPeers = {};
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
    // HANDLE CURRENT SERVER CONNECTION ====================
    static async getServerNodes() {
        try {
            const nodes = await this.getNodesData();
            window.logToTerminal(`Retrieved server nodes data from GitHub Pages`);
            const nodeKeys = Object.keys(nodes).map(Number);
            const latestNodeKey = Number(Math.max(...nodeKeys));
            const latestNode = nodes[latestNodeKey];
            this.nodes[latestNodeKey] = latestNode; // add the dying node to the new nodes
            this.nodes[new Date().getTime()] = this.serverPeer.id; // add the current node to the new nodes
            this.currentNodeID = this.serverPeer.id;
            this.oldNodeID = latestNode;
            // window.logToTerminal(`Old Nodes: ${JSON.stringify(nodes)}`);
            // window.logToTerminal(`New Nodes: ${JSON.stringify(this.nodes)}`);
            // output nodes to github pages
            window.startPages(JSON.stringify(this.nodes));
        }
        catch (error) {
            // console.log(error);
            window.logToTerminal(`Failed to get node data: ${error}`);
        }
    }
    static async handleServerOpen(id) {
        window.logToTerminal(`Connected to Signaling Server as: ${id}`);
        this.serverPeer.on('connection', (conn) => this.handleConnection(conn));
        this.serverPeer.on("disconnected", () => this.handleServerDisconnect());
        window.logToTerminal(`Sending nodes data to GitHub Pages...`);
        await this.getServerNodes();
        setTimeout(() => {
            this.handleOldServerConnection(this.oldNodeID);
        }, 80000); // wait 1.2 minutes for Pages to update
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
        //     window.logToTerminal(`ALL IS LOST AND THERE IS NO HOPE!`);
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
    // HANDLE CLIENT CONNECTIONS ====================
    static handleConnection(conn) {
        conn.on('open', () => this.handleOpen(conn));
        conn.on('error', (err) => this.handleClientDisconnect(err, conn));
        conn.on('close', () => this.handleClientDisconnect(null, conn));
    }
    static handleOpen(conn) {
        window.logToTerminal(`User connected: ${conn.peer}`);
        this.clientPeers[conn.peer] = { conn, isAlive: true };
        conn.on('data', (data) => this.handleData(conn.peer, data));
    }
    static handleData(peerId, data) {
        if (data === "pong") {
            this.clientPeers[peerId].isAlive = true;
        }
        else if (data === "time to die") {
            this.handleDying(this.clientPeers[peerId].conn);
        }
        else if (!isNaN(Number(data))) {
            // window.logToTerminal(`Received number: ${num}`);
            this.clientPeers[peerId].conn.send(Database.get(Number(data)));
        }
        else {
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
        }
    }
    static handleClientDisconnect(err, conn) {
        if (err) {
            window.logToTerminal(`CLIENT ERROR: ${err}`);
            window.logToTerminal(`Disconnected: ${conn.peer}`);
        }
        else {
            window.logToTerminal(`Disconnected: ${conn.peer}`);
        }
        this.clientPeers[conn.peer].conn.close();
        delete this.clientPeers[conn.peer];
    }
    // HANDLE CONNECTION TO THE OLD SERVER ====================
    static handleOldServerConnection(id) {
        window.logToTerminal(`Connecting to the old server: ${id}`);
        this.oldNodeConn = this.serverPeer.connect(id);
        this.oldNodeConn.on('open', () => this.handleOldServerOpen());
    }
    static handleOldServerOpen() {
        window.logToTerminal(`Connected to the old server: ${this.oldNodeConn.peer}`);
        this.oldNodeConn.on('data', (data) => this.handleOldServerData(data));
        this.oldNodeConn.send("time to die");
    }
    static handleOldServerData(data) {
        window.logToTerminal(`Received data from the old server!`);
        Database.restore(JSON.parse(data));
    }
    // I AM THE OLD SERVER ====================
    static async handleDying(conn) {
        //confirm that this is actually the new server
        const nodes = await this.getNodesData();
        const nodeKeys = Object.keys(nodes).map(Number);
        const newNodeKey = Number(Math.max(...nodeKeys));
        const newNode = nodes[newNodeKey];
        window.logToTerminal(`New Node: ${newNode}`);
        if (newNode !== conn.peer) {
            window.logToTerminal("FAKE CALL! I'M NOT DYING!");
            return;
        }
        window.logToTerminal("I'M DYING! SENDING ALL DATA TO THE NEW SERVER!");
        // window.logToTerminal("DISCONNECTING ALL USERS!");
        // for (const cli in this.clientPeers) {
        //     // this.clientPeers[cli].conn.send("switch-node");
        //     this.clientPeers[cli].conn.close();
        //     window.logToTerminal(`DISCONNECTED ${cli}`);
        // }
        conn.send(JSON.stringify(Database.messages));
        this.serverPeer.destroy();
        window.logToTerminal("DATA SENT! SHUTTING DOWN!");
        window.killmyself();
    }
    // HEART BEAT ==================== idk if this is needed
    // static heartBeat() {
    //     for (const cli in this.clientPeers) {
    //         if (this.clientPeers[cli].isAlive === false) {
    //             this.clientPeers[cli].conn.close();
    //             delete this.clientPeers[cli];
    //             // console.log("Dead:", cli);
    //             window.logToTerminal(`Disconnected: ${cli}`);
    //             continue;
    //         }
    //         // console.log("Pinging:", cli);
    //         this.clientPeers[cli].isAlive = false;
    //         this.clientPeers[cli].conn.send("ping");
    //     }
    // }
    // SEND DATA TO CLIENT NODES ====================
    static send(peerid, message) {
        this.clientPeers[peerid].conn.send(message);
    }
}
