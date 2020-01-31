<meta charset="UTF-8">
<html>

<head>
    <script src="js/jquery-3.3.1.min.js"></script>
    <script src="https://webrtc.github.io/adapter/adapter-latest.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.dev.js"></script>
    <script src="js/publish.js"></script>
    <style>
    .div-section {
        margin-bottom: 8px;
    }
    </style>
</head>

<body>
        <h2>Record Screen</h2>
        <div><video id="localVideo" autoplay playsinline muted style="widht:640px;height:480px;"></video></div>
        <h2>Preview Screen</h2>
        <div><video id="remoteVideo" autoplay playsinline muted style="widht:640px;height:480px;"></video></div>
        <h2>From Vimeo</h2>
        <iframe src="https://vimeo.com/event/20653/embed" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
        
        <div class="ui segment form">
        <span id="sdpDataTag">Connecting...</span>

        <hr class="divider" />

        <div class="field inline">
            <label for="videoSource">Video Source </label><select class="ui dropdown" id="videoSource"></select>
        </div>

        <div class="field inline">
            <label for="videoResolution">Video Resolution </label><select class="ui dropdown"
                id="videoResolution"></select>
        </div>

        <div class="field inline">
            <label for="audioSource">Audio Source </label><select class="ui dropdown" id="audioSource"></select>
        </div>

      </div>

        <div id="log"></div>
        <script type="text/javascript">
        var localVideoRaw = document.querySelector('#localVideo');

        var userAgent = navigator.userAgent;
        var wsURL = "http://localhost:9000";
        var streamInfo = {
            applicationName: "xxx",
            streamName: "aa",
            sessionId: "[empty]"
        };
        var userData = {
            param1: "value1",
            "param2" : "webrtc-broadcast"
        };
        var videoBitrate = 600;
        var audioBitrate = 64;
        var videoFrameRate = "29.97";
        var videoChoice = "42e01f";
        var audioChoice = "opus";

        jQuery(document).ready(function() {
            setTimeout(browserReady(), 2000);
        });
        
        </script>

    </body>


</html>