# Demo WebRTC publish to RTMP and play RTMP with HTML5

## Setup 
### PHP 7.3 and Nginx
Based from [romeoz/docker-phpfpm:7.3](https://github.com/romeOz/docker-nginx-php/tree/master/7.3)

### Build Image

```bash
docker build -t nginx_php:7.3 .
```

### Build Container

```bash
docker run -d -i -p 80:80 -p 33647:33647 -v ${PWD}:/var/www/app/ --net db_network --name webrtc_demo nginx_php:7.3
```


### Installl Dependencies

```bash
npm install
```

## RUN

### Start Websocket Server
```bash
node server
```

