"use strict";
const express = require('express');
const app = express();
const http = require('http');
const fs = require('fs');
const httpServer = http.Server(app);
const io = require('socket.io')(httpServer);
const spawn = require('child_process').spawn;
const port = 9000;

io.on('connection', function (client) {
  console.log('user connected');
  client.emit('server_status', 'user connected');

  client.on('disconnect', function () {
    console.log('user disconnected');
    client.emit('server_status', 'user disconnected');
  })

  client.on('echolog', function (data) {
    var parseData = JSON.parse(data);
    console.log('echo log:' +parseData);
  })

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