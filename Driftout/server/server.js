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
app.use(express.static(publicPath));

var allPlayers = [];
var mouseIsPressed;

// ---------- CONTSTANTS ----------

var grip = 0.99;

// ---------- ---------- ----------

server.listen(port, function(){
  console.log("Server started on port " + port);
});

io.on("connection", function(socket){
  console.log("New connection, ID: " + socket.id);
  var player;

  socket.on("ready", (data) => {
      player = new Player(socket.id, data.name, 0, 0, data.car);
      player.alive = true;
      allPlayers.push(player);


      socket.emit("myID", {id: player.id});
      console.log(player.id);
      socket.broadcast.emit('newPlayer', player.getInitPack());

      var initPack = [];
      for(var i in allPlayers) {
          initPack.push(allPlayers[i].getInitPack());
          console.log(allPlayers[i].name);
      }
      socket.emit("initPack", {initPack: initPack});
  });

  socket.on("inputData", (data) => {
      for(var i in allPlayers) {
          if(allPlayers[i].id === socket.id) {
              allPlayers[i].mouseX = data.mouseX;
              allPlayers[i].mouseY = data.mouseY;
              allPlayers[i].angle = data.angle;
              allPlayers[i].windowWidth = data.windowWidth;
              allPlayers[i].windowHeight = data.windowHeight;
              mouseIsPressed = data.mouseClick;
              break;
          }
      }
  })

  socket.on("disconnect", () => {
      io.emit('someoneLeft', {id: socket.id});
      for(var i in allPlayers) {
          if(allPlayers[i].id === socket.id) {
              allPlayers.splice(i, 1);
          }
      }
  });

  socket.on("removePlayerServer", () => {
    socket.emit("removePlayerClient");
    for(var i in allPlayers) {
        if(allPlayers[i].id === socket.id) {
            allPlayers.splice(i, 1);
        }
    }
  });
});

// The player object constructor
var Player = function(id, name, x, y, car) {
  console.log(car);
  this.id = id;
  this.name = name;
  this.x = x;
  this.y = y;
  this.vX = 0;
  this.vY = 0;
  this.mouseX;
  this.mouseY;
  this.car = car;
  this.maxHP = car.maxHP;
  this.HP = car.maxHP;
  this.maxSpeed = car.maxSpeed;
  this.maxBoosts = car.maxBoosts;
  this.acceleration = car.acceleration;
  this.alive = true;
  this.drawCar = car.drawCar;
  this.boostPower = car.boostPower;
  this.angle = 0;
  this.canBoost = 0;
  this.boostCooldown = 1000;

  this.events = function(mouseIsPressed) {

    if (this.alive == true){

      if (this.HP < 0){
        this.alive = false;
      }

      // Movement
      if (mouseIsPressed == true && Date.getTime() > canBoost){
        this.vX += Math.cos(this.angle)*this.boostPower;
        this.vY += Math.sin(this.angle)*this.boostPower;
        canBoost = Date.getTime() + boostCooldown;
      }
      if (this.vX < this.maxSpeed && this.vX > -this.maxSpeed){
        this.vX += Math.cos(this.angle)*this.acceleration;
      }
      if (this.vY < this.maxSpeed && this.vY > -this.maxSpeed){
        this.vY += Math.sin(this.angle)*this.acceleration;
      }

      this.doCollisions();

      // Apply movement to player location
      this.x += this.vX;
      this.y += this.vY;

      this.vX = this.vX * grip;
      this.vY = this.vY * grip;

      // Health regen

      if(this.HP < this.maxHP){
        this.HP += 0.05;
      }
    }
  }

  this.doCollisions = function() {

      // Inside rect
    if ((this.x > 200 && this.x < 225) && (this.y > 200 && this.y < 1600)){
      this.x -= 1;
      this.HP -= Math.abs(this.vX)*8;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 200 && this.y < 225) && (this.x > 200 && this.x < 1600)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)*8;
      this.vY = -this.vY * 0.7;
      }

    if ((this.x > 1575 && this.x < 1600) && (this.y > 200 && this.y < 1600)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)*8;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 1575 && this.y < 1600) && (this.x > 200 && this.x < 1600)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)*8;
      this.vY = -this.vY * 0.7;
      }

      // Border rect
    if ((this.x > 2000 && this.x < 2025) && (this.y > -225 && this.y < 2025)){
      this.x -= 1;
      this.HP -= Math.abs(this.vX)*8;
      this.vX = -this.vX * 0.7;
      }

    if ((this.x > -225 && this.x < -200) && (this.y > -225 && this.y < 2025)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)*8;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 2000 && this.y < 2025) && (this.x > -200 && this.x < 2000)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)*8;
      this.vY = -this.vY * 0.7;
      }

    if ((this.y > -225 && this.y < -200) && (this.x > -200 && this.x < 2000)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)*8;
      this.vY = -this.vY * 0.7;
      }
    }

  // Pack to initialize a new instance of a player
  this.getInitPack = function () {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      car: this.car
    }
  }

  // Important player information to be transferred server/client
  this.getUpdatePack = function () {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      HP: this.HP,
      alive: this.alive
    }
  }

  // To sync player positions on a wider interval
  this.getSyncPack = function (){
    return {
      id: this.id,
      x: this.x,
      y: this.y
    }
  }

    return this;
}

