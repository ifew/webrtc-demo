"use strict";
const express = require('express');
const app = express();
const http = require('http');
const fs = require('fs');
const httpServer = http.Server(app);
const io = require('socket.io')(httpServer);
const spawn = require('child_process').spawn;
const port = 9000;

var channels = {};

app.use(function(req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Accept');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// API endpoint
app.get("/", (req, res) => {
  res.send({
    msg: "Hello, World"
  });
});

io.set('transports', [
  //'websocket',
  'polling', 'websocket'
  // 'xhr-polling',
  // 'jsonp-polling'
]);


io.sockets.on('connection', function (socket) {
  var initiatorChannel = '';
  if (!io.isConnected) {
      io.isConnected = true;
  }

  console.log('server: client connected');
  
  socket.on('message', function (data) {
    console.log('server: received message from client');
      socket.broadcast.emit('message', data);
  });

  socket.on('new-channel', function (data) {
    console.log('server: received client create new channel');
    var parseData = JSON.stringify(data);
    console.log('server: new channel value: ' +parseData);

    if (!channels[data.channel]) {
        initiatorChannel = data.channel;
    }

    channels[data.channel] = data.channel;
    onNewNamespace(data.channel, data.sender);

  });

  socket.on('presence', function (channel) {
    var isChannelPresent = !! channels[channel];
    socket.emit('presence', isChannelPresent);
  });

  socket.on('disconnect', function (channel) {
    if (initiatorChannel) {
      console.log('server: client disconnected');
        delete channels[initiatorChannel];
    }
  });

});

function onNewNamespace(channel, sender) {
  io.of('/' + channel).on('connection', function (socket) {
    console.log('server: onNewNamespace() channel: ' + JSON.stringify(channel));
    console.log('server: onNewNamespace() sender: ' + JSON.stringify(sender));

      var username;
      if (io.isConnected) {
          io.isConnected = false;
          socket.emit('connect', true);
      }

      socket.on('message', function (data) {
        console.log('server: onNewNamespace() received message: ' + JSON.stringify(data.data));
          if (data.sender == sender) {
              console.log('server: onNewNamespace() received message and same user: ' + JSON.stringify(data.sender));
              if(!username) username = data.data.sender;
              
              console.log('server: onNewNamespace() emit message: ' + JSON.stringify(data.data));
              socket.broadcast.emit('message', data.data);
          }
      });
      
      socket.on('disconnect', function() {
          if(username) {
              console.log('server: onNewNamespace() disconnected username: ' + username);
              socket.broadcast.emit('user-left', username);
              username = null;
          }
      });
   });
}





httpServer.listen(port, () => {
  console.log('Starting Websocker Server on http://localhost:' + port);
});