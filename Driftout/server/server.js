const path = require("path");
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const matterjs = require("matter-js");
const Tracks = require("./tracks")
const Cars = require("./cars")


var publicPath = path.join(__dirname, "../client")
var port = process.env.PORT || 3000;
var host = process.env.HOST || '0.0.0.0';
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
app.use(express.static(publicPath));

// --------- MATTERJS ----------

const Bodies = matterjs.Bodies;
const Engine = matterjs.Engine;
const Body = matterjs.Body;
const Vector = matterjs.Vector;
const Composite = matterjs.Composite;
const Vertices = matterjs.Vertices;
const Events = matterjs.Events;

// ---------- GLOBALS ----------

const engineCanvas = {width: 5000, height: 5000}; // Also hard-coded in tracks.js
var frameRate = 1000/80;
var allPlayers = [];
var entities = {players: [], entities: [], walls: []};
var currentConnections = [];
var totalConnections = 0;
var currentTrack = Tracks.Square;
var carChoice = Cars.Bullet;

// ---------- MODIFIERS ----------

var debug = false;

// ----------  ENGINE   ----------

const engine = Engine.create();
engine.gravity.scale = 0;
engine.velocityIterations = 2;
engine.positionIterations = 3;


// ---------- WALL OBJS ----------

currentTrack.walls.forEach(w => entities.walls.push(w));
Composite.add(engine.world, Object.values(entities).flat());

server.listen(port, host);

console.log("Server started on port " + port);

io.on("connection", function(socket){
  console.log("New connection, ID: " + socket.id);
  totalConnections++;
  currentConnections.push(socket.id);

  var player;
  socket.on("ready", () => {      
    player = new Player(socket.id, carChoice);
    socket.emit("setupData", {id: player.id, serverCanvas: engineCanvas});
    socket.emit("addPlayer", {playerID: player.id, vector: {x: player.body.position.x, y: player.body.position.y}});
    allPlayers.push(player);
    player.body.playerID = player.id;
    player.body.colour = player.car.colour;
    player.body.colourOutline = player.car.colourOutline;
    entities.players.push(player.body);
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

var processState = function(){

  // Apply movement velocities to players

  for(var i in allPlayers){
    let vx = Body.getVelocity(allPlayers[i].body).x;
    let vy = Body.getVelocity(allPlayers[i].body).y;

    Body.setVelocity(allPlayers[i].body, Vector.create
      (
    vx < allPlayers[i].maxSpeed && vx > -allPlayers[i].maxSpeed
        ? vx + Math.cos(allPlayers[i].angle)*allPlayers[i].acceleration
        : vx,
    vy < allPlayers[i].maxSpeed && vy > -allPlayers[i].maxSpeed
        ? vy + Math.sin(allPlayers[i].angle)*allPlayers[i].acceleration
        : vy
      )
    );

    Body.rotate(allPlayers[i].body, allPlayers[i].angle - allPlayers[i].body.angle);

    // Process player events

    allPlayers[i].events();
  }
}

// The player object constructor
var Player = function(id, car) {
  this.body = car.body
  this.id = id;
  this.bodyid = this.body.id;
  this.car = car;
  this.windowWidth = 0;
  this.windowHeight = 0;
  this.name = car.name;
  this.mouseX;
  this.mouseY;
  this.pos;
  this.maxHP = car.HP;
  this.HP = car.HP;
  this.regen = 0.1;
  this.alive = true;
  this.angle = 0;
  this.maxSpeed = car.maxSpeed;
  this.acceleration = car.acceleration;

  this.events = function() {
    if(this.HP < this.maxHP){
      this.HP += this.regen;
    }
  }

  this.getUpdatePack = function(){
    return{
    id: this.id,
    pos: this.body.position,
    HP: this.HP,
    maxHP: this.maxHP,
    alive: this.alive
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

// Previous velocity handler

var prevVelocities = [];
Events.on(engine, 'beforeUpdate', function () {
  entities.players.forEach(function (body) {
      body.velocityPrev = prevVelocities[body.id] ? prevVelocities[body.id] : Body.getVelocity(body);
      prevVelocities[body.id] = Body.getVelocity(body);
  })
});

// Collision event handler

Events.on(engine, "collisionStart", function(event){
  bodyPairs = event.pairs.map(e => [e.bodyA.id, e.bodyB.id])
  bodyPairs.forEach(function (bp) {
    for (var i in allPlayers){
      if(allPlayers[i].body.id == bp[0] || allPlayers[i].body.id == bp[1]){
        allPlayers[i].HP -= Math.abs(prevVelocities[allPlayers[i].body.id].x) + Math.abs(prevVelocities[allPlayers[i].body.id].y)
      }
    }
  })
});

// loop spped to update player properties
setInterval(() => {
  processState();
  Engine.update(engine, frameRate);
  io.emit("updateState", {
    players: entities.players.map(e =>
       [e.vertices.map(({x, y}) => 
        ({x, y})), e.colour, e.colourOutline]),
    walls: entities.walls.map(e =>
       e.vertices.map(({x, y}) =>
        ({x, y})))
  });
  const playerData = [];
  allPlayers.forEach(p => playerData.push(p.getUpdatePack()));

  io.emit("playerData", playerData);
}, frameRate)