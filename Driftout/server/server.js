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

server.listen(port, function(){
  console.log("Server started on port " + port);
});

io.on("connection", function(socket){
  console.log("New connection, ID: " + socket.id);
  console.log("Working?");
  var player;

  socket.on("ready", (data) => {
      console.log("Recieved ready!");
      player = new Player(socket.id, data.name, Math.random() * 500, Math.random() * 500, allCars.racer);
      allPlayers.push(player);

      socket.emit("myID", {id: player.id});
      socket.broadcast.emit('newPlayer', player.getInitPack());

      var initPack = [];
      for(var i in allPlayers) {
          initPack.push(allPlayers[i].getInitPack());
      }
      socket.emit("initPack", {initPack: initPack});
  });

  socket.on("disconnect", () => {
      io.emit('someoneLeft', {id: socket.id});
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

  this.draw = function() {
    if (this.alive == true){

      this.doCollisions();

      if (this.HP < 0){
        this.alive = false;
      }

      this.angle = atan2(mouseY - windowHeight/2, mouseX - windowWidth/2);
      // decide angle of mouse cursor from middle of canvas

      // movement
      if (mouseIsPressed == true && millis() > canBoost){
        this.vX += cos(angle)*this.boostPower;
        this.vY += sin(angle)*this.boostPower;
        canBoost = millis() + boostCooldown;
      }
      if (player1.vX < player1.maxSpeed && player1.vX > -player1.maxSpeed){
        this.vX += cos(angle)*this.acceleration;
      }
      if (player1.vY < player1.maxSpeed && player1.vY > -player1.maxSpeed){
        this.vY += sin(angle)*this.acceleration;
      }

      // Player's car
      this.drawCar(this.x, this.y, this.angle);

      // Player's name
      textSize(24);
      textAlign(CENTER);
      textStyle(BOLD);
      text(this.name, this.x, this.y + 60);

      // Player's health
      if (this.HP < this.maxHP && this.HP > 0){
        push();
        strokeWeight(12);
        stroke(160,160,160)
        line(this.x - 20, this.y + 70, this.x + 20, this.y + 70);
        strokeWeight(8);
        stroke(220, 0, 0);
        line(this.x - 20, this.y + 70, this.x + 20, this.y + 70);
        stroke(0, 220, 0);
        line(this.x - (this.HP / (this.maxHP / 20)), this.y + 70, this.x + (this.HP / (this.maxHP / 20)),
            this.y + 70);
        pop();
      }

      // Apply movement to player location
      this.x += this.vX;
      this.y += this.vY;

      this.vX = this.vX * grip;
      this.vY = this.vY * grip;

      // Health regen

      this.HP += 0.1;
      }
    }

  this.getInitPack = function () {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      car: this.car
    }
  }

  this.doCollisions = function() {
      // allPlayers
    // allallPlayers.map(player =>{
    //   if (((player.x > this.x-30) && (player.x < this.x+30)) &&
    //      ((player.y > this.y-30) && (player.y < this.y+30))){
    //        if (Math.abs(this.vX) > Math.abs(this.vY)){
    //          this.vX = -this.vX;
    //          if (this.vX > 0) {this.x+=20}
    //          else {this.x-=20};
    //          //this.HP -= Math.abs(this.vX)**2.5;
    //        }
    //        else{
    //          this.vY = -this.vY;
    //          if (this.vY > 0) {this.y+=20}
    //          else {this.y-=20};
    //          //this.HP -= Math.abs(this.vY)**2.5;
    //        }
    //        if (Math.abs(player.vX) > Math.abs(player.vY)){
    //          player.vX = -player.vX;
    //          if (player.vX > 0) {player.x+=20}
    //          else {player.x-=20};
    //          //player.HP -= Math.abs(player.vX)**2.5;
    //        }
    //        else{
    //          player.vY = -player.vY;
    //          if (player.vY > 0) {player.y+=20}
    //          else {player.y-=20};
    //          //player.HP -= Math.abs(player.vY)**2.5;
    //        }
    //      }
    // });

      // Inside rect
    if ((this.x > 200 && this.x < 225) && (this.y > 200 && this.y < 1600)){
      this.x -= 1;
      this.HP -= Math.abs(this.vX)*10;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 200 && this.y < 225) && (this.x > 200 && this.x < 1600)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)*10;
      this.vY = -this.vY * 0.7;
      }

    if ((this.x > 1575 && this.x < 1600) && (this.y > 200 && this.y < 1600)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)*10;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 1575 && this.y < 1600) && (this.x > 200 && this.x < 1600)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)*10;
      this.vY = -this.vY * 0.7;
      }

      // Border rect
    if ((this.x > 2000 && this.x < 2025) && (this.y > -200 && this.y < 2000)){
      this.x -= 1;
      this.HP -= Math.abs(this.vX)*10;
      this.vX = -this.vX * 0.7;
      }

    if ((this.x > -225 && this.x < -200) && (this.y > -200 && this.y < 2000)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)*10;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 2000 && this.y < 2025) && (this.x > -200 && this.x < 2000)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)*10;
      this.vY = -this.vY * 0.7;
      }

    if ((this.y > -225 && this.y < -200) && (this.x > -200 && this.x < 2000)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)*10;
      this.vY = -this.vY * 0.7;
      }
    }

    return this;
}

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

allCars = {
  racer : new Car('Racer', 150, 6, 8, [], 0.11, 2.5, function(x, y, angle){
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
  prankster : new Car('Prankster', 120, 6, 5, [], 0.1, 2, function(x, y, angle){
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
  bullet : new Car('Bullet', 100, 10, 5, [], 0.12, 2.5, function(x, y, angle){
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
  tank : new Car('Tank', 200, 4, 5, [], 0.08, 3, function(x, y, angle){
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
  sprinter : new Car('Sprinter', 80, 12, 10, [], 0.14, 2, function(x, y, angle){
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
  fragile : new Car('Fragile', 70, 6, 5, [], 0.1, 2.5),
  spike : new Car('Spike', 150, 5, 3, [], 0.12, 3)
};
