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

    client.on('stream',function(streamingData){
        console.log('user stream:' + streamingData)
        client.broadcast.emit('stream',streamingData);  
    });

    // client.on('streamStart',function (stream) {
    //     io.stream = stream;
    //     io.emit('echo', io.stream + '<br />');
    //     var proc = new ffmpeg({source: io.stream})
    //         .withAspect('4:3')
    //         .withSize('640x480')
    //         .videoCodec('libx264')
    //         .audioCodec('libmp3lame')
    //         .applyAutopadding(true, 'white')
    //         .saveToFile('out.mp4', function(retcode, error){
    //             io.emit('echo', 'file has been converted succesfully <br />');
    //         });
    // })
})

io.of('/stream').clients((error, clients) => {
if (error) throw error;
    console.log(clients);
});

httpServer.listen(port, () => {
    console.log('Starting Websocker Server on http://localhost:' + port);
});