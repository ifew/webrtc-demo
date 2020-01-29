"use strict";
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.Server(app);
const io = require('socket.io')(httpServer);
const port = 9000;

io.on('connection', client => {
    console.log('user connected');
  
    client.on('disconnect', () => {
        console.log('user disconnected');
        client.broadcast.emit('user disconnected');
    })

    client.on('stream',function(data){
        console.log('got stream:' + JSON.stringify(data));
        client.broadcast.emit('stream',data);  
    });

     client.on('message', function (data) {
      console.log('got message:' + data);
      client.broadcast.emit('message', data);
    });
});

httpServer.listen(port, () => {
    console.log('Starting Websocker Server on http://localhost:' + port);
});