var playing = false,
  socket,
  mainCanvas = document.getElementById("mainCanvas"),
  gameTitle = document.getElementById("gameTitle"),
  enterGameButton = document.getElementById('enterGameButton'),
  menuContainer = document.getElementById("menuContainer"),
  carInputRacer = document.getElementById('carInputRacer'),
  carInputTank = document.getElementById('carInputTank'),
  carInputSprinter = document.getElementById('carInputSprinter'),
  carInputPrankster = document.getElementById('carInputPrankster'),
  carInputBullet = document.getElementById('carInputBullet'),
  carRadio = document.getElementById('carRadio'),
  nameInput = document.getElementById('nameInput'),
  leaderboardContainer = document.getElementById('leaderboardContainer'),
  leaderboardItem = document.getElementById('leaderboardItem');

// Constants
var allCars;
var allPlayers = [];

// Load prior to game start
function preload(){
  allCars = {
    Racer : new Car('Racer', 150, 6, 8, [], 0.11, 2.5, function(x, y, angle){
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
    Prankster : new Car('Prankster', 120, 6, 5, [], 0.1, 2, function(x, y, angle){
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
    Bullet : new Car('Bullet', 100, 10, 5, [], 0.12, 2.5, function(x, y, angle){
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
    Tank : new Car('Tank', 200, 4, 5, [], 0.08, 3, function(x, y, angle){
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
    Sprinter : new Car('Sprinter', 80, 12, 10, [], 0.14, 2, function(x, y, angle){
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
}

// Called when game is started once
function setup(){
  // Server setup
  allPlayers = [];
  myId = 0;

  socket = io();

  socket.on("myID", function(data) {
      myId = data.id;
  });

  socket.on("newPlayer", function(data) {
      var newCar = Object.entries(allCars).filter(car => car[0] == data.car.name)[0][1];
      var player = new Player(data.id, data.name, data.x, data.y, newCar);
      allPlayers.push(player);
      console.log(allPlayers);
      refreshLeaderboard();
  });

  socket.on("removePlayerClient", () => {
    for(var i in allPlayers) {
      if(allPlayers[i].id === socket.id) {
        allPlayers.splice(i, 1);
      }
    }
  });

  socket.on("initPack", function(data) {
      for(var i in data.initPack) {
          var newCar = Object.entries(allCars).filter(car => car[0] == data.initPack[i].car.name)[0][1];
          var player = new Player(data.initPack[i].id, data.initPack[i].name, data.initPack[i].x, data.initPack[i].y, newCar);
          allPlayers.push(player);
          console.log(myId);
          refreshLeaderboard();
      }
  });

  socket.on("updatePack", function(data) {
      for(var i in data.updatePack) {
          for(var j in allPlayers) {
              if(allPlayers[j].id === data.updatePack[i].id) {
                  allPlayers[j].x = data.updatePack[i].x;
                  allPlayers[j].y = data.updatePack[i].y;
                  allPlayers[j].angle = data.updatePack[i].angle;
                  allPlayers[j].HP = data.updatePack[i].HP;
                  allPlayers[j].alive = data.updatePack[i].alive;
              }
          }
      }
  });

  socket.on("someoneLeft", function(data) {
      for(var i in allPlayers) {
          if(allPlayers[i].id === data.id) {
              allPlayers.splice(i, 1);
          }
      }
  });

  var mainCanvas = createCanvas(windowWidth, windowHeight);
  mainCanvas.parent("mainCanvas");

}

function draw() {
  if (playing == true){
    resizeCanvas(windowWidth, windowHeight);
    background(100, 100, 100); // it gets a hex/rgb color
    sendInputData();

    for(var i in allPlayers) {
        if(allPlayers[i].id == myId) {
          if(allPlayers[i].alive == false){
            exitGame();
          }
          translate(width/2 - allPlayers[i].x, height/2 - allPlayers[i].y);
        }
    }

    drawMap();

    for(var i in allPlayers) {
      if(allPlayers[i].alive == true){
        //translate(width/2 - allPlayers[i].x, height/2 - allPlayers[i].y);
        //allPlayers[i].events();
        allPlayers[i].draw();
      }
    }
  }
}

function exitGame(){
  menuContainer.style.visibility = "visible";
  menuContainer.style.opacity = "1";
  leaderboardContainer.style.visibility = "hidden";
  leaderboardContainer.style.opacity = "0";
  playing = false;
  socket.emit("removePlayerServer");
}

function enterGame(){
  var carChoice = '';
  playing = true;
  if(carInputRacer.checked == true){
    carChoice = allCars.Racer;
    console.log('racer');
  }
  if(carInputTank.checked == true){
    carChoice = allCars.Tank;
    console.log('tank');
  }
  if(carInputSprinter.checked == true){
    carChoice = allCars.Sprinter;
    console.log('sprinter');
  }
  if(carInputPrankster.checked == true){
    carChoice = allCars.Prankster;
    console.log('prankster');
  }
  if(carInputBullet.checked == true){
    carChoice = allCars.Bullet;
    console.log('bullet');
  }

  socket.emit("ready", {name: nameInput.value, car: carChoice});
  menuContainer.style.visibility = "hidden";
  menuContainer.style.opacity = "0";
  leaderboardContainer.style.visibility = "visible";
  leaderboardContainer.style.opacity = "1";
  //console.log(allPlayers);
}

function refreshLeaderboard(){
  leaderboardContainer.innerHTML = "Leaderboard";
  var text = "";
  for(var i in allPlayers){
    if(allPlayers[i].alive == true){
      text += "<div class = 'leaderboardItem'>" + allPlayers[i].name + "</div>\n";
    }
    else{
      allPlayers.splice(i, 1);
    }
  }
  leaderboardContainer.innerHTML = "Leaderboard\n" + text;
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

  mapBorderLine(-200, -200, 2000, -200);
  mapBorderLine(-200, 2000, -200, -200);
  mapBorderLine(-200, 2000, 2000, 2000);
  mapBorderLine(2000, -200, 2000, 2000);

  mapBorderLine(200, 200, 1600, 200);
  mapBorderLine(200, 1600, 200, 200);
  mapBorderLine(200, 1600, 1600, 1600);
  mapBorderLine(1600, 200, 1600, 1600);

}

function mapBorderLine(x1, y1, x2, y2){
  var count = 0;
  var max = 0;
  var isRed = true;

  strokeCap(ROUND);
  strokeWeight(50);

  max = Math.sqrt(((x2-x1)**2)+((y2-y1)**2)) / 75

  while(count<21){
    if (isRed == true){
      stroke(255,0,0);
      isRed = false;
    }
    else{
      stroke(255,255,255);
      isRed = true;
    }
    line(x1+(((x2-x1)/21)*count),y1+(((y2-y1)/21)*count),x2,y2);
    strokeCap(SQUARE);
    count++;
  }
  strokeCap(ROUND);
  strokeWeight(0);
  stroke(0,0,0);
}

function sendInputData() {
    var angle = atan2(mouseY - windowHeight/2, mouseX - windowWidth/2);
    var mouseClick = false;
    if (mouseIsPressed === true){
      mouseClick = true;
    }
    socket.emit("inputData", {mouseX, mouseY, angle, windowWidth, windowHeight, mouseClick});
}


// ----------- OBJECTS ---------------------------------------------------

// The player object constructor
var Player = function(id, name, x, y, car, alive) {
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

  this.draw = function() {

    // Player's car
    //console.log(this.HP, this.maxHP);
    this.drawCar(this.x, this.y, this.angle);
    //console.log("Player name: " + this.name + " at x: " + this.x + " at y: " + this.y);
    //console.log(this.id + " " + round(this.x) + " " + round(this.y));


    // Player's name
    textSize(20);
    textAlign(CENTER);
    textStyle(BOLD);
    fill(0,0,0);
    text(this.name, this.x, this.y + 60);

    // Player's health
    if (this.HP < this.maxHP && this.HP > 0){
      push();
      strokeWeight(12);
      stroke(120,120,120)
      line(this.x - 20, this.y + 70, this.x + 20, this.y + 70);
      strokeWeight(8);
      stroke(80, 80, 80);
      line(this.x - 20, this.y + 70, this.x + 20, this.y + 70);
      if (this.HP < (this.maxHP / 4)){
        stroke(220, 0, 0);
      }
      else{
        stroke(0, 220, 0);
      }
      line(this.x - (this.HP / (this.maxHP / 20)), this.y + 70, this.x + (this.HP / (this.maxHP / 20)),
          this.y + 70);
      pop();
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
