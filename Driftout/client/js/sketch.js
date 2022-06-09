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
  player1 = new Player('Brad', 0, 50);
  player2 = new Player('Chloe', 450, 400);

  createCanvas(windowWidth, windowHeight);

}

// this is called alot of times per second (FPS, frame per second)
function draw() {
    background(200, 200, 200); // it gets a hex/rgb color
    translate(width/2 - player1.x, height/2 - player1.y);

    fill(100);
    rect(300, 300, 600, 600);

    movement();

    player1.draw();
    player2.draw();
}

function movement(){
  if (keyIsDown(87)){
    if(player1.vY > -5){
      player1.vY += -0.2;
    }
  }
  if (keyIsDown(83)){
    if(player1.vY < 5){
      player1.vY += 0.2;
    }
  }
  if (keyIsDown(65)){
    if(player1.vX > -5){
      player1.vX += -0.2;
    }
  }
  if (keyIsDown(68)){
    if(player1.vX < 5){
      player1.vX += 0.2;
    }
  }
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
