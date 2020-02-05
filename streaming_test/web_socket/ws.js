#!/usr/bin/env node

var path = require('path');
var app = require('express')();
var ws = require('express-ws')(app);
const spawn = require('child_process').spawn;
const stringToStream = require('string-to-stream');
const ffmpeg = require('fluent-ffmpeg');
var fs = require('fs')

app.get('/', (req, res) => {
  console.error('express connection');
  res.sendFile(path.join(__dirname, 'ws.html'));
});

app.ws('/', function(ws, req) {
  ws.on('message', function(msg) {
    var msg_object = JSON.parse(msg);
    var sdp_data = msg_object.sdp.sdp;
    console.log('sdp',msg_object)
 //    fs.writeFile('sdp.sdp', sdp_data, function (err) {
	//   if (err) throw err;
	//   console.log('Saved!');
	// });

    var sdp_file = '/Users/kong/Desktop/Project/unl/webrtc-demo/streaming_test/web_socket/test_sdp.sdp';
    // sdp_file = 'SampleVideo_1280x720_5mb.mp4';
	fs.readFile(sdp_file, 'utf8', function(err, data) {
	  if (err) throw err;

	  	//Run stream
	  	var rtmpUrl = 'rtmp://rtmp-global.cloud.vimeo.com/live/bfb51a2c-7f54-45c9-93b6-0ee9d4749922';
	  	// var ffmpeg_args = ['-re','-i', sdp_file,'-c','copy','-flvflags','no_duration_filesize','-f','flv',rtmpUrl];
	  	// ffmpeg_args = ['-max_delay','5000','-reorder_queue_size','16384','-protocol_whitelist','file,crypto,udp,rtp','-re','-i',sdp_file,'-vcodec','copy','-acodec','aac','-f','flv',rtmpUrl];
	  	// var ffmpeg_args = ['-protocol_whitelist', 'file,crypto,udp,rtp','-i', sdp_file,'-f','flv',rtmpUrl];


	 //  	var ffmpeg_args = ['-max_delay','5000','-reorder_queue_size','16384','-protocol_whitelist','file,crypto,udp,rtp','-re','-i',sdp_file,'-max_delay','5000','-reorder_queue_size','16384','-protocol_whitelist','file,crypto,udp,rtp','-re','-i','audio.1.sdp','-vcodec','copy','-acodec','aac','-shortest','-y','output.mp4'];
		// console.log(JSON.stringify(ffmpeg_args))
		// var child = spawn('ffmpeg', ffmpeg_args);
		//

		// Create a readable stream from an SDP string (v=0\no=......)
		let sdp = stringToStream(data);

		ffmpeg(sdp_file)
        .inputOptions(['-protocol_whitelist', 'file,crypto,pipe,udp,rtp', '-f', 'sdp' ])
        .outputOptions([]).format('flv').save(rtmpUrl)
        .on('start', function(commandLine) {
		    console.log('Spawned Ffmpeg with command: ' + commandLine);
		  })
        .on('codecData', function(data) {
		    console.log('Input is ' + data.audio + ' audio ' +
		      'with ' + data.video + ' video');
		  })
         .on('progress', function(progress) {
		    console.log('Processing: ' + progress.percent + '% done');
		  })
        .on('stderr', function(stderrLine) {
    		console.log('Stderr output: ' + stderrLine);
  		});
		// child.stdout.on('data', function(data) {
  //           console.log('stdout: ==== ' + data);
  //       });
  //       child.stderr.on('data', function(data) {
  //           console.log('stderr: ' + data);
  //       });

		var obj = {
					status: 200,
					command: 'command',
					statusDescription: "SDP test success",
					sdp: data,
					iceCandidates: []};

		ws.send(JSON.stringify(obj));
	});
  });
});
app.listen(3001, () => console.error('listening on http://localhost:3001/'));
console.error('websocket example');