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
  console.log('Starting Socket.io Server on https://localhost:' + port);
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

  const rtmpUrl = decodeURIComponent("rtmp://rtmp-global.cloud.vimeo.com/live/d50d4250-0692-4c9b-be06-666826d6c1c3");
  // const rtmpUrl = decodeURIComponent("rtmp://x.rtmp.youtube.com/live2/z52r-zurz-6u2g-m12g-90pa");
  console.log('Target RTMP URL:', rtmpUrl);
  console.log('Checkout Live on URL:', "https://vimeo.com/event/795267");
 
  // ffmpeg -f avfoundation -framerate 30 -pix_fmt uyvy422 -i "0" -s 1920x1080 -vcodec libx264 
  // -preset:v ultrafast -tune:v zerolatency -flvflags no_duration_filesize  -framerate 30 -vf showinfo 
  // -f flv rtmps://rtmp-global.cloud.vimeo.com:443/live/236536ce-0a7f-4e73-aed2-708620bbb8d3

  // ffmpeg -re -i pipe:0 -c:v libx264 -preset veryfast -maxrate 3000k 
  // -bufsize 6000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 160k -ac 2 -ar 44100 
  // -f flv rtmp://rtmp-global.cloud.vimeo.com/live/d50d4250-0692-4c9b-be06-666826d6c1c3

  // const ffmpeg = child_process.spawn('ffmpeg', [
  //   '-re', 
  //   '-f', 'lavfi', 
  //   '-i', 'anullsrc',
  //   '-i', '-',
  //   '-c:v', 'libx264',
  //   '-maxrate', '3000k',
  //   '-bufsize', '6000k',
  //   '-pix_fmt', 'yuv420p',
  //   '-g', '50',
  //   '-c:a', 'aac',
  //   '-b:a', '160k',
  //   '-ac', '2',
  //   '-ar', '44100',
  //   '-preset', 'veryfast',
  //   '-f', 'flv',
  //   rtmpUrl,
  // ]);

  const ffmpeg = child_process.spawn('ffmpeg', [
    '-f', 'lavfi', 
    '-thread_queue_size', '4096',
    '-i', 'anullsrc',
    '-i', '-',
    '-shortest',
    '-vcodec', 'copy',
    '-maxrate', '3000k',
    '-bufsize', '6000k',
    '-acodec', 'aac',
    '-b:a', '160k',
    '-preset', 'veryfast',
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