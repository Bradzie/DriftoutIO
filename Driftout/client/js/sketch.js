var socket;

// Constants

var player1;
var player2;
var currentCar;
var allCars;
var grip = 0.99;
var boostCooldown = 1000;
var canBoost = 0;
var allPlayers = [];

// function mapBorderLine(x, y, x2, y2){
//   var red = true;
//   var angle = atan(y2, y, x2, x);
//
//   if (x == x2){
//     while (y != y2){
//       beginShape();
//       if (red == true) {fill(220,220,220);}
//       else {fill(220,0,0);}
//       line(x,y,);
//     }
//   }
//
//   while (x < x2 && y < y2){
//     beginShape();
//     if (red == true) {fill(220,220,220);}
//     else {fill(220,0,0);}
//     line(x,y,);
//   }
// }

// Load prior to game start
function preload(){
  allCars = {
    racer : new Car('Racer', 150, 6, 8, [], 0.11, 2.5, function(x, y, angle){
      push();
      fill(20,20,200);
      translate(this.x, this.y);
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
      translate(this.x, this.y);
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
      translate(this.x, this.y);
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
      translate(this.x, this.y);
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
  socket = io();


  // Game setup
  allPlayers = [
    player1 = new Player('Brad', -50, 1000, allCars.tank),
    player2 = new Player('Chloe', 50, 1000, allCars.sprinter),
    player3 = new Player('Oreo', -150, 1000, allCars.prankster),
    player4 = new Player('newKitty', 150, 1000, allCars.racer)
  ];

  console.log(allPlayers);


  createCanvas(windowWidth, windowHeight);

}

// this is called alot of times per second (FPS, frame per second)
function draw() {
    resizeCanvas(windowWidth, windowHeight);
    background(100, 100, 100); // it gets a hex/rgb color
    translate(width/2 - player1.x, height/2 - player1.y);

    drawMap();

    allPlayers.map(player => player.draw());

    // for (var player in allPlayers) {
    //   console.log(player);
    //   if (player.alive == true) {
    //     player.draw();
    //     player.doCollisions();
    //   }
    // }

    // if (player1.alive == true){
    //   player1.draw();
    //   player1.events();
    //   player1.doCollisions();
    // }
    //
    // player2.draw();
    // player2.doCollisions();
    //
    // player3.draw();
    // player3.doCollisions();
    //
    // player4.draw();
    // player4.doCollisions();
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
var Player = function(name, x, y, car) {
  console.log(car);
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

  this.draw = function() {

    this.doCollisions();

    if (this.HP < 0){
      this.alive = false;
    }

    var angle = atan2(mouseY - windowHeight/2, mouseX - windowWidth/2);
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
    this.drawCar(this.x, this.y, angle);

    // Player's name
    textSize(30);
    textAlign(CENTER);
    textStyle(BOLD);
    text(this.name, this.x, this.y + 60);

    // Player's health
    if (this.HP < this.maxHP && this.HP > 0){
      push();
      strokeWeight(10);
      line(this.x - 40, this.y + 70, this.x + 40, this.y + 70);
      strokeWeight(8);
      stroke(220, 0, 0);
      line(this.x - 40, this.y + 70, this.x + 40, this.y + 70);
      stroke(0, 220, 0);
      line(this.x - (this.HP / (this.maxHP / 40)), this.y + 70, this.x + (this.HP / (this.maxHP / 40)),
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

  this.doCollisions = function() {

      // Inside rect
    if ((this.x > 200 && this.x < 225) && (this.y > 200 && this.y < 1600)){
      this.x -= 1;
      this.HP -= Math.abs(this.vX)**2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 200 && this.y < 225) && (this.x > 200 && this.x < 1600)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)**2.5;
      this.vY = -this.vY * 0.7;
      }


    if ((this.x > 1575 && this.x < 1600) && (this.y > 200 && this.y < 1600)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)**2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 1575 && this.y < 1600) && (this.x > 200 && this.x < 1600)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)**2.5;
      this.vY = -this.vY * 0.7;
      }

      // Border rect
    if ((this.x > 2000 && this.x < 2025) && (this.y > -200 && this.y < 2000)){
      this.x -= 1;
      this.HP -= Math.abs(this.vX)**2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.x > -225 && this.x < -200) && (this.y > -200 && this.y < 2000)){
      this.x += 1;
      this.HP -= Math.abs(this.vX)**2.5;
      this.vX = -this.vX * 0.7;
      }

    if ((this.y > 2000 && this.y < 2025) && (this.x > -200 && this.x < 2000)){
      this.y -= 1;
      this.HP -= Math.abs(this.vY)**2.5;
      this.vY = -this.vY * 0.7;
      }

    if ((this.y > -225 && this.y < -200) && (this.x > -200 && this.x < 2000)){
      this.y += 1;
      this.HP -= Math.abs(this.vY)**2.5;
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
