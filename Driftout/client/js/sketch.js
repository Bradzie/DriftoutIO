var socket;

// Constants

var currentCar;
var allCars;
var grip = 0.99;
var boostCooldown = 1000;
var canBoost = 0;
var allPlayers = [];

// Load prior to game start
function preload(){
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
}

// Called when game is started once
function setup(){
  // Server setup
  allPlayers = [];
  myId = 0;

  socket = io();

  socket.emit("ready", {name: "Brad"});

  socket.on("myID", function(data) {
      myId = data.id;
      console.log(myId + "IT WORKS!");
  });

  socket.on("newPlayer", function(data) {
      var player = new Player(data.id, data.name, data.x, data.y, allCars.racer);
      allPlayers.push(player);
      console.log(allCars);
      console.log(allCars.racer);
      console.log(player.car);
      console.log("Console output");
  });

  socket.on("initPack", function(data) {
      for(var i in data.initPack) {
          var player = new Player(data.initPack[i].id, data.initPack[i].name, data.initPack[i].x, data.initPack[i].y, data.initPack[i].car);
          allPlayers.push(player);
          console.log(myId);
      }
  });

  socket.on("someoneLeft", function(data) {
      for(var i in allPlayers) {
          if(allPlayers[i].id === data.id) {
              allPlayers.splice(i, 1);
          }
      }
  });

  // Game setup
  // allPlayers = [
  //   player1 = new Player('Brad', -50, 1000, allCars.tank),
  //   player2 = new Player('Chloe', 50, 1000, allCars.sprinter),
  //   player3 = new Player('Oreo', -150, 1000, allCars.prankster)
  // ];



  createCanvas(windowWidth, windowHeight);

}

function draw() {
    resizeCanvas(windowWidth, windowHeight);
    background(100, 100, 100); // it gets a hex/rgb color

    for(var i in allPlayers) {
        if(allPlayers[i].id === myId) {
          translate(windowWidth/2 - allPlayers[i].x, windowHeight/2 - allPlayers[i].y);
          allPlayers[i].events();
          drawMap();
        }
        if(allPlayers[i].alive == true){
          //translate(width/2 - allPlayers[i].x, height/2 - allPlayers[i].y);
          //allPlayers[i].events();
          console.log(allPlayers);
          allPlayers[i].draw();
        }
    }

}


function drawMap(){

  push();
  fill(200);
  strokeWeight(5);
  beginShape();
  vertex(-200, -200);
  vertex(-200, 2000);
  vertex(2000, 2000);
  vertex(2000, -200);
  endShape(CLOSE);

  fill(100);
  beginShape();
  vertex(200, 200);
  vertex(200, 1600);
  vertex(1600, 1600);
  vertex(1600, 200);
  endShape(CLOSE);
  pop();
}

// ----------- OBJECTS ------------

// The player object constructor
var Player = function(id, name, x, y, car) {
  this.id = id;
  this.name = name;
  this.x = x;
  this.y = y;
  this.vX = 0;
  this.vY = 0;
  this.angle = 0;
  this.car = car;
  this.maxHP = car.maxHP;
  this.HP = car.maxHP;
  this.maxSpeed = car.maxSpeed;
  this.maxBoosts = car.maxBoosts;
  this.acceleration = car.acceleration;
  this.alive = true;
  this.drawCar = car.drawCar;
  this.boostPower = car.boostPower;

  this.events = function() {
    // angle of car
    this.angle = atan2(mouseY - windowHeight/2, mouseX - windowWidth/2);

    // movement
    if (mouseIsPressed == true && millis() > canBoost){
      this.vX += cos(angle)*this.boostPower;
      this.vY += sin(angle)*this.boostPower;
      canBoost = millis() + boostCooldown;
    }
    if (this.vX < this.maxSpeed && this.vX > -this.maxSpeed){
      this.vX += cos(this.angle)*this.acceleration;
    }
    if (this.vY < this.maxSpeed && this.vY > -this.maxSpeed){
      this.vY += sin(this.angle)*this.acceleration;
    }

    this.doCollisions();

    // Apply movement to player location
    this.x += this.vX;
    this.y += this.vY;

    this.vX = this.vX * grip;
    this.vY = this.vY * grip;

    // Health regen

    this.HP += 0.1;
  }

  this.draw = function() {
    if (this.alive == true){

      if (this.HP < 0){
        this.alive = false;
      }

      // Player's car
      // console.log(this.car.drawCar);
      // console.log(this.drawCar);
      //this.drawCar(this.x, this.y, this.angle);
      allCars.racer.drawCar(this.x, this.y, this.angle);
      console.log(this.id + " " + round(this.x) + " " + round(this.y));


      // Player's name
      textSize(20);
      textAlign(CENTER);
      textStyle(BOLD);
      fill(0,0,0);
      text(this.name + " " + this.id, this.x, this.y + 60);
      // textStyle(NORMAL);
      // fill(255,255,255);
      // text(this.name, this.x, this.y + 60);

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
    }
  }

  this.doCollisions = function() {
      // players
    // allPlayers.map(player =>{
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
      this.HP -= Math.abs(this.vX)*2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 200 && this.y < 225) && (this.x > 200 && this.x < 1600)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)*2.5;
      this.vY = -this.vY * 0.7;
      }

    if ((this.x > 1575 && this.x < 1600) && (this.y > 200 && this.y < 1600)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)*2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 1575 && this.y < 1600) && (this.x > 200 && this.x < 1600)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)*2.5;
      this.vY = -this.vY * 0.7;
      }

      // Border rect
    if ((this.x > 2000 && this.x < 2025) && (this.y > -200 && this.y < 2000)){
      this.x -= 1;
      this.HP -= Math.abs(this.vX)*2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.x > -225 && this.x < -200) && (this.y > -200 && this.y < 2000)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)*2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 2000 && this.y < 2025) && (this.x > -200 && this.x < 2000)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)*2.5;
      this.vY = -this.vY * 0.7;
      }

    if ((this.y > -225 && this.y < -200) && (this.x > -200 && this.x < 2000)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)*2.5;
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
    translate(this.x, this.y);
    rotate(this.angle);
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
    translate(this.x, this.y);
    rotate(this.angle);
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
    translate(this.x, this.y);
    rotate(this.angle);
    strokeWeight(5);
    fill(50,255,150);
    stroke(0,150,50);
    circle(0,0,70);
    smooth();
    pop();
  }),
  sprinter : new Car('Sprinter', 80, 12, 10, [], 0.14, 2, function(x, y, angle){
    push();
    translate(this.x, this.y);
    rotate(this.angle);
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
  })
  //fragile : new Car('Fragile', 70, 6, 5, [], 0.1, 2.5),
  //spike : new Car('Spike', 150, 5, 3, [], 0.12, 3)
};
