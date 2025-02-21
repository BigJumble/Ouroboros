import { Database } from "./database";
import { type Message, MessageExample, type ServerNodes } from './types';
import { validateJSON } from './validator';
import Peer, { DataConnection } from 'peerjs';

type PeerErrorType = "disconnected" | "browser-incompatible" | "invalid-id" | "invalid-key" | "network" | 
    "peer-unavailable" | "ssl-unavailable" | "server-error" | "socket-error" | "socket-closed" | 
    "unavailable-id" | "webrtc" ;
type ClientErrorType = "not-open-yet" | "message-too-big" | "negotiation-failed" | "connection-closed";

declare global {
    interface Window {
        logToTerminal: (text: string) => void;
        killmyself: () => void;
        startPages: (payload: string) => void;
        getNodes: () => Promise<ServerNodes>;
    }
}

interface Clients {
    [key: string]: DataConnection;
}

export class MyConnections {
    // MAKE SURE NOTHING IS EVALUATED ON LOAD, SINCE THIS CLASS IS USED IN ./server FOR TYPE CHECKING

    static serverPeer: Peer;
    static clientPeers: Clients;
    static heartBeatID: number;
    static dyingNodeConn: DataConnection;

    static nodes: ServerNodes;
    static currentNodeID: string;
    static oldNodeID: string;
    static oldNodeConn: DataConnection;
    // static oldNodes: ServerNodes;

    static async getNodesData() {
        const nodes = await window.getNodes();
        return nodes as ServerNodes;
    }


    static init(id: string | null = null) {
        this.nodes = {};

        // this.oldNodes = {};
        this.clientPeers = {};
        if(id)
        {
            this.serverPeer = new Peer(id, {
                config: {
                    'iceServers': [
                    { urls: "stun:stun3.l.google.com:3478" },
                    { urls: "stun:stun3.l.google.com:5349" },
                    { urls: "stun:stun4.l.google.com:19302" },
                    { urls: "stun:stun4.l.google.com:5349" }
                ]
                }
            });
        }
        else
        {

            this.serverPeer = new Peer({
                config: {
                    'iceServers': [
                    { urls: "stun:stun3.l.google.com:3478" },
                    { urls: "stun:stun3.l.google.com:5349" },
                    { urls: "stun:stun4.l.google.com:19302" },
                    { urls: "stun:stun4.l.google.com:5349" }
                ]
                }
            });
        }

        this.serverPeer.on('open', (id) => this.handleServerOpen(id));
        this.serverPeer.on("error", (err) => this.handleServerError(err.message, err.type, err.cause, err.name));    
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



        } catch (error) {
            // console.log(error);
            window.logToTerminal(`Failed to get node data: ${error}`);
        }
    }

    static async handleServerOpen(id: string) {
        window.logToTerminal(`Connected to Signaling Server as: ${id}`);
        this.serverPeer.on('connection', (conn: DataConnection) => this.handleConnection(conn));
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
        this.hardReconnect();
        // this.serverPeer.reconnect();
    }

    static async handleServerError(message: string, type: PeerErrorType, cause:unknown, name:string) {
        await window.logToTerminal(`ERROR HANDLER:\nMSG: ${message}\nTYPE: ${type}\nCAUSE: ${cause}\nNAME: ${name}`);

        if(type === "peer-unavailable") return; // when connecting to an old server

        if (type === "disconnected" || type === "network") {
            await window.logToTerminal("RECONNECTING...");
            this.serverPeer.reconnect();
        }
        else if(type !== "unavailable-id")
        {
            await window.logToTerminal("HARD RECONNECTING...");
            this.hardReconnect();
        }
        else
        {
            await window.logToTerminal("CAN'T RECONNECT! UNAVAILABLE ID! GGWP! SHUTTING DOWN!");
            this.serverPeer.destroy();
            window.killmyself();
        }
    }

    static hardReconnect() {
        this.serverPeer.destroy();
        this.clientPeers = {};
        setTimeout(() => {
            this.init();
        }, 60000);
    }

    // HANDLE CLIENT CONNECTIONS ====================

    static handleConnection(conn: DataConnection) {
        conn.on('open', () => this.handleOpen(conn));

        conn.on('error', (err) => this.handleClientDisconnect(err.message,err.type, conn));
        conn.on('close', () => this.handleClientDisconnect(null, null, conn));
    }

    static handleOpen(conn: DataConnection) {
        window.logToTerminal(`User connected: ${conn.peer}`);
        this.clientPeers[conn.peer] = conn;
        conn.on('data', (data) => this.handleData(conn.peer, data));
    }

    static handleData(peerId: string, data: any) {

        if (data === "time to die") {
            this.handleDying(this.clientPeers[peerId]);
        }
        else if (!isNaN(Number(data))) {
            // window.logToTerminal(`Received number: ${num}`);
            this.clientPeers[peerId].send(Database.get(Number(data)));
        }
        else {
            const parsed = validateJSON<Message>(data, MessageExample);
            if (parsed.success) {
                Database.store(parsed.data!);
                const latest = Database.getLatest();
                for (const cli in this.clientPeers) {
                    this.clientPeers[cli].send(latest);
                }
            }
            else {
                window.logToTerminal(parsed.error!);
            }
        }
    }

    static handleClientDisconnect(message: string | null, type: ClientErrorType | null, conn: DataConnection) {

        if (message) {
            window.logToTerminal(`CLIENT: ${message}`);
            window.logToTerminal(`CLIENT ERROR TYPE: ${type}`);
            window.logToTerminal(`Disconnected: ${conn.peer}`);
        }
        else {
            window.logToTerminal(`Disconnected: ${conn.peer}`);
        }
        this.clientPeers[conn.peer].close();
        delete this.clientPeers[conn.peer];
    }

    // HANDLE CONNECTION TO THE OLD SERVER ====================

    static handleOldServerConnection(id: string) {
        window.logToTerminal(`Connecting to the old server: ${id}`);
        this.oldNodeConn = this.serverPeer.connect(id);
        this.oldNodeConn.on('open', () => this.handleOldServerOpen());
    }

    static handleOldServerOpen() {
        window.logToTerminal(`Connected to the old server: ${this.oldNodeConn.peer}`);
        this.oldNodeConn.on('data', (data) => this.handleOldServerData(data));
        this.oldNodeConn.send("time to die");
    }

    static handleOldServerData(data: any) {
        window.logToTerminal(`Received data from the old server!`);
        Database.restore(JSON.parse(data));
    }



    // I AM THE OLD SERVER ====================

    static async handleDying(conn: DataConnection) {

        //confirm that this is actually the new server
        const nodes = await this.getNodesData();
        const nodeKeys = Object.keys(nodes).map(Number);
        const newNodeKey = Number(Math.max(...nodeKeys));
        const newNode = nodes[newNodeKey];

        if (newNode !== conn.peer) {
            window.logToTerminal("FAKE CALL! I'M NOT DYING!");
            return;
        }

        await window.logToTerminal("I'M DYING! SENDING ALL DATA TO THE NEW SERVER!");
        // window.logToTerminal("DISCONNECTING ALL USERS!");

        // for (const cli in this.clientPeers) {
        //     // this.clientPeers[cli].conn.send("switch-node");
        //     this.clientPeers[cli].conn.close();
        //     window.logToTerminal(`DISCONNECTED ${cli}`);
        // }

        conn.send(JSON.stringify(Database.messages));
        this.serverPeer.destroy();
        await window.logToTerminal("DATA SENT! SHUTTING DOWN!");
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

    static send(peerid: string, message: string) {
        this.clientPeers[peerid].send(message);
    }
}