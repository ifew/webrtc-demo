"use strict";
const fs = require('fs');
const express = require('express');
const app = express();
//const http = require('http');
//const httpServer = http.Server(app);
const https = require('https');
const privateKey  = fs.readFileSync("server.key", 'utf8');
const certificate = fs.readFileSync("server.crt", 'utf8');
const credentials = {key: privateKey, cert: certificate};
const httpsServer = https.createServer(credentials, app);
const io = require('socket.io')(httpsServer);
const child_process = require('child_process');
const port = 9000;

io.on('connection', function (client) {
  console.log('user connected');
  client.emit('server_status', 'user connected');

  client.on('disconnect', function () {
    console.log('user disconnected');
    ffmpeg.kill('SIGINT');
    client.emit('server_status', 'user disconnected');
  });

  const rtmpUrl = decodeURIComponent("rtmp://rtmp-global.cloud.vimeo.com/live/98e68e23-034c-4943-8a2a-2b28fc9e4b5e");
  console.log('Target RTMP URL:', rtmpUrl);
  console.log('Checkout Live on URL:', "https://vimeo.com/event/33942");
 
  //code sample from https://github.com/fbsamples/Canvas-Streaming-Example/blob/master/server.js
  const ffmpeg = child_process.spawn('ffmpeg', [
    // Facebook requires an audio track, so we create a silent one here.
    // Remove this line, as well as `-shortest`, if you send audio from the browser.
    '-f', 'lavfi', '-i', 'anullsrc',
    
    // FFmpeg will read input video from STDIN
    '-i', '-',

    //try to reduce low latency (normally 30sec)
    '-preset', 'ultrafast', '-tune', 'zerolatency', '-threads', '1', '-thread_type', 'slice',
    
    // Because we're using a generated audio source which never ends,
    // specify that we'll stop at end of other input.  Remove this line if you
    // send audio from the browser.
    '-shortest',
    
    // If we're encoding H.264 in-browser, we can set the video codec to 'copy'
    // so that we don't waste any CPU and quality with unnecessary transcoding.
    // If the browser doesn't support H.264, set the video codec to 'libx264'
    // or similar to transcode it to H.264 here on the server.
    // '-c:v','libvpx-vp9',
    // '-c:a','libopus',
    // '-vcodec', 'copy',
    '-vcodec', 'libx264',
    
    // AAC audio is required for Facebook Live.  No browser currently supports
    // encoding AAC, so we must transcode the audio to AAC here on the server.
    '-acodec', 'aac',
    
    // FLV is the container format used in conjunction with RTMP
    '-f', 'flv',
    
    // The output RTMP URL.
    // For debugging, you could set this to a filename like 'test.flv', and play
    // the resulting file with VLC.
    rtmpUrl 
  ]);
  
  // If FFmpeg stops for any reason, close the WebSocket connection.
  ffmpeg.on('close', (code, signal) => {
    console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
    client.terminate;
  });
  
  // Handle STDIN pipe errors by logging to the console.
  // These errors most commonly occur when FFmpeg closes and there is still
  // data to write.  If left unhandled, the server will crash.
  ffmpeg.stdin.on('error', (e) => {
    console.log('FFmpeg STDIN Error', e);
  });
  
  // FFmpeg outputs all of its messages to STDERR.  Let's log them to the console.
  ffmpeg.stderr.on('data', (data) => {
    console.log('FFmpeg STDERR:', data.toString());
  });

  client.on('message', function (data) {
    //console.log('message:' + data);
    ffmpeg.stdin.write(data);
  })

  client.on('close', (e) => {
    ffmpeg.kill('SIGINT');
  });

});

httpsServer.listen(port, () => {
  console.log('Starting Socket.io Server on http://localhost:' + port);
});