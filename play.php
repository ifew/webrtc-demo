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
        <img id="play">
            </br>
        <div id="log"></div>

        <script type="text/javascript">
    
            var socket = io('ws://localhost:9000');
            
            socket.on('stream',function(image){
                $('#play').attr('src',image);
                //$('#log').text(image);
            });
        
        </script>

    </body>
</html>
