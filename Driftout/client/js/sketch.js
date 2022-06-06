var socket;

// Load prior to game start
function preload(){
  //something
}

// Called when game is started once
function setup(){
  socket = io();
}

// Called within a loop for drawing to canvas (no rendering)
function draw(){
  console.log("loop");
}