// Loop speed to update player properties
setInterval(() => {
    var updatePack = [];

    for(var i in allPlayers) {
        allPlayers[i].events();
        updatePack.push(allPlayers[i].getUpdatePack());
    }

    io.emit("updatePack", {updatePack});
}, 1000/75)

// The car object constructor
var Car = function(name, maxHP, maxSpeed, maxBoosts, upgrades, acceleration, boostPower, drawCar){
  this.name = name;
  this.maxHP = maxHP;
  this.maxSpeed = maxSpeed;
  this.maxBoosts = maxBoosts;
  this.upgrades = upgrades;
  this.acceleration = acceleration;
  this.drawCar = drawCar;
  this.boostPower = boostPower;
}

// Car class objects
allCars = {
  Racer : new Car('Racer', 150, 6, 8, [], 0.11, 2.5, function(x, y, angle){
    push();
    fill(20,20,200);
    translate(x, y);
    rotate(angle);
    stroke(100,100,255);
    strokeWeight(5);
    beginShape();
    vertex(25, 0);
    vertex(-25, 20);
    vertex(-25, -20);
    endShape(CLOSE);
    smooth();
    pop();
  }),
  Prankster : new Car('Prankster', 120, 6, 5, [], 0.1, 2, function(x, y, angle){
    push();
    translate(x, y);
    rotate(angle);
    strokeWeight(5);
    fill(50,255,150);
    stroke(0,150,50);
    beginShape();
    vertex(-10, 10);
    vertex(-10, -10);
    vertex(-25, -20);
    vertex(-25, 20);
    endShape(CLOSE);
    fill(200,0,200);
    stroke(255,100,255);
    beginShape();
    vertex(30, 20);
    vertex(-10, 20);
    vertex(-10, -20);
    vertex(30, -20);
    endShape(CLOSE);
    smooth();
    pop();
  }),
  Bullet : new Car('Bullet', 100, 10, 5, [], 0.12, 2.5, function(x, y, angle){
    push();
    translate(x, y);
    rotate(angle);
    strokeWeight(5);
    fill(230,230,10);
    stroke(125,125,0);
    beginShape();
    vertex(30, 0);
    vertex(15, 20);
    vertex(-30, 20);
    vertex(-30, -20);
    vertex(15, -20);
    endShape(CLOSE);
    smooth();
    pop();
  }),
  Tank : new Car('Tank', 200, 4, 5, [], 0.08, 3, function(x, y, angle){
    push();
    translate(x, y);
    rotate(angle);
    strokeWeight(5);
    fill(50,255,150);
    stroke(0,150,50);
    circle(0,0,70);
    smooth();
    pop();
  }),
  Sprinter : new Car('Sprinter', 80, 12, 10, [], 0.14, 2, function(x, y, angle){
    push();
    translate(x, y);
    rotate(angle);
    strokeWeight(5);
    fill(255,0,0);
    stroke(125,0,0);
    beginShape();
    vertex(30, 0);
    vertex(-30, 18);
    vertex(-30, -18);
    endShape(CLOSE);
    smooth();
    pop();
  }),
  Fragile : new Car('Fragile', 70, 6, 5, [], 0.1, 2.5),
  Spike : new Car('Spike', 150, 5, 3, [], 0.12, 3)
};
