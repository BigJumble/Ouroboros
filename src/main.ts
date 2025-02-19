import { Database } from "./database.js";
import { type Message, MessageExample } from './types.mjs';
import { validateJSON } from './validator.mjs';

declare global {
    interface Window {
        sendDataToNode: (peerid: string, data: string) => void;
        logToTerminal: (text: string) => void;
        killmyself: () => void;
    }
}
interface Clinet {
    conn: PeerJs.DataConnection,
    isAlive: boolean
}

interface Clients {
    [key: string]: Clinet;

}

export class MyConnections {
    // MAKE SURE NOTHING IS EVALUATED ON LOAD, SINCE THIS CLASS IS USED IN SERVER FOR TYPE CHECKING
    static peer: PeerJs.Peer;
    static clientPeers: Clients = {};
    static heartBeatID: number;
    static dyingNodeConn: PeerJs.DataConnection;

    static nodeId: number;
    static init(nodeId: number) {
        this.nodeId = nodeId;
        this.peer = new Peer(`ouroboros-node-${nodeId}-3c4n89384fyn73c4345`);
        this.peer.on('open', (id) => {
            window.logToTerminal(`OPENED: ${id}`);
            this.getDataFromDyingNode(nodeId);
        });


        this.peer.on("disconnected", () => {
            this.peer.reconnect();
        });

        this.peer.on("error", (err) => {
            if (`${err}`.includes("ouroboros-node")) return;

            if (!`${err}`.includes("is taken")) {
                window.logToTerminal(`${err}, CLEANING UP!`);
                this.cleanup();
            }
            else {
                window.logToTerminal(`ALL IS LOST AND THERE IS NO HOPE! jk`);
            }
        })

        this.peer.on('connection', (conn: PeerJs.DataConnection) => this.handleConnection(conn));
        setInterval(() => this.heartBeat(), 15000);
    }

    static cleanup() {
        for (const peerId in this.clientPeers) {
            this.clientPeers[peerId].conn.close();
            delete this.clientPeers[peerId];
        }
        if (this.dyingNodeConn) {
            this.dyingNodeConn.close();
        }
        this.peer.destroy();
        this.init(this.nodeId);

    }

    static getDataFromDyingNode(nodeId: number) {
        this.dyingNodeConn = this.peer.connect(`ouroboros-node-${(nodeId + 1) % 2}-3c4n89384fyn73c4345`);
        this.dyingNodeConn.on('open', () => {
            window.logToTerminal("GETTING DATA FROM A DYING NODE!");

            this.dyingNodeConn.on('data', (data) => {
                Database.restore(JSON.parse(data));
                this.dyingNodeConn.close();

            })
        })
        this.dyingNodeConn.on('error', (data) => { window.logToTerminal(data) })
        this.dyingNodeConn.on('close', () => { window.logToTerminal("I GOT DATA! DYING NODE CLOSED.") })
    }

    static handleConnection(conn: PeerJs.DataConnection) {
        conn.on('open', () => this.handleOpen(conn));
    }

    static handleOpen(conn: PeerJs.DataConnection) {
        window.logToTerminal(conn.peer);
        if (conn.peer === `ouroboros-node-${(this.nodeId + 1) % 2}-3c4n89384fyn73c4345`) {
            this.handleDying(conn);
            return;
        }
        this.clientPeers[conn.peer] = { conn, isAlive: true };
        conn.on('data', (data) => this.handleData(conn.peer, data));
    }

    static handleData(peerId: string, data: any) {
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
        const parsed = validateJSON<Message>(data, MessageExample);
        if (parsed.success) {
            Database.store(parsed.data!);
            const latest = Database.getLatest();
            for (const cli in this.clientPeers) {
                this.clientPeers[cli].conn.send(latest);
            }
        }
        else {
            window.logToTerminal(parsed.error!);
        }
        // window.sendDataToNode(peerId, data);
    }

    static handleDying(conn: PeerJs.DataConnection) {
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


    static send(peerid: string, message: string) {
        this.clientPeers[peerid].conn.send(message);
    }
}