<meta charset="UTF-8">
<html>
	<head>
		<script src="js/jquery-3.3.1.min.js"></script>	    
		<script src="js/adapter.js"></script>  
        <script src="js/playback.js"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.dev.js"></script>
		<style>
		.div-section {margin-bottom: 8px;}
		</style>
	</head>

	<body>
		<video id="remoteVideo" autoplay playsinline controls muted style="width:640px; height:480px"></video>
		
		<div>
			<span id="sdpDataTag"></span>
		</div>

		
		<script type="text/javascript">
			var socket = new WebSocket('ws://localhost:9000');
			var userAgent = navigator.userAgent;
			
			var videoBitrate = 600;
			var audioBitrate = 64;
			var videoFrameRate = "29.97";
			var videoChoice = "42e01f";
			var audioChoice = "opus";
					
		    var wsURL = "ws://localhost:9000";
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
