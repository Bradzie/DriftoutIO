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
  player1 = new Player('Brad', -50, 1000);
  player2 = new Player('Chloe', 50, 1000);

  createCanvas(windowWidth, windowHeight);

}

// this is called alot of times per second (FPS, frame per second)
function draw() {
    background(100, 100, 100); // it gets a hex/rgb color
    translate(width/2 - player1.x, height/2 - player1.y);

    drawMap();

    movement();

    collisions();

    player1.draw();
    player2.draw();
}

function movement(){
  if (keyIsDown(87)){
    if(player1.vY > -6){
      player1.vY += -0.08;
    }
  }
  if (keyIsDown(83)){
    if(player1.vY < 6){
      player1.vY += 0.08;
    }
  }
  if (keyIsDown(65)){
    if(player1.vX > -6){
      player1.vX += -0.08;
    }
  }
  if (keyIsDown(68)){
    if(player1.vX < 6){
      player1.vX += 0.08;
    }
  }
}

function collisions(){

  // Inside rect
  if ((player1.x > 200 && player1.x < 225) && (player1.y > 200 && player1.y < 1600)){
    player1.x -= 1;
    player1.vX = -player1.vX * 0.7;
  }

  if ((player1.y > 200 && player1.y < 225) && (player1.x > 200 && player1.x < 1600)){
    player1.y -= 1;
    player1.vY = -player1.vY * 0.7;
  }


  if ((player1.x > 1575 && player1.x < 1600) && (player1.y > 200 && player1.y < 1600)){
    player1.x += 1;
    player1.vX = -player1.vX * 0.7;
  }

  if ((player1.y > 1575 && player1.y < 1600) && (player1.x > 200 && player1.x < 1600)){
    player1.y += 1;
    player1.vY = -player1.vY * 0.7;
  }

  // Border rect
  if ((player1.x > 2000 && player1.x < 2025) && (player1.y > -200 && player1.y < 2000)){
    player1.x -= 1;
    player1.vX = -player1.vX * 0.7;
  }

  if ((player1.x > -225 && player1.x < -200) && (player1.y > -200 && player1.y < 2000)){
    player1.x += 1;
    player1.vX = -player1.vX * 0.7;
  }

  if ((player1.y > 2000 && player1.y < 2025) && (player1.x > -200 && player1.x < 2000)){
    player1.y -= 1;
    player1.vY = -player1.vY * 0.7;
  }

  if ((player1.y > -225 && player1.y < -200) && (player1.x > -200 && player1.x < 2000)){
    player1.y += 1;
    player1.vY = -player1.vY * 0.7;
  }


  // if (player1.x > 2000 || player1.x < -200){
  //   player1.vX = -player1.vX * 0.7;
  // }
  if (player1.y > 2000 || player1.y < -200){
    player1.vY = -player1.vY * 0.7;
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

// The player object constructor
var Player = function(name, x, y) {
  this.name = name;
  this.x = x;
  this.y = y;
  this.vX = 0;
  this.vY = 0;

  this.draw = function() {
    var angle = atan2(mouseY - windowHeight/2, mouseX - windowWidth/2);
    // decide angle of mouse cursor from middle of canvas

    push();
    fill(60);
    translate(this.x, this.y);
    rotate(angle);
    strokeWeight(5);
    beginShape();
    vertex(25, 0);
    vertex(-25, 20);
    vertex(-25, -20);
    endShape(CLOSE);
    pop();

    this.x += this.vX;
    this.y += this.vY;

    this.vX = this.vX * 0.99;
    this.vY = this.vY * 0.99;

    }

    return this;
}
