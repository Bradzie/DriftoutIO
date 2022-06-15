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
}

// Called when game is started once
function setup(){
  // Server setup
  socket = io();
  createCanvas(windowWidth, windowHeight);

  allPlayers = [];
  myId = 0;

  socket.emit("ready", {name: "Brad"});

  socket.on("myID", function(data) {
      myId = data.id;
  });

  socket.on("newPlayer", function(data) {
      var player = new Player(data.id, data.name, data.x, data.y, allCars.racer);
      allPlayers.push(player);
  });

  socket.on("initPack", function(data) {
      for(var i in data.initPack) {
          var player = new Player(data.initPack[i].id, data.initPack[i].name, data.initPack[i].x, data.initPack[i].y);
          players.push(player);
          console.log(myId);
      }
  });

  socket.on("someoneLeft", function(data) {
      for(var i in players) {
          if(players[i].id === data.id) {
              players.splice(i, 1);
          }
      }
  });

}

// this is called alot of times per second (FPS, frame per second)
function draw() {
    resizeCanvas(windowWidth, windowHeight);
    background(100, 100, 100); // it gets a hex/rgb color
    translate(width/2 - player1.x, height/2 - player1.y);

    drawMap();

    allPlayers.map(player =>{
      if(player.alive == true){player.draw()}
    });

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
