declare global {
    interface Window {
        sendDataToNode: (peerid: string, data: string) => void;
    }
}

interface Clients{
    [key: string]: PeerJs.DataConnection;

}

export class MyConnections
{
    // MAKE SURE NOTHING IS EVALUATED ON LOAD, SINCE IT IS USED IN SERVER FOR TYPE CHECKING
    static peer: PeerJs.Peer;
    static clientPeers: Clients = {};

    static init(){
        this.peer = new Peer("ouroboros-node-0-3c4n89384fyn73c4345");
        this.peer.on('open', function (id) {
            console.log('My peer ID is: ' + id);
        });
        
        this.peer.on('connection',  (conn) => {
            conn.on('open', () => {
                this.clientPeers[conn.peer] = conn;
                console.log(this.clientPeers);
                // Receive messages
                conn.on('data', function (data) {
                    console.log('Received', data);
                    window.sendDataToNode(conn.peer, data);
                    // log this to puppeteer console
                });
        
                // Send messages
                conn.send(`Hello peer ${conn.peer} !`);
        
                // setInterval(()=>{conn.send(`Hello peer ${conn.peer} !`);},1000);
            });
        });
    }
    static send(peerid:string,message:string)
    {
        this.clientPeers[peerid].send(message);
    }
}