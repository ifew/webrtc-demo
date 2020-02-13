# Demo WebRTC publish to RTMP (Youtube Live, Vimeo) via ffmpeg and buffer (not use SDP)

## Setup
### PHP 7.3 and Nginx
Based from [romeoz/docker-phpfpm:7.3](https://github.com/romeOz/docker-nginx-php/tree/master/7.3)

### Build Image

```bash
cd Docker
docker build -t nginx_php:7.3 .
```

### Build Container

```bash
docker run -d -i -p 80:80 -v ${PWD}:/var/www/app/ --net db_network --name webrtc_demo nginx_php:7.3
```

### Installl Dependencies

```bash
npm install
```

### Config RTMP URL at server.js
```bash
const rtmpUrl = decodeURIComponent("XXXXXXXXX");
```

## RUN

### Start Socket.io Server
```bash
node server
```


### Open Browser for streaming
```bash
http://localhost/index.html
```

### Mixed from example
- Fet buffer by node server https://github.com/fbsamples/Canvas-Streaming-Example/
- WebRTC capture https://github.com/videowhisper/PHP-Live-Streaming-Webcam