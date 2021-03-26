//vars
'use strict';

var audioSelect = null;
var videoSelect = null;
var selectors = null;
var resolutionSelect = null;

//
var localVideo = null;
var remoteVideo = null;
var peerConnection = null;
var peerConnectionConfig = { iceServers: []};
var localStream = null;
var wsConnection = null;
var videoIndex = -1;
var audioIndex = -1;
var newAPI = true;
var SDPOutput = new Object();
const dataChannelOptions = {ordered: true};

var videoWidth = '640';
var videoHeight = '480';

const cameraResolutions = {
	"4K": {
		"label": "4K UHD",
		"width": 3840,
		"height": 2160,
		"ratio": "16:9"
	},
	"1080p": {
		"label": "1080p FHD",
		"width": 1920,
		"height": 1080,
		"ratio": "16:9"
	},
	"720p": {
		"label": "720p HD ",
		"width": 1280,
		"height": 720,
		"ratio": "16:9"
	},
	"SVGA": {
		"label": "SVGA",
		"width": 800,
		"height": 600,
		"ratio": "4:3"
	},
	"VGA": {
		"label": "VGA",
		"width": 640,
		"height": 480,
		"ratio": "4:3"
	},
	"360p": {
		"label": "360p nHD",
		"width": 640,
		"height": 360,
		"ratio": "16:9"
	},
	"CIF": {
		"label": "CIF",
		"width": 352,
		"height": 288,
		"ratio": "4:3"
	},
	"QVGA": {
		"label": "QVGA",
		"width": 320,
		"height": 240,
		"ratio": "4:3"
	}
};



//Input Select code

//in Safari deviceID is not stable

var videoSource = null; //webcam id
var audioSource = null; //microphone id
var videoSelected = null; //webcam selected
var audioSelected = null; //microphone selected

function selectorsReady() {
	console.log('selectorsReady');

	//selectors
	audioSelect = document.getElementById('audioSource');
	videoSelect = document.getElementById('videoSource');
	resolutionSelect = document.getElementById('videoResolution');

	selectors = [audioSelect, videoSelect];

	navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

	audioSelect.onchange = selectorChange;
	videoSelect.onchange = selectorChange;

	//resolutions list
	for (var key in cameraResolutions) {
		const option = document.createElement('option');
		option.value = key;
		option.text = cameraResolutions[key]['label'] + ' ' + cameraResolutions[key]['width'] + 'x' + cameraResolutions[key]['height'];
		resolutionSelect.appendChild(option);
	}

	resolutionSelect.selectedIndex = 4;
	resolutionSelect.onchange = selectorChange;
	selectorStart();

}

function selectorChange() {
	videoSelected = videoSelect.value;
	audioSelected = audioSelect.value;

	console.log('selectorChange videoSelected: ' + videoSelected);
	navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

	selectorStart();
}


function gotDevices(deviceInfos) {
	// Handles being called several times to update labels. Preserve values.

	const values = selectors.map(select => select.value);
	selectors.forEach(select => {
		while (select.firstChild) {
			select.removeChild(select.firstChild);
		}
	});

	let videoValid = false;
	let audioValid = false;

	for (let i = 0; i !== deviceInfos.length; ++i) {
		const deviceInfo = deviceInfos[i];
		const option = document.createElement('option');
		option.value = deviceInfo.deviceId;
		if (deviceInfo.kind === 'audioinput') {
			option.text = deviceInfo.label || `microphone ${audioSelect.length + 1}`;
			audioSelect.appendChild(option);

			if (deviceInfo.deviceId == audioSelected) audioValid = true; //selected id valid

		} else if (deviceInfo.kind === 'videoinput') {
			option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
			videoSelect.appendChild(option);

			if (deviceInfo.deviceId == videoSelected) videoValid = true; //selected id valid

		} else {
			console.log('Some other kind of source/device: ', deviceInfo);
		}
	}

	selectors.forEach((select, selectorIndex) => {
		if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
			select.value = values[selectorIndex];
		}
	});

	//updating videoSource,audioSource only if still valid because Safari changes deviceID

	//first time
	if (videoValid) videoSource = videoSelected; else videoSource = videoSelect.value;
	if (audioValid) audioSource = audioSelected; else audioSource = audioSelect.value;

	//warn user if selection could not be applied
	if (videoSelected || audioSelected) //changing (selected)
		if (!videoValid || !audioValid) {
			console.log('gotDevices: deviceID changed videoValid:' + videoValid + ' videoSelected: ' + videoSelected + ' audioValid:' + audioValid);
			jQuery("#sdpDataTag").html('Media DeviceID changed: Please select again!');
		}

	console.log('gotDevices: verified videoSource: ' + videoSource + ' changed videoValid: ' + videoValid);

}

function gotStream(stream) {

	window.stream = stream; // make stream available to console
	localVideo.srcObject = stream;

	console.log("gotStream after getUserMedia: " + stream);
	localStream = stream;

	//close prev stream (to restart publishing)
	console.log("gotStream: close prev stream ");
	if (localStream != null) stopPublisher();

	//publish
	console.log("gotStream: start new stream ");
	startPublisher();

	// Refresh button list in case labels have become available
	return navigator.mediaDevices.enumerateDevices();
}

