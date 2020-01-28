<meta charset="UTF-8">
<html>
	<head>
		<script src="js/jquery-3.3.1.min.js"></script>	    
		<script src="js/adapter.js"></script>
        <script src="js/vwrtc-playback.js"></script>
		<style>
		.div-section {margin-bottom: 8px;}
		</style>
	</head>
	<body>
		<div class="div-section">VideoWhisper WebRTC - Stream Playback</div>
		<div class="videowhisper-webrtc-video">
		<video id="remoteVideo" class="videowhisper_htmlvideo" autoplay playsinline controls muted style="width:640px; height:480px"></video>
		</div>

		<div>
			<span id="sdpDataTag"></span>
		</div>

		<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.dev.js"></script>
		<script type="text/javascript">
		var socket = io('http://localhost:9000');
			var userAgent = navigator.userAgent;
			
			var videoBitrate = 600;
			var audioBitrate = 64;
			var videoFrameRate = "29.97";
			var videoChoice = "$videoCodec";
			var audioChoice = "$audioCodec";
					
		    var wsURL = "http://localhost:9000";
			var streamInfo = {
				applicationName: "xxx",
				streamName: "aa",
				sessionId: "[empty]"
			};
			var userData = {
				param1: "value1",
				"param2": "webrtc-broadcast"
			};
			
		jQuery( document ).ready(function() {
 		browserReady();
});
		</script>



		<div>
			<span id="sdpDataTag"></span>
		</div>
				
	</body>
</html>
