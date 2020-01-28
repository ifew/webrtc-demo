"use strict";
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.Server(app);
const io = require('socket.io')(httpServer);
const port = 9000;

io.on('connection', client => {
    console.log('user connected')
  
    client.on('disconnect', () => {
        console.log('user disconnected')
    })

    client.on('sent-message', function (message) {
        io.sockets.emit('new-message', message)
    })
})

httpServer.listen(port, () => {
    console.log('Starting Websocker Server on http://localhost:' + port);
});