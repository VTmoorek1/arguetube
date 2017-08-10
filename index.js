var express = require("express");
var fs = require("fs");
var http = require("http");



var port = process.env.PORT || 5000;
var app = express();
var server = http.createServer(app);

app.use(express.static('public'));

app.get('/', function(request,repsonse) {
    
});

var io = require("socket.io")(server);

server.listen(port, function() {
    console.log("App listening on port " + port);
});

var numClients = 0;

io.sockets.on('connection', function (socket) {
   
   
   
   function log () {
       
       var array = ['>>> Message from server: '];
       
       for (var i = 0; i < arguments.length; i++)
       {
           array.push(arguments[i]);
       }
       
       socket.emit('log', array);
   }
   
   socket.on("remote description", function (description) {
            console.log('sending description to other dude');
            
            socket.broadcast.emit('remote description', description);
            
    });
    
    socket.on("ice candidate", function (candidate) {
            console.log('sending some candidate to the other dude');
            
            socket.broadcast.emit('ice candidate', candidate);
            
    });
   
   socket.on('message', function (message) {
      log ('Got message: ', message);
      
      socket.broadcast.emit('message',message);
   });
   
   socket.on('create or join', function (room) {
       
       
      
      log("Room " + room + " has " + numClients + " clients");
      log("Request to create or join room " + room);
      
       console.log("Room " + room + " has " + numClients + " clients");
      console.log("Request to create or join room " + room);
      
      if (numClients === 0)
      {
          socket.join(room);
          socket.emit('created',room);
          numClients++;
      }
      else if (numClients === 1)
      {
          io.sockets.in(room).emit('join',room);
          socket.join(room);
          socket.broadcast.emit('joined',room);
          numClients++;
      }
      else {
          socket.emit('full',room);
      }
      
      socket.emit('emit(): client ' + socket.id + " joined room " + room);
      socket.broadcast.emit('broadcast(): client ' + socket.id + " joined room " 
        + room);
      
       
   });
   
   socket.on('disconnect', function () {
      numClients--; 
      
      if (numClients < 0)
      {
          numClients = 0;
      }
   });
   
    
});

