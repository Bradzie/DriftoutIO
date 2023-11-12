const path = require("path");
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const matterjs = require("matter-js");
const { v4: uuidv4 } = require('uuid');
const Tracks = require("./tracks")
const CarData = require("./cars")
const rooms = {};

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
const Query = matterjs.Query;

// ---------- GLOBALS ----------

const engineCanvas = {width: 5000, height: 5000}; // Also hard-coded in tracks.js
var frameRate = 1000/60;
// var allPlayers = [];
// var entities = {players: [], entities: [], walls: [], triggers: []};
var currentConnections = [];
var totalConnections = 0;
var currentTrack = Tracks.Square;

// ---------- MODIFIERS ----------

var debug = false;

// ---------- WALL OBJS ----------

// ---------- UTILITIES ----------

const cleanseName = function(name, carName) {
  if(name.length > 14)
    name = name.substring(0,14);
  if(name === "" || name.includes("<"))
    name = carName;
  return name;
}

const buildBody = function(template) {
  switch(template.type) {
    case "Vertices":
      return Bodies.fromVertices(template.x, template.y, Vertices.fromPath(template.points), {restitution: template.bounce, collisionFilter:{group: 1, mask: 0}});
    case "Polygon":
      return Bodies.polygon(template.x, template.y, template.sides, template.radius, {restitution: template.bounce, collisionFilter:{group: 1, mask: 0}})
  }
}

// -------- ROOM HANDLING ---------

const joinRoom = (player, roomId) => {
  const room = rooms[roomId];
  if (room) {
    room.players.push(player);
    player.roomId = roomId;
    player.socket.join(roomId);
  }
  return roomId;
};

const createRoom = (player, roomName) => {
  const roomId = uuidv4();
  const room = new Room(roomName, roomId);
  rooms[roomId] = room;
  room.setup();
  joinRoom(player, roomId);
  return roomId;
};

const leaveRoom = (player) => {
  const room = rooms[player.roomId];
  if (room) {
    room.players = room.players.filter((p) => p.id !== player.id);
    player.socket.leave(player.roomId);
    player.roomId = null;
    if (room.players.length === 0) {
      delete rooms[room.id];
    }
  }
};

const autoAssignRoom = (player) => {
  if(rooms.length === 0){
    return createRoom(player);    
  }
  else{
    let bestRoom = null;
    for(var i in rooms){
      if((bestRoom.players.length < rooms[i].players.length || bestRoom === null) && rooms[i].players.length < rooms[i].maxRoomSize)
        bestRoom = rooms[i];
    }
    if(bestRoom === null)
      return createRoom(player);
    else
      return joinRoom(player, bestRoom.roomId);
  }
}

// ---------- ---------- ----------

server.listen(port, host);

console.log(`Server started on port ${port}`);

io.on("connection", function(socket){
  console.log(`New connection, ID: ${socket.id}`);
  totalConnections++;
  currentConnections.push(socket.id);  

  // New player
  socket.on("ready", (data) => {
    const carChoice = structuredClone(CarData.Cars[Object.keys(CarData.Cars)[data.car]]);
    const abilityData = CarData.Abilities[Object.keys(CarData.Abilities)[data.car]];
    let playerName = cleanseName(data.name, carChoice.name);
    let player = new Player(socket.id, playerName, carChoice, buildBody(carChoice.body), abilityData, socket);
    let roomId = autoAssignRoom(player);
    player.setup();
    rooms[roomId].entities.players.push(player.body);
    Composite.clear(rooms[roomId].engine.world, false);
    Composite.add(rooms[roomId].engine.world, Object.values(rooms[roomId].entities).flat());
    socket.emit("setupData", {id: player.id, roomId: roomId, serverCanvas: engineCanvas, abilityName: abilityData === null ? null : abilityData.data.name});
    socket.emit("addPlayer", {playerID: player.id, name: playerName, vector: {x: player.body.position.x, y: player.body.position.y}});
    console.log(`New ${carChoice.name}, "${playerName}" In room ${roomId}`)
  });

  // Update player inputs
  socket.on("inputData", (data) => {
    let allPlayers = rooms[data.roomId].players || [];
    for(var i in allPlayers) {
      if(allPlayers[i].id === socket.id) {
        allPlayers[i].mouseX = data.mouseX;
        allPlayers[i].mouseY = data.mouseY;
        allPlayers[i].angle = data.clientPlayerAngle;
        allPlayers[i].windowWidth = data.windowWidth;
        allPlayers[i].windowHeight = data.windowHeight;
        allPlayers[i].inputs.mouseClick = data.mouseClick;
        allPlayers[i].inputs.spacePressed = data.spacePressed;
      }
    }
  });

  // Listen for players leaving
  socket.on("removePlayerServer", (data) => {
    let i = rooms[data.roomId].players.indexOf(p => p.id === data.id);
    if(i > -1){
      console.log(`Player left | ID: ${rooms[data.roomId].players[i].id}`);
      j = rooms[data.roomId].entities.players.indexOf(p => p.id === rooms[data.roomId].players[i].body.id);
      rooms[data.roomId].entities.players.splice(j, 1);
      rooms[data.roomId].players.splice(i, 1);
      Composite.clear(engine.world, false);
      Composite.add(engine.world, Object.values(entities).flat());
    }
  });

  

});

