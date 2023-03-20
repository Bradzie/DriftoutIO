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
const carChoice = Cars.Bullet;

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

// ---------- UTILITIES ----------

const buildBody = function(template) {
  switch(template.type) {
    case "Vertices":
      return Bodies.fromVertices(template.x, template.y, Vertices.fromPath(template.points), {restitution: template.bounce});
      break;
    case "Polygon":
      return Bodies.polygon(template.x, template.y, template.sides, template.radius, {restitution: template.bounce})
  }
}

server.listen(port, host);

console.log("Server started on port " + port);

io.on("connection", function(socket){
  console.log("New connection, ID: " + socket.id);
  totalConnections++;
  currentConnections.push(socket.id);

  // New connection

  socket.on("ready", () => {      
    let player = new Player(socket.id, carChoice, buildBody(carChoice.body));
    socket.emit("setupData", {id: player.id, serverCanvas: engineCanvas, abilityName: carChoice.ability === null ? null : carChoice.ability.name});
    socket.emit("addPlayer", {playerID: player.id, vector: {x: player.body.position.x, y: player.body.position.y}});
    player.setup();
    allPlayers.push(player);
    entities.players.push(player.body);
    Composite.clear(engine.world, false);
    Composite.add(engine.world, Object.values(entities).flat());
  });

  // Update player inputs

  socket.on("inputData", (data) => {
    for(var i in allPlayers) {
      if(allPlayers[i].id === socket.id) {
        allPlayers[i].mouseX = data.mouseX;
        allPlayers[i].mouseY = data.mouseY;
        allPlayers[i].angle = data.clientPlayerAngle;
        allPlayers[i].windowWidth = data.windowWidth;
        allPlayers[i].windowHeight = data.windowHeight;
        allPlayers[i].mouseClick = data.mouseClick;
      }
    }
  });

  // Listen for players leaving

  socket.on("removePlayerServer", (data) => {
    let i = allPlayers.indexOf(p => p.id === data.id);
    if(i > -1){
      console.log("Player left | ID: " + allPlayers[i].id);
      j = entities.players.indexOf(p => p.id === allPlayers[i].body.id);
      entities.players.splice(j, 1);
      allPlayers.splice(i, 1);
      Composite.clear(engine.world, false);
      Composite.add(engine.world, Object.values(entities).flat());
    }
  });

});

var processState = function(){

  // Apply movement velocities to players

  for(var i in allPlayers){

    // --- PLAYER MOVEMENT ---
    let vx = Body.getVelocity(allPlayers[i].body).x;
    let vy = Body.getVelocity(allPlayers[i].body).y;
    let maxSpeed = allPlayers[i].mouseClick && allPlayers[i].boost > 0 ? allPlayers[i].maxSpeed * 1.4 : allPlayers[i].maxSpeed;
    let accl = allPlayers[i].mouseClick && allPlayers[i].boost > 0 ? allPlayers[i].acceleration * 1.6 : allPlayers[i].acceleration;
    if (allPlayers[i].mouseClick) {
      allPlayers[i].boost -= allPlayers[i].boost > 0 ? 0.1 : 0;
      console.log(allPlayers[i].boost);
    }


    Body.setVelocity(allPlayers[i].body, Vector.create
      (
    vx < maxSpeed && vx > -maxSpeed
        ? vx + Math.cos(allPlayers[i].angle)*accl
        : vx,
    vy < maxSpeed && vy > -maxSpeed
        ? vy + Math.sin(allPlayers[i].angle)*accl
        : vy
      )
    );

    Body.rotate(allPlayers[i].body, allPlayers[i].angle - allPlayers[i].body.angle);

    // --- PLAYER EVENTS ---
    if(allPlayers[i].HP < allPlayers[i].maxHP){
      allPlayers[i].HP += allPlayers[i].regen;
    }

    if(allPlayers[i].HP < 0){
      console.log("Player crashed | ID: " + allPlayers[i].id);
      j = entities.players.indexOf(p => p.id === allPlayers[i].body.id);
      entities.players.splice(j, 1);
      io.emit("removePlayer", {id: allPlayers[i].id});
      allPlayers.splice(i, 1);
      Composite.clear(engine.world, false);
      Composite.add(engine.world, Object.values(entities).flat());
    }
  }
}

// The player object constructor
var Player = function(id, car, body) {
  this.body = body
  this.id = id;
  this.bodyid = body.id;
  this.car = car;
  this.windowWidth = 0;
  this.windowHeight = 0;
  this.name = car.name;
  this.mouseX;
  this.mouseY;
  this.mouseClick;
  this.pos;
  this.maxHP = car.HP;
  this.HP = car.HP;
  this.regen = 0.1;
  this.angle = 0;
  this.maxSpeed = car.maxSpeed;
  this.acceleration = car.acceleration;
  this.colour = car.colour;
  this.colourOutline = car.colourOutline;
  this.boost = 100;

  this.setup = function(){
    this.body.playerID = this.id;
    this.body.colour = this.colour;
    this.body.colourOutline = this.colourOutline;
  }

  this.getUpdatePack = function(){
    return{
      id: this.id,
      pos: this.body.position,
      HP: this.HP,
      maxHP: this.maxHP,
      boost: this.boost,
    }
  }

  return this;
}

// ---------- COLLISION HANDLING ----------

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

// ---------- GAME LOOP ----------
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