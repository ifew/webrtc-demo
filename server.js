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
    // ffmpeg_args = ['-f', 'avfoundation', '-framerate', '30', '-pix_fmt', 'uyvy422', '-i', '"0"', '-s', '640x360', '-pix_fmt', 'yuv422p', '-vcodec', 'libx264', '-preset:v', 'ultrafast', '-tune:v', 'zerolatency', '-f', 'flv', rtmpUrl];
    //
    ffmpeg_args = ['-protocol_whitelist', '"pipe,udp,rtp"', '-strict', '-2', '-i', data, '-c', 'copy', '-flvflags', 'no_duration_filesize', '-f', 'flv', rtmpUrl];
    spawn('ffmpeg', ffmpeg_args);
    console.log('Spawning ffmpeg ' + ffmpeg_args.join(' '));
    client.broadcast.emit('stream', data);
  });

  client.on('message', function (data) {
    // var parseData = JSON.parse(data);
    // console.log('got message sdp:' + parseData.sdp.sdp);
    // fs.writeFile('sdp.sdp', parseData.sdp.sdp, function (err) {
    //   if (err) throw err;
    //   console.log('File is created successfully.');
    //   var rtmpUrl = 'rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922';
    //   //var ffmpeg_args = ['-protocol_whitelist', '"pipe,file,udp,rtp"', '-re', '-vcodec', 'libvpx', '-acodec', 'opus', '-i', 'sdp.sdp', '-codec', 'copy', '-f', 'mp4', 'output.mp4'];
    //   var ffmpeg_args = ['-protocol_whitelist', 'ALL', '-re', '-i', '"sdp.sdp"', '-framerate', '30', '-video_size', '1280×720', '-codec', 'copy', '-vcodec', 'libx264', '-preset', 'veryfast', '-maxrate', '1984k', '-bufsize', '3968k', '-buffer_size', '65535','-vf', '"format=yuv420p"', '-g', '60', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-f', 'flv', rtmpUrl];
    //   //ffmpeg -rtsp_transport tcp -i rtsp://IP.CAM.ADD.RESS/live1.sdp -framerate 30 -video_size 1280×720 -vcodec libx264 -preset veryfast -maxrate 1984k -bufsize 3968k -vf “format=yuv420p” -g 60 -c:a aac -b:a 128k -ar 44100 -f flv rtmp://YOUTUBELIVE/DIR/StreamKey
    //   spawn('ffmpeg', ffmpeg_args);
    //   console.log('Spawning ffmpeg ' + ffmpeg_args.join(' '));
    // });
  });
});

httpServer.listen(port, () => {
  console.log('Starting Websocker Server on http://localhost:' + port);
});