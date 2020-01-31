"use strict";
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.Server(app);
const io = require('socket.io')(httpServer);
const spawn = require('child_process').spawn;
const port = 9000;

io.on('connection', function (client) {
  console.log('user connected');

  client.on('disconnect', function () {
    console.log('user disconnected');
    client.emit('user disconnected');
  })

  client.on('stream', function (data) {
    console.log('got stream:' + data);
    //client.emit('stream',data);  
    var rtmpUrl = 'rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922';
    var ffmpeg_args = ['-protocol_whitelist', '"pipe,file,udp,rtp"', '-strict', '-2', '-i', data, '-c', 'copy', '-flvflags', 'no_duration_filesize', '-f', 'flv', rtmpUrl];
    spawn('ffmpeg', ffmpeg_args);
    console.log('Spawning ffmpeg ' + ffmpeg_args.join(' '));
  });
});

httpServer.listen(port, () => {
  console.log('Starting Websocker Server on http://localhost:' + port);
});