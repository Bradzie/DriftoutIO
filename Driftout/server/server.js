var path = require("path");
var http = require("http");
var express = require("express");
var socketIO = require("socket.io");

// Needs replacement upon cloud hosting?
var publicPath = path.join(__dirname, "../client")
var port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
app.use(express.static(publicPath))
console.log("Server Started!")

server.listen(port, function(){
  console.log("Server started on port " + port);
});

io.on("connection", function(socket){
  socket.on("message", function(data){
    console.log(data);
  });
});
