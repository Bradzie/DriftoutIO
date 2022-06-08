var socket;
var player1;
var player2;

// Load prior to game start
function preload(){
  //something
}

// Called when game is started once
function setup(){
  socket = io();
  socket.emit("message", "ahoy there");
  socket.on("returnMessage", function(data){
    console.log(data);
  })
  player1 = Player('Brad', 100, 100);
  player2 = Player('Chloe', 200, 200);

  createCanvas(windowWidth, windowHeight);

}

// Called within a loop for drawing to canvas (no rendering)
function draw(){
  background(50, 50, 50);
  translate(width/2 - player1.x, height/2 - player1.y);

  fill(100)
  rect(300, 300, 600, 600);

  // movement
  if (keyIsDown(65)){
    if (player1.vX > -4){
      player1.vX = player1.vX - 0.1;
    }
  }
  if (keyIsDown(68)){
    if (player1.vX < 4){
      player1.vX = player1.vX + 0.1;
    }
  }
  if (keyIsDown(87)){
    if (player1.vY > -4){
      player1.vY = player1.vY - 0.1;
    }
  }
  if (keyIsDown(83)){
    if (player1.vY < 4){
      player1.vY = player1.vY + 0.1;
    }
  }

  player1.draw();
  player2.draw();

}

var Player = function(name, x, y){
  this.name = name;
  this.x = x;
  this.y = y;
  this.vX = 0;
  this.vY = 0;

  this.draw = function(){

    this.x += this.vX;
    this.y += this.vY;

    player1.vX = this.vX / 1.01;
    player1.vY = this.vY / 1.01;

    fill(150);
    circle(this.x, this.y, 40)
  }

  return this;
}
