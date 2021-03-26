"use strict";
const fs = require('fs');
const express = require('express');
const app = express();
const https = require('https');
const privateKey  = fs.readFileSync("server.key", 'utf8');
const certificate = fs.readFileSync("server.crt", 'utf8');
const credentials = {key: privateKey, cert: certificate};
const WebSocketServer = require('ws').Server;
const child_process = require('child_process');
const port = 9000;

const httpsServer = https.createServer(credentials, app).listen(port, () => {
  console.log('Starting Socket.io Server on http://localhost:' + port);
});

const io = new WebSocketServer({
  server: httpsServer
});

io.on('connection', function (client) {
  console.log('user connected');
  client.emit('server_status', 'user connected');

  client.on('disconnect', function () {
    console.log('user disconnected');
    ffmpeg.kill('SIGINT');
    client.emit('server_status', 'user disconnected');
  });

  const rtmpUrl = decodeURIComponent("rtmp://rtmp-global.cloud.vimeo.com/live/236536ce-0a7f-4e73-aed2-708620bbb8d3");
  console.log('Target RTMP URL:', rtmpUrl);
  console.log('Checkout Live on URL:', "https://vimeo.com/event/795267");
 
  // ffmpeg -f avfoundation -framerate 30 -pix_fmt uyvy422 -i "0" -s 1920x1080 -vcodec libx264 
  // -preset:v ultrafast -tune:v zerolatency -flvflags no_duration_filesize  -framerate 30 -vf showinfo 
  // -f flv rtmps://rtmp-global.cloud.vimeo.com:443/live/236536ce-0a7f-4e73-aed2-708620bbb8d3
  const ffmpeg = child_process.spawn('ffmpeg', [
    '-f', 'lavfi', '-i', 'anullsrc',
    '-i', '-',
    '-shortest',
    '-vcodec', 'copy',
    '-acodec', 'aac',
    '-f', 'flv',
    rtmpUrl,
  ]);
  
  ffmpeg.on('close', (code, signal) => {
    console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
    client.terminate;
  });

  ffmpeg.stdin.on('error', (e) => {
    console.log('FFmpeg STDIN Error', e);
  });
  
  ffmpeg.stderr.on('data', (data) => {
    console.log('FFmpeg STDERR:', data.toString());
  });

  client.on('message', function (data) {
    ffmpeg.stdin.write(data);
  })

  client.on('close', (e) => {
    ffmpeg.kill('SIGINT');
  });
  

});