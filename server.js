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
    // console.log('got stream:' + data);
    var input_data = data;
    //client.emit('stream',data);
    var rtmpUrl = 'rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922';
    var ffmpeg_args = ['-protocol_whitelist', '"pipe,file,udp,rtp"', '-strict', '-2', '-i', input_data, '-c', 'copy', '-flvflags', 'no_duration_filesize', '-f', 'flv', rtmpUrl];

    ffmpeg_args = ['-f','avfoundation','-framerate','30','-pix_fmt','uyvy422','-i',input_data,'-s','640x360','-pix_fmt','uyvy422','-vcodec','libx264','-preset:v','ultrafast','-tune:v','zerolatency','-f','flv',rtmpUrl];

    // ffmpeg_args = ['-re','-i','SampleVideo_1280x720_5mb.mp4','-c','copy','-flvflags','no_duration_filesize','-f','flv','rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922'];
    spawn('ffmpeg', ffmpeg_args);
    console.log('Spawning ffmpeg ' + ffmpeg_args.join(' '));
    client.broadcast.emit('stream', data);
  });
});

httpServer.listen(port, () => {
  console.log('Starting Websocker Server on http://localhost:' + port);
});