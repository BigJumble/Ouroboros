"use strict";
let peer = new Peer("ouroboros-node-0-3c4n89384fyn73c4345");
peer.on('open', function (id) {
    console.log('My peer ID is: ' + id);
});
peer.on('connection', function (conn) {
    conn.on('open', function () {
        // Receive messages
        conn.on('data', function (data) {
            console.log('Received', data);
            window.sendDataToNode(data);
            // log this to puppeteer console
        });
        // Send messages
        conn.send(`Hello peer ${conn.peer} !`);
        // setInterval(()=>{conn.send(`Hello peer ${conn.peer} !`);},1000);
    });
});
