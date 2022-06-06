var socket;

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

  createCanvas(windowWidth, windowHeight);
  background(50, 50, 50);

  // x, y, w, h
//  for (let y = 20; y < windowHeight; y=y+75){
//    for (let x = 20; x < windowWidth; x=x+75){
//      rect (x, y, 55, 55)
//    }
//  }

//triangle(x+25, y, x-25, y+15, x-25, y-15);

}

var x = 600;
var y = 200;

var velocityX = 10;
var velocityY = 0;

var gravity = 0.2;



// Called within a loop for drawing to canvas (no rendering)
function draw(){
  resizeCanvas(windowWidth, windowHeight)
  background(50, 50, 50);
  fill(100)
  circle(x, y, 40)
  x = x + velocityX;
  y = y + velocityY;
  velocityY+=gravity;
  //velocityX+=gravity;
  if (y > windowHeight || y < 0){
    velocityY = -velocityY;
  }
  if (x > windowWidth || x < 0){
    velocityX = -velocityX;
  }

}
