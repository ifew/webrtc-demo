<meta charset="UTF-8">
<html>

<head>
    <script src="js/jquery-3.3.1.min.js"></script>
    <script src="js/adapter.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.dev.js"></script>
    <style>
    .div-section {
        margin-bottom: 8px;
    }
    </style>
</head>

<body>
        <video src="" id="video" style="width:100%; height: 100%;" autoplay="true"></video>
            </br>
        <canvas style="display:none;" id="preview"></canvas>
        
        <div id="log"></div>
        <script type="text/javascript">
            var canvas = document.getElementById("preview");
            var context = canvas.getContext('2d');
        
            canvas.width = 900;
            canvas.height = 700;
        
            context.width = canvas.width;
            context.height = canvas.height;
        
            var video = document.getElementById("video");
        
            var socket = io('ws://localhost:9000');
        
            function logger(msg){
                $('#log').text(msg);
            }
        
            function loadCamera(stream){
              try {
                  video.srcObject = stream;
              } 
              
              catch (error) {
               video.src = URL.createObjectURL(stream);
              }
               logger("Camera connected");
            }
        
            function loadFail(){
                logger("Camera not connected");
            }
        
            function Draw(video,context){
                context.drawImage(video,0,0,context.width,context.height);
                socket.emit('stream',canvas.toDataURL('image/webp'));
            }
        
            $(function(){
                navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msgGetUserMedia );
            
                if(navigator.getUserMedia)
                {
                    navigator.getUserMedia({
                        video: true, 
                        audio: false
                    },loadCamera,loadFail);
                }
        
                setInterval(function(){
                    Draw(video,context);
                },0.1);
            });
        
        </script>

    </body>


</html>