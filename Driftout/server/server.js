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
var mouseIsPressed = false;

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
      player = new Player(socket.id, data.name, 900, Math.floor((Math.random()-0.5)*200), data.car);
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
      //console.log(mouseIsPressed);
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
  this.boosts = car.maxBoosts;
  this.maxBoosts = car.maxBoosts;
  this.acceleration = car.acceleration;
  this.alive = true;
  this.drawCar = car.drawCar;
  this.boostPower = car.boostPower;
  this.size = car.size;
  this.mass = car.mass;
  this.angle = 0;
  this.canBoost = Date.now();
  this.boostCooldown = 3000;
  this.checkPointCounter = [false, false, false, false];
  this.laps = 0

  this.events = function(mouseIsPressed) {

    if (this.alive == true){

      if (this.HP < 0){
        this.alive = false;
      }

      // Movement
      if (mouseIsPressed == true && Date.now() > this.canBoost && this.boosts > 0){
        this.vX += Math.cos(this.angle)*this.boostPower;
        this.vY += Math.sin(this.angle)*this.boostPower;
        //this.vX = Math.cos(this.angle)+(((this.vY+this.boostPower*2)+this.vX)/2);
        //this.vY = Math.sin(this.angle)+(((this.vX+this.boostPower*2)+this.vY)/2);
        this.canBoost = Date.now() + this.boostCooldown;
        this.boosts-=1
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
        this.HP += 0.2;
      }
    }
  }

  this.doCollisions = function() {

      // Player doCollisions
    if (allPlayers.length > 1){
      for(var i in allPlayers){
        if (allPlayers[i].id != this.id){
          //console.log("self");
          if (Math.sqrt(((this.x-allPlayers[i].x)**2)+((this.y-allPlayers[i].y)**2)) < 70){
            var collidedPlayerAngle = Math.atan2(this.y - allPlayers[i].y, this.x - allPlayers[i].x);

            var xVDiff = this.vX - allPlayers[i].vX;
            var yVDiff = this.vY - allPlayers[i].vY;

            var xDist = allPlayers[i].x - this.x;
            var yDist = allPlayers[i].y - this.y;

            if(xVDiff * xDist + yVDiff * yDist >= 0){
              var angle = -Math.atan2(allPlayers[i].y - this.y, allPlayers[i].x - this.x);

              var m1 = 5;
              var m2 = 1000;

              const u1 = rotate({x : this.vX, y : this.vY}, angle);
              const u2 = rotate({x : allPlayers[i].vX, y : allPlayers[i].vY}, angle);

              var v1 = {x: u1.x * (m1 - m2) / (m1 + m2) + u2.x * 2 * m2 / (m1 + m2), y: u1.y};
              var v2 = {x: u2.x * (m1 - m2) / (m1 + m2) + u1.x * 2 * m2 / (m1 + m2), y: u2.y};

              var v1Final = rotate(v1, -angle);
              var v2Final = rotate(v2, -angle);

              this.HP -= Math.abs((this.vX + this.vY)/2) * 20;
              allPlayers[i].HP -= Math.abs((allPlayers[i].vX + allPlayers[i].vY)/2) * 20;

              this.vX = v1Final.x;
              this.vY = v1Final.y;

              allPlayers[i].vX = v2Final.x;
              allPlayers[i].vY = v2Final.y;
            }
          }
        }
        else{
          //console.log(((allPlayers[i].x-this.x)**2)+((allPlayers[i].y-this.y)**2));
          }
        }
      }

    // Inside rect
    this.collision(this.x, this.y, 200, 225, 200, 1600, "x-1", 8, 0.7);
    this.collision(this.x, this.y, 200, 1600, 200, 225, "y-1", 8, 0.7);
    this.collision(this.x, this.y, 1575, 1600, 200, 1600, "x+1", 8, 0.7);
    this.collision(this.x, this.y, 200, 1600, 1575, 1600, "y+1", 8, 0.7);

    // Outside rect
    this.collision(this.x, this.y, 2000, 2025, -225, 2025, "x-1", 8, 0.7);
    this.collision(this.x, this.y, -225, -200, -225, 2025, "x+1", 8, 0.7);
    this.collision(this.x, this.y, -200, 2000, 2000, 2025, "y-1", 8, 0.7);
    this.collision(this.x, this.y, -200, 2000, -225, -200, "y+1", 8, 0.7);

    // Check if inside finish line
    if (this.collision(this.x, this.y, finishLine[0], finishLine[1],
    finishLine[2], finishLine[3], "trigger") == true){
      if (this.checkPointCounter.every(point => point == true)){
        this.laps += 1;
        this.boosts = this.maxBoosts;
        this.checkPointCounter = [false, false, false, false];
        console.log(this.name + " has now completed " + this.laps + " laps!");
      }
    }

    // Check for collision with check points
    for(var i in checkPoints){
      if (this.collision(this.x, this.y, checkPoints[i][0], checkPoints[i][1],
      checkPoints[i][2], checkPoints[i][3], "trigger") == true){
        this.checkPointCounter[i] = true;
      }
    }

    }
    // The collision function
    this.collision = function(playerx, playery, x1, x2, y1, y2, effect, damage, bounce) {
      if ((playerx > x1 && playerx < x2) && (playery > y1 && playery < y2)){
       if (effect == "x-1"){
         this.x -= 1;
         this.HP -= Math.abs(this.vX)*damage;
         this.vX = -this.vX * bounce;
         }
       if (effect == "x+1"){
         this.x += 1;
         this.HP -= Math.abs(this.vX)*damage;
         this.vX = Math.abs(this.vX)*bounce;
         }
       if (effect == "y-1"){
         this.y -= 1;
         this.HP -= Math.abs(this.vY)*damage;
         this.vY = -this.vY * bounce;
         }
       if (effect == "y+1"){
         this.y += 1;
         this.HP -= Math.abs(this.vY)*damage;
         this.vY = Math.abs(this.vY)*bounce;
         }
       if (effect == "trigger"){
         return true;
         }
       }
      else{
        if (effect == "trigger"){
          return false;
        }
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
      alive: this.alive,
      laps: this.laps,
      boosts: this.boosts,
      boostCooldown: this.boostCooldown,
      canBoost: this.canBoost
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

// Loop speed to update player properties
setInterval(() => {
    var updatePack = [];

    for(var i in allPlayers) {
        allPlayers[i].events(mouseIsPressed);
        console.log(allPlayers.length);
        updatePack.push(allPlayers[i].getUpdatePack());
    }

    io.emit("updatePack", {updatePack});
}, 1000/75)

var checkPoints = [
  [-200, 200, 1600, 2000],
  [-200, 200, -200, 200],
  [1600, 2000, -200, 200],
  [1600, 2000, 1600, 2000]
];

var finishLine = [975, 1025, -200, 200];

// The car object constructor
var Car = function(name, maxHP, maxSpeed, maxBoosts, upgrades, acceleration, boostPower, size, mass, drawCar){
  this.name = name;
  this.maxHP = maxHP;
  this.maxSpeed = maxSpeed;
  this.maxBoosts = maxBoosts;
  this.upgrades = upgrades;
  this.acceleration = acceleration;
  this.drawCar = drawCar;
  this.boostPower = boostPower;
  this.size = size;
  this.mass = mass;
}

// Car class objects
allCars = {
  Racer : new Car('Racer', 150, 6, 8, [], 0.11, 2.5, 25, 5, function(x, y, angle){
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
  Prankster : new Car('Prankster', 120, 6, 4, [], 0.1, 2, 20, 4, function(x, y, angle){
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
  Bullet : new Car('Bullet', 100, 10, 6, [], 0.12, 10, 25, 7, function(x, y, angle){
    push();
    translate(x, y);
    rotate(angle);
    strokeWeight(5);
    fill(230,230,10);
    stroke(125,125,0);
    beginShape();
    vertex(35, 0);
    vertex(25, 0);
    vertex(15, 20);
    vertex(-30, 20);
    vertex(-30, -20);
    vertex(15, -20);
    endShape(CLOSE);
    smooth();
    pop();
  }),
  Tank : new Car('Tank', 200, 4, 5, [], 0.08, 3, 35, 10, function(x, y, angle){
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
  Sprinter : new Car('Sprinter', 80, 12, 10, [], 0.14, 2, 25, 2, function(x, y, angle){
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
