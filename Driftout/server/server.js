var path = require("path");
var http = require("http");
var express = require("express");
var socketIO = require("socket.io");
var matterjs = require("matter-js")

var publicPath = path.join(__dirname, "../client")
var port = process.env.PORT || 3000;
var host = process.env.HOST || '0.0.0.0';
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
app.use(express.static(publicPath));

// ---------- GLOBALS ----------

const engineCanvas = {width: 1000, height: 500};
var frameRate = 1000/75;
var allPlayers = [];
var entities = {players: [], entities: [], walls: []};
var currentConnections = [];
var totalConnections = 0; [];
const Bodies = matterjs.Bodies;
const Engine = matterjs.Engine;
const Body = matterjs.Body;
const Vector = matterjs.Vector;
const Composite = matterjs.Composite;

// ---------- MODIFIERS ----------

var debug = false;

// ---------- ---------- ----------

server.listen(port, host);

console.log("Server started on port " + port);

io.on("connection", function(socket){
  console.log("New connection, ID: " + socket.id);
  totalConnections++;
  currentConnections.push(socket.id);

  var player;
  socket.on("ready", () => {      
    player = new Player(socket.id);
    socket.emit("myID", {id: player.id});
    socket.emit("addPlayer", {playerID: player.id});
    allPlayers.push(player);
    entities.players.push(player.body);
    Composite.clear(engine.world, false);
    Composite.add(engine.world, player.body);
  });

  socket.on("inputData", (data) => {
    for(var i in allPlayers){
      if(allPlayers[i].id === socket.id) {
        allPlayers[i].mouseX = data.mouseX;
        allPlayers[i].mouseY = data.mouseY;
        allPlayers[i].angle = data.clientPlayerAngle;
        allPlayers[i].windowWidth = data.windowWidth;
        allPlayers[i].windowHeight = data.windowHeight;
      }
    }
  });

});

entities.walls.push(
Bodies.rectangle(
  engineCanvas.width / 2, 
  engineCanvas.height, 
  engineCanvas.width * 3, 
  10, 
  {isStatic: true}
));

const engine = Engine.create();
engine.gravity.scale = 0;
Composite.add(engine.world, Object.values(entities).flat());

var processState = function(){
  for(var i in allPlayers){
    let vx = Body.getVelocity(allPlayers[i].body).x;
    let vy = Body.getVelocity(allPlayers[i].body).y;
    //var playerAngle = Math.atan2(allPlayers[i].mouseY - allPlayers[i].windowHeight/2, allPlayers[i].mouseX - allPlayers[i].windowWidth/2);
    // if(vx < allPlayers[i].maxSpeed && vx > -allPlayers[i].maxSpeed
    // && vy < allPlayers[i].maxSpeed && vy > -allPlayers[i].maxSpeed){
    //   Body.setVelocity(allPlayers[i].body, Vector.create(
    //     vx + Math.cos(allPlayers[i].angle*0.1),
    //     vy + Math.sin(allPlayers[i].angle*0.1)))
    // }

    // if(vx < allPlayers[i].maxSpeed && vx > -allPlayers[i].maxSpeed){
    //   Body.setVelocity(allPlayers[i].body, Vector.create(
    //     vx + Math.cos(allPlayers[i].angle),
    //     vy
    //   ));
    // }
    // if(vy < allPlayers[i].maxSpeed && vy > -allPlayers[i].maxSpeed){
    //   Body.setVelocity(allPlayers[i].body, Vector.create(
    //     vx,
    //     vy + Math.sin(allPlayers[i].angle)
    //   ));

    Body.setVelocity(allPlayers[i].body, Vector.create
      (
    vx < allPlayers[i].maxSpeed && vx > -allPlayers[i].maxSpeed
        ? vx + Math.cos(allPlayers[i].angle)*0.1
        : vx,
    vx < allPlayers[i].maxSpeed && vx > -allPlayers[i].maxSpeed
        ? vy + Math.sin(allPlayers[i].angle)*0.1
        : vy
      )
    );
    console.log((Math.cos(allPlayers[i].angle*0.1),  Math.sin(allPlayers[i].angle*0.1)));
  }
}


// The player object constructor
var Player = function(id) {
  this.body = Bodies.rectangle(250, 250, 40, 40);
  this.id = id;
  this.windowWidth = 0;
  this.windowHeight = 0;
  this.name = "Racer";
  this.mouseX;
  this.mouseY;
  this.maxHP = 100;
  this.HP = 100;
  this.regen = 0.1;
  this.alive = true;
  this.angle = 0;
  this.maxSpeed = 5;

  this.events = function() {

    if (this.alive == true){
      
      // Movement

      let cur = Body.getVelocity(this.body)

      if (cur.x < this.maxSpeed && cur.x > -this.maxSpeed){
        //cur.x += Math.cos(this.angle)*this.acceleration;
        Body.setVelocity(this.body, Vector.create(Math.cos(this.angle)*this.acceleration));
      }
      if (cur.y < this.maxSpeed && cur.y > -this.maxSpeed){
        Body.setVelocity(this.body, Vector.create(Math.sin(this.angle)*this.acceleration));
      }
    }

    if(this.HP < this.maxHP && this.regen > 0){
      this.HP += this.regen;

    }
  }
  return this;
}


function rotate(velocity, angle) {
    const rotatedVelocities = {
        x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
        y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle)
    }

    return rotatedVelocities;
}

const toVertices = e => e.vertices.map(({x, y}) => ({x, y}));

// loop spped to update player properties
setInterval(() => {
  processState();
  Engine.update(engine, frameRate);
  io.emit("updateState", {
    players: entities.players.map(e => e.vertices.map(({x, y}) => ({x, y}))),
    walls: entities.walls.map(e => e.vertices.map(({x, y}) => ({x, y})))
  });
  
}, frameRate)