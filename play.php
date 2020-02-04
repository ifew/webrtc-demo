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
		<canvas style="display:none;" id="preview"></canvas>
		<div>
			<span id="serverStatus"></span>
		</div>
		<div>
			<span id="sdpDataTag"></span>
		</div>

		
		<script type="text/javascript">
		$('#serverStatus').html("start");
		var canvas = document.getElementById("preview");
    	var remoteVideo = document.getElementById('remoteVideo');
        var wsURL = "http://localhost:9000";
		//var wsURL = "http://10.91.2.19:9000"
		var socket = io.connect(wsURL);
		var context = canvas.getContext('2d');
	
		canvas.width = 900;
		canvas.height = 700;
	
		context.width = canvas.width;
		context.height = canvas.height;
			
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
		function Draw(video,context){
			$('#serverStatus').html("draw video");
			context.drawImage(video,0,0,context.width,context.height);
			socket.emit('stream', canvas.toDataURL('image/webp'));
		}
		
		function loadCamera(stream){
              try {
				remoteVideo.srcObject = stream;
              } 
              
              catch (error) {
				remoteVideo.src = URL.createObjectURL(stream);
              }
			$('#serverStatus').html("camera conected")
            }
        
            function loadFail(){
                $('#serverStatus').html("camera connect fail")
			}
			
		$(function() {
			$('#serverStatus').html("load");
			navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msgGetUserMedia );
		
			if(navigator.getUserMedia)
			{
				navigator.getUserMedia({
					video: true, 
					audio: false
				},loadCamera,loadFail);
			}
	
			setInterval(function(){
			$('#serverStatus').html("get draw video");
				Draw(remoteVideo,context);
			},0.1);
		});
		</script>
		<div>
			<span id="sdpDataTag"></span>
		</div>

    </body>
</html>