// --------- GAME STATE UPDATE ---------

var processState = function(room){

  // --- CHECKPOINT UPDATES ---

  for (var i in room.track.checkPoints){
    let updatePlayersCheckpoint = Query.region(room.entities.players, room.track.checkPoints[i])
    for (var j in updatePlayersCheckpoint){
      let player = room.players[room.players.findIndex(ap => updatePlayersCheckpoint[j].playerID === ap.id)];
      if (player != null)
        player.checkPoints[i] = true;
    }
  }
  let updatePlayersFinish = Query.region(room.entities.players, room.track.finishLine.bounds);

  // ------ PLAYER EVENTS ------
  for(var i in room.players){

    // --- PLAYER MOVEMENT ---
    let vx = Body.getVelocity(room.players[i].body).x;
    let vy = Body.getVelocity(room.players[i].body).y;
    let maxSpeed = room.players[i].mouseClick && room.players[i].boost > 0 ? room.players[i].maxSpeed * 1.8 : room.players[i].maxSpeed;
    let accl = room.players[i].mouseClick && room.players[i].boost > 0 ? room.players[i].acceleration * 1.6 : room.players[i].acceleration;

    Body.setVelocity(room.players[i].body, Vector.create
      (
    vx < maxSpeed && vx > -maxSpeed
        ? vx + Math.cos(room.players[i].angle)*accl
        : vx,
    vy < maxSpeed && vy > -maxSpeed
        ? vy + Math.sin(room.players[i].angle)*accl
        : vy
      )
    );

    Body.setAngularVelocity(room.players[i].body, room.players[i].angle - room.players[i].body.angle);

    // --- INPUT-TRIGGERED EVENTS ---
    if(Object.values(room.players[i].inputs).some(input => input === true)){

      // BOOST
      if (room.players[i].inputs.mouseClick)
        room.players[i].boost -= room.players[i].boost > 0.2 ? 0.2 : 0;

      // ABILITY
      if (room.players[i].inputs.spacePressed && room.players[i].abilityData != null){
        if(room.players[i].abilityData.data.nextUse < Date.now()){
          room.players[i] = room.players[i].abilityData.fire(room.players[i]);
          room.players[i].abilityData.data.nextUse = Date.now() + room.players[i].abilityData.data.cooldown;
        }
      }
    }

    // --- FINISH LINE CHECK ---
    if([...updatePlayersFinish.map(upf => upf.playerID)].includes(room.players[i].id)){
      if(room.players[i].checkPoints.every(cp => cp === true)){
        room.players[i].HP = room.players[i].maxHP;
        room.players[i].boost = 100;
        room.players[i].laps++;
        room.players[i].checkPoints.map(cp => cp = false);
      }
    }

    // --- PLAYER PASSIVE EVENTS ---
    if(room.players[i].HP < room.players[i].maxHP)
      room.players[i].HP += room.players[i].regen;

    if(room.players[i].HP < 0){
      console.log(`Player crashed | ID: ${room.players[i].id}`);
      j = room.entities.players.findIndex(p => p.id === room.players[i].body.id);
      room.entities.players[j].playerID = null;
      room.entities.players[j].decay = Date.now() + 3000;
      room.entities.players[j].colour = {r: 50, g: 50, b: 50};
      room.entities.players[j].colourOutline = {r: 100, g: 100, b: 100};
      io.emit("removePlayer", {id: room.players[i].id});
      room.players.splice(i, 1);
    }
  }

  // --- ENTITY EVENTS ---
  for (var i in room.entities.players){

    // Remove entity from world if decay timer has expired
    if(room.entities.players[i].decay){
      if(room.entities.players[i].decay < Date.now()){
        room.entities.players.splice(j, 1);
        Composite.clear(room.engine.world, false);
        Composite.add(room.engine.world, Object.values(room.entities).flat());
      }
    }
  }
}

