# PHP 5.3 and Nginx
Based from [romeoz/docker-phpfpm:7.3](https://github.com/romeOz/docker-nginx-php/tree/master/7.3)

## Build Image

```bash
docker build -t nginx_php_livestreaming:7.3 .
```

## Build Container

```bash
docker run -d -i -p 80:80 -v ${PWD}:/var/www/app/ --net db_network --name webrtc_demo nginx_php_livestreaming:7.3
```