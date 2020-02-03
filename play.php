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
			<span id="sdpDataTag"></span>
		</div>

		
		<script type="text/javascript">
    	var remoteVideo = document.querySelector('#remoteVideo');
        var wsURL = "http://localhost:9000";
		//var wsURL = "http://10.91.2.19:9000"
		var socket = io(wsURL);
		socket.on("stream", function(stream){
			remoteVideo.src = stream;
			d.querySelector('#streaming').src
		});
		</script>
		<div>
			<span id="sdpDataTag"></span>
		</div>

    </body>
</html>
