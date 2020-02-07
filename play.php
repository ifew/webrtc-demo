<meta charset="UTF-8">
<html>
	<head>
		<script src="js/jquery-3.3.1.min.js"></script>	    
		<script src="js/adapter.js"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.dev.js"></script>
		<style>
		.div-section {margin-bottom: 8px;}
		</style>
	</head>

	<body>
		<video id="remoteVideo" autoplay playsinline controls muted style="width:640px; height:480px"></video>
				
		<div>
			<span id="serverStatus"></span>
		</div>
		<div>
			<span id="sdpDataTag"></span>
		</div>

		
		<script type="text/javascript">
    	var remoteVideo = document.getElementById('remoteVideo');
        var wsURL = "http://localhost:9000";
		//var wsURL = "http://10.91.2.19:9000"
		var socket = io.connect(wsURL);
		socket.on('server_status', function(message) {
			$('#serverStatus').html(message);
		})
		socket.on('return_stream', function(stream) {
			$('#serverStatus').html("returned stream");
			//remoteVideo.setAttribute("src", "SampleVideo_1280x720_5mb.mp4");
			remoteVideo.srcObject = stream;
			remoteVideo.src = URL.createObjectURL(stream);
			//document.querySelector('#remoteVideo').src = stream;
		})
		
		socket.emit("stream");

		socket.emit('test_message');
		</script>
		<div>
			<span id="sdpDataTag"></span>
		</div>

    </body>
</html>
