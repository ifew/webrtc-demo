const RtspServer = require('rtsp-streaming-server').default;

const server = new RtspServer({
    serverPort: 5554,
    clientPort: 6554,
    rtpPortStart: 10000,
    rtpPortCount: 10000
});


function run(){
    try {
    	console.log('Hello rtsp')
        server.start();
    } catch (e) {
        console.error(e);
    }
}

run();