var emitUpdates = function(room){
  io.emit("updateState", {
    players: room.entities.players.map(e =>
       [e.vertices.map(({x, y}) => 
        ({x, y})), e.colour, e.colourOutline]),
    walls: room.entities.walls.map(e =>
       e.vertices.map(({x, y}) =>
        ({x, y}))),
    borderLines: room.track.borderLines,
    finishLine: room.track.finishLine.line,
  });
  let playerData = [];
  room.players.forEach(p => playerData.push(p.getUpdatePack()));
  io.to(room.roomId).emit("playerData", playerData);
}

// ---------- COLLISION HANDLING ----------

// Collision event handler
// Events.on(engine, "collisionStart", function(event){
//   bodyPairs = event.pairs.map(e => [e.bodyA, e.bodyB])
//   bodyPairs.forEach(function (bp) {
//     if(bp[0].playerID){
//       allPlayers[allPlayers.findIndex(p => p.body.id === bp[0].id)].HP -= event.pairs[0].collision.depth * 15;
//     }
//     if(bp[1].playerID){
//       allPlayers[allPlayers.findIndex(p => p.body.id === bp[1].id)].HP -= event.pairs[0].collision.depth * 15;
//     }
//   })
// });

// ---------- GAME LOOP ----------
setInterval(() => {
  for(var i in rooms){
    processState(rooms[i]);
    emitUpdates(rooms[i]);
    Engine.update(rooms[i].engine, frameRate/2);
  }
}, frameRate*2)

// The player object constructor
var Player = function(id, name,  car, body, abilityData, socket) {
  this.body = body
  this.id = id;
  this.name = name;
  this.bodyid = body.id;
  this.car = car;
  this.windowWidth = 0;
  this.windowHeight = 0;
  this.name = car.name;
  this.mouseX;
  this.mouseY;
  this.maxHP = car.HP;
  this.HP = car.HP;
  this.abilityData = abilityData;
  this.regen = 0.1;
  this.angle = 0;
  this.maxSpeed = car.maxSpeed;
  this.acceleration = car.acceleration;
  this.colour = car.colour;
  this.colourOutline = car.colourOutline;
  this.boost = 100;
  this.inputs = {
    mouseClick: false,
    spacePressed : false,
  };
  this.checkPoints = [];
  this.laps = 0;
  this.socket = socket;
  this.roomId = null;

  this.setup = function(){
    this.body.playerID = this.id;
    this.body.colour = this.colour;
    this.body.colourOutline = this.colourOutline;
    if(this.abilityData != null)
      this.abilityData.data.nextUse = 0;
    rooms[this.roomId].track.checkPoints.forEach(cp => this.checkPoints.push(false))
  }

  this.getUpdatePack = function(){
    return{
      id: this.id,
      pos: this.body.position,
      HP: this.HP,
      maxHP: this.maxHP,
      boost: this.boost,
      nextAbilityUse: this.abilityData === null ? null : ((Date.now() - (this.abilityData.data.nextUse - this.abilityData.data.cooldown)) / (this.abilityData.data.nextUse - (this.abilityData.data.nextUse - this.abilityData.data.cooldown))) * 100,
      laps: this.laps,
    }
  }

  return this;
}

var Room = function(name, id){
  this.name = name;
  this.id = id;
  this.players = [];
  this.entities = {players: [], entities: [], walls: [], triggers: []};
  this.track = currentTrack;
  this.maxRoomSize = 6;

  this.setup = function(){
    this.engine = Engine.create();
    this.engine.gravity.scale = 0;
    this.engine.velocityIterations = 3;
    this.engine.positionIterations = 5;

    this.track.checkPoints.forEach(w => this.entities.triggers.push(w));
    this.track.walls.forEach(w => this.entities.walls.push(w));
    Composite.add(this.engine.world, Object.values(this.entities).flat());

    var players = this.players
    Events.on(this.engine, "collisionStart", function(event){
      bodyPairs = event.pairs.map(e => [e.bodyA, e.bodyB])
      bodyPairs.forEach(function (bp) {
        if(bp[0].playerID){
          players[players.findIndex(p => p.body.id === bp[0].id)].HP -= event.pairs[0].collision.depth * 15;
        }
        if(bp[1].playerID){
          players[players.findIndex(p => p.body.id === bp[1].id)].HP -= event.pairs[0].collision.depth * 15;
        }
      })
    });
  }
}