function handleError(error) {
	console.log('navigator.getUserMedia select error: ', error);

	jQuery("#sdpDataTag").html('getUserMedia Error: ' + error.toString());
}

function selectorStart() {
	if (window.stream) {
		window.stream.getTracks().forEach(track => {
			track.stop();
		});
	}

	localVideo.srcObject = null;

	const audioSource = audioSelect.value;
	const videoSource = videoSelect.value;
	const videoResolution = resolutionSelect.value;

	for (var key in cameraResolutions)
		if (key == videoResolution) {
			videoWidth = cameraResolutions[key]['width'];
			videoHeight = cameraResolutions[key]['height'];
		}

	const constraints = {
		audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
		video: { deviceId: videoSource ? { exact: videoSource } : undefined, width: { exact: videoWidth }, height: { exact: videoHeight } },
	};

	navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msgGetUserMedia);

	console.log("navigator.getUserMedia:" + navigator.getUserMedia);
	if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
		console.log("enumerateDevices() not supported.");
		return;
	} else {
		console.log("enumerateDevices() is supported.");
		navigator.mediaDevices.enumerateDevices()
		.then(function(devices) {
		devices.forEach(function(device) {
			console.log(device.kind + ": " + device.label +
						" id = " + device.deviceId);
		});
		})
		.catch(function(err) {
			console.log(err.name + ": " + err.message);
		});
	}

	if (navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
		newAPI = true;

	}
	else if (navigator.getUserMedia) {
		navigator.getUserMedia(constraints, gotStream, errorHandler).then(gotDevices).catch(handleError);
		newAPI = false;

	}
	else {
		alert('Your browser does not support getUserMedia API');
	}

	console.log("selectorStart videoSource: " + videoSource + "  newAPI: " + newAPI);


}


//WebRTC Publish
function browserReady() {

	localVideo = document.getElementById('localVideo');

	if (userAgent == null) {
		userAgent = "unknown";
	}


	localVideo.onloadedmetadata = () => {
		displayVideoDimensions('loadedmetadata');
	};

	localVideo.onresize = () => {
		displayVideoDimensions('resize');
	};

	selectorsReady();

}

function displayVideoDimensions(whereSeen) {
	var innerText;

	if (localVideo.videoWidth) {
		innerText = 'Actual video dimensions: ' + localVideo.videoWidth +
			'x' + localVideo.videoHeight + 'px.';
		if (videoWidth !== localVideo.videoWidth
			|| videoHeight !== localVideo.videoHeight) {
			videoWidth = localVideo.videoWidth;
			videoHeight = localVideo.videoHeight;

			jQuery("#sdpDataTag").html(innerText);
		}
	} else {
		innerText = 'Video dimensions: not ready';
	}

	console.log('displayVideoDimensions:' + whereSeen + ': ' + innerText);

}

const offerOptions = {
	iceRestart: 1,
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 1
};

function wsConnect(url) {

	const videoTracks = localStream.getVideoTracks();
	const audioTracks = localStream.getAudioTracks();

	if (videoTracks.length > 0) {
		console.log(`Using Video device: ${videoTracks[0].label}`);
	}
	if (audioTracks.length > 0) {
		console.log(`Using Audio device: ${audioTracks[0].label}`);
	}

	const wsConnection = new WebSocket(url);

	wsConnection.addEventListener('open', function() { 
		console.log("wsConnection.onopen");

		var remoteVideo = document.querySelector('#remoteVideo');
		remoteVideo.srcObject = localStream;

		let mediaRecorder;
		let mediaStream;

		var mediaRecorderCoder = 'video/webm; codecs=h264';
		
		//mediaStream = localVideo.captureStream(25); // 30 FPS
		mediaStream = localVideo.captureStream(videoFrameRate); // 30 FPS
		if(!MediaRecorder.isTypeSupported('video/webm;codecs=h264')){
			if(MediaRecorder.isTypeSupported('video/webm; codecs=hevc')){
				mediaRecorderCoder = 'video/webm; codecs=hevc';
			} else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
				mediaRecorderCoder = 'video/webm; codecs=vp9';
			} else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
				mediaRecorderCoder = 'video/webm; codecs=vp8';
			}
		}

		mediaRecorder = new MediaRecorder(mediaStream, {
			mimeType: mediaRecorderCoder,
			videoBitsPerSecond : videoBitrate, //1500000 //1.5Gbps
			audioBitsPerSecond : audioBitrate
		});
		mediaRecorder.ondataavailable = function(e){
			wsConnection.send(e.data); 
		}
		mediaRecorder.start(bufferTimeout);

	});
}

function getUserMediaSuccess(stream) {
	console.log("getUserMediaSuccess: " + stream);
	localStream = stream;
	localVideo.srcObject = stream;

	//publish
	startPublisher();
}

function startPublisher() {
	wsConnect(wsURL);
}

function stopPublisher() {
	if (peerConnection != null)
		peerConnection.close();
	peerConnection = null;

	if (wsConnection != null)
		wsConnection.close();
	wsConnection = null;

	console.log("stopPublisher");
}

function start() {
	if (peerConnection == null)
		startPublisher();
	else
		stopPublisher();
}

function errorHandler(error) {
	console.log(error);
}
