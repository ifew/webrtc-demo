"use strict";
const express = require('express');
const app = express();
const http = require('http');
const fs = require('fs');
const httpServer = http.Server(app);
const io = require('socket.io')(httpServer);
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

  client.on('echolog', function (data) {
    var parseData = JSON.parse(data);
    console.log('echo log:' +parseData);
  });

  const rtmpUrl = decodeURIComponent("rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922");
  console.log('Target RTMP URL:', rtmpUrl);

  const ffmpeg = child_process.spawn('ffmpeg', [
    // Facebook requires an audio track, so we create a silent one here.
    // Remove this line, as well as `-shortest`, if you send audio from the browser.
    '-f', 'lavfi', '-i', 'anullsrc',
    
    // FFmpeg will read input video from STDIN
    '-i', '-',
    
    // Because we're using a generated audio source which never ends,
    // specify that we'll stop at end of other input.  Remove this line if you
    // send audio from the browser.
    '-shortest',
    
    // If we're encoding H.264 in-browser, we can set the video codec to 'copy'
    // so that we don't waste any CPU and quality with unnecessary transcoding.
    // If the browser doesn't support H.264, set the video codec to 'libx264'
    // or similar to transcode it to H.264 here on the server.
    '-vcodec', 'copy',
    
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

  // client.on('stream', function (data) {
  //   console.log('recording stream:' + data + 'via socket id:' + client.id);
  //   client.emit('server_status', 'recording stream:' + data + 'via socket id:' + client.id);
  //   //client.emit('stream',data);  
  //   var rtmpUrl = 'rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922';
  //   //var ffmpeg_args = ['-f', 'avfoundation', '-framerate', '30', '-pix_fmt', 'uyvy422', '-i', '"0"', '-s', '640x360', '-pix_fmt', 'yuv422p', '-vcodec', 'libx264', '-preset:v', 'ultrafast', '-tune:v', 'zerolatency', '-f', 'flv', rtmpUrl];
  //   var ffmpeg_args = ['-protocol_whitelist', '"pipe,udp,rtp"', '-strict', '-2', '-i', data, '-c', 'copy', '-flvflags', 'no_duration_filesize', '-f', 'flv', rtmpUrl];
  //   var ffmpeg = spawn('ffmpeg', ffmpeg_args);
  //   console.log('Spawning ffmpeg ' + ffmpeg_args.join(' '));

  //   client.broadcast.emit('return_stream', data);
  // });

  // client.on('get_stream', function () {
  //   fs.readFile('streaming_channel.txt', function read(err, data) {
  //       if (err) {
  //           throw err;
  //       }
  //   console.log('got stream via socket id:' + data);
  //   client.emit('server_status', 'got stream via socket id:' + data);
  //   client.emit('return_stream', data);
  // });

  // client.on('test_message', function (message) {
  //   client.emit('server_status', 'got test message');
  // })
  

  // client.on('message', function (data) {
  //   console.log('got message data:' + data);
  //   var parseData = JSON.parse(data);
  //   // console.log('got message sdp:' + parseData.sdp);
  //   fs.writeFile('sdp.sdp', parseData.sdp.sdp, function (err) {
  //     if (err) throw err;
  //     console.log('File is created successfully.');
  //     var rtmpUrl = 'rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922';
  //     //var ffmpeg_args = ['-protocol_whitelist', '"pipe,file,udp,rtp"', '-re', '-vcodec', 'libvpx', '-acodec', 'opus', '-i', 'sdp.sdp', '-codec', 'copy', '-f', 'mp4', 'output.mp4'];
  //     var ffmpeg_args = ['-loglevel', 'debug', '-protocol_whitelist', 'file,http,https,tcp,tls,crypto,rtp,udp', '-re', '-i', 'sdp.sdp', '-framerate', '30', '-video_size', '1280×720', '-codec', 'copy', '-vcodec', 'libx264', '-preset', 'veryfast', '-maxrate', '1984k', '-bufsize', '3968k', '-buffer_size', '65535','-vf', '"format=yuv420p"', '-g', '60', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-f', 'flv', rtmpUrl];
  //     //ffmpeg -rtsp_transport tcp -i rtsp://IP.CAM.ADD.RESS/live1.sdp -framerate 30 -video_size 1280×720 -vcodec libx264 -preset veryfast -maxrate 1984k -bufsize 3968k -vf “format=yuv420p” -g 60 -c:a aac -b:a 128k -ar 44100 -f flv rtmp://YOUTUBELIVE/DIR/StreamKey
  //     var child = spawn('ffmpeg', ffmpeg_args,{
  //       cwd: process.cwd(),
  //       detached: true,
  //       stdio: "inherit"
  //     });

  //     console.log('Spawning ffmpeg ' + ffmpeg_args.join(' '));
  //   });
  // });

});

io.on('message', function (data) {
  console.log('got message data:' + data);
  var parseData = JSON.parse(data);

  var obj = {
    status: 200,
    command: 'command',
    statusDescription: "SDP test success",
    sdp: data,
    iceCandidates: []};

    io.emit(JSON.stringify(obj));
});

httpServer.listen(port, () => {
  console.log('Starting Websocker Server on http://localhost:' + port);
});