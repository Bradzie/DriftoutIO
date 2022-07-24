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
  carInputFragile = document.getElementById('carInputFragile'),
  carInputSpike = document.getElementById('carInputSpike'),
  carRadio = document.getElementById('carRadio'),
  nameInput = document.getElementById('nameInput'),
  gameGuiContainer = document.getElementById('gameGuiContainer'),
  notificationContainer = document.getElementById('notificationContainer'),
  leaderboardContainer = document.getElementById('leaderboardContainer'),
  leaderboardItem = document.getElementById('leaderboardItem'),
  boostContainer = document.getElementById('boostContainer'),
  boostContainerCooldown = document.getElementById('boostContainerCooldown');

// Constants
var allCars;
var allPlayers = [];
var notifications = [];
var nextNotification = 0;

// Load prior to game start
function preload(){
  allCars = {
    Racer : new Car('Racer', 150, 6, 8, [], 0.11, 2.5, 25, 5, function(x, y, angle){
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
    Prankster : new Car('Prankster', 120, 6, 5, [], 0.1, 2, 20, 4, function(x, y, angle){
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
    Bullet : new Car('Bullet', 100, 12, 5, [], 0.08, 2.5, 25, 7, function(x, y, angle){
      push();
      translate(x, y);
      rotate(angle);
      strokeWeight(5);
      fill(230,230,10);
      stroke(125,125,0);
      beginShape();
      vertex(30, -10);
      vertex(30, 10);
      vertex(15, 20);
      vertex(-30, 20);
      vertex(-30, -20);
      vertex(15, -20);
      endShape(CLOSE);
      smooth();
      pop();
    }),
    Tank : new Car('Tank', 200, 4, 5, [], 0.08, 3, 35, 10, function(x, y, angle){
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
    Sprinter : new Car('Sprinter', 80, 12, 10, [], 0.14, 2, 25, 2, function(x, y, angle){
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
    Fragile : new Car('Fragile', 70, 6, 5, [], 0.1, 2.5, 25, 1, function(x, y, angle){
      push();
      translate(x, y);
      rotate(angle);
      strokeWeight(5);
      fill(255, 210, 120);
      stroke(100, 100, 100);
      beginShape();
      vertex(0, 25);
      vertex(25, 0);
      vertex(0, -25);
      vertex(-25, 0);
      endShape(CLOSE);
      smooth();
      pop();
    }),
    Spike : new Car('Spike', 150, 5, 3, [], 0.12, 3, 30, 8, function(x, y, angle){
      push();
      translate(x, y);
      rotate(angle);
      strokeWeight(3);
      fill(150, 150, 150);
      stroke(50, 50, 50);
      beginShape();
      vertex(0, 32);
      vertex(27, -18);
      vertex(-27, -18);
      endShape(CLOSE);
      beginShape();
      vertex(0, -32);
      vertex(-27, 18);
      vertex(27, 18);
      endShape(CLOSE);
      beginShape();
      vertex(-32, 0);
      vertex(18, 27);
      vertex(18, -27);
      endShape(CLOSE);
      beginShape();
      vertex(32, 0);
      vertex(-18, 27);
      vertex(-18, -27);
      endShape(CLOSE);
      fill(0, 0, 0);
      circle(0,0,45);
      pop();
    })
  };
}

// Called when game is started once
function setup(){
  // Server setup
  allPlayers = [];
  myId = 0;

  nameInput.focus();
  nameInput.select();

  menuContainer.style.visibility = "visible";
  menuContainer.style.opacity = "1";

  socket = io();

  socket.on("myID", function(data) {
      myId = data.id;
  });

  socket.on("newPlayer", function(data) {
      var newCar = Object.entries(allCars).filter(car => car[0] == data.car.name)[0][1];
      var player = new Player(data.id, data.name, data.x, data.y, newCar);
      allPlayers.push(player);
      //console.log(allPlayers);
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
          //console.log(myId);
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
                  allPlayers[j].laps = data.updatePack[i].laps;
                  allPlayers[j].boosts = data.updatePack[i].boosts;
                  allPlayers[j].canBoost = data.updatePack[i].canBoost;
                  allPlayers[j].boostCooldown = data.updatePack[i].boostCooldown;
              }
          }
      }
  });

  socket.on("notifcationData", function(data) {
    console.log(data.notification);
    notifications.push(data.notification);
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

  //enterGame();

}

function draw() {
  if (playing == true){
    resizeCanvas(windowWidth, windowHeight);
    background(100, 100, 100); // it gets a hex/rgb color
    sendInputData();
    refreshLeaderboard();
    refreshBoostOverlay();
    refreshNotifications();

    for(var i in allPlayers) {
        if(allPlayers[i].id == myId) {
          if(allPlayers[i].alive == false){
            exitGame();
          }
          translate(width/2 - allPlayers[i].x, height/2 - allPlayers[i].y);
        }
    }

    if(allPlayers.filter(player => player.id === myId).length == 0){
      exitGame();
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
  gameGuiContainer.style.visibility = "hidden";
  gameGuiContainer.style.opacity = "0";
  playing = false;
  socket.emit("removePlayerServer");
  enterGameButton.setAttribute('onClick', 'enterGame()');
}

function enterGame(){
  var carChoice = '';
  playing = true;
  if(carInputRacer.checked == true){
    carChoice = allCars.Racer;
  }
  if(carInputTank.checked == true){
    carChoice = allCars.Tank;
  }
  if(carInputSprinter.checked == true){
    carChoice = allCars.Sprinter;
  }
  if(carInputPrankster.checked == true){
    carChoice = allCars.Prankster;
  }
  if(carInputBullet.checked == true){
    carChoice = allCars.Bullet;
  }
  if(carInputFragile.checked == true){
    carChoice = allCars.Fragile;
  }
  if(carInputSpike.checked == true){
    carChoice = allCars.Spike;
  }

  socket.emit("ready", {name: nameInput.value, car: carChoice});

  enterGameButton.setAttribute('onClick', '');
  menuContainer.style.visibility = "hidden";
  menuContainer.style.opacity = "0";
  gameGuiContainer.style.visibility = "visible";
  gameGuiContainer.style.opacity = "1";
  //console.log(allPlayers);
}

function refreshNotifications(){
  if (notifications.length > 0){
    if (millis() > nextNotification){
      notificationContainer.innerHTML = notifications[0];
      nextNotification = millis() + 2000;
      notifications.shift();
    }
  }
  else{
    if (millis() > nextNotification){
      notificationContainer.innerHTML = "";
    }
  }
}

function refreshLeaderboard(){
  leaderboardContainer.innerHTML = "Leaderboard";
  var text = "";
  for(var i in allPlayers){
    if(allPlayers[i].alive == true){
      text += "<div class = 'leaderboardItem'>" + allPlayers[i].laps + " " + allPlayers[i].name + "</div>\n";
    }
    else{
      //exitGame();
      allPlayers.splice(i, 1);
    }
  }
  leaderboardContainer.innerHTML = "Leaderboard\n" + text;
}

function refreshBoostOverlay(){
  for(var i in allPlayers){
    if(allPlayers[i].id === socket.id){
      boostContainerCooldown.innerHTML = "Boost " + allPlayers[i].boosts;
      if(allPlayers[i].boosts == 0){
        boostContainerCooldown.style.backgroundColor = "rgba(180, 30, 30, 0.6)"
      }
      else{
        boostContainerCooldown.style.backgroundColor = "rgba(30, 30, 30, 0.6)"
        if(allPlayers[i].canBoost > Date.now()){
          boostContainerCooldown.style.backgroundColor = "rgba(180, 30, 30, 0.6)"
          var firedAt = allPlayers[i].canBoost - allPlayers[i].boostCooldown;
          boostContainerCooldown.style.width = ((((Date.now() - firedAt) / (allPlayers[i].canBoost - firedAt))*100)-10) + "%";
        }
        else{
          boostContainerCooldown.style.width = "90%"
          boostContainerCooldown.style.backgroundColor = "rgba(30, 30, 30, 0.6)"
        }
      }
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

  push();
  mapLine(1020, -200, 1020, 200, [0,0,0], [230, 230, 230], 20);
  mapLine(1000, -200, 1000, 200, [230,230,230], [0,0,0], 20);
  mapLine(980, -200, 980, 200, [0,0,0], [230, 230, 230], 20);
  pop();

  createMapBorders([[-200, -200, 2000, -200], [-200, 2000, -200, -200], [-200, 2000, 2000, 2000], [2000, -200, 2000, 2000], [200, 200, 1600, 200], [200, 1600, 200, 200], [200, 1600, 1600, 1600], [1600, 200, 1600, 1600]]);

  // push();
  // fill(255);
  // beginShape();
  // vertex(975,-200);
  // vertex(975, 200);
  // vertex(1025, 200);
  // vertex(1025, -200);
  // endShape(CLOSE);
  // pop();

}

function createMapBorders(borderArray){
  for(var i in borderArray){
    mapLine(borderArray[i][0], borderArray[i][1], borderArray[i][2], borderArray[i][3], [230, 0, 0]);
  }
}

function mapLine(x1, y1, x2, y2, colour1 = [0,0,0], colour2 = [220,220,220], thickness = 30){
  var count = 0;
  var max = 0;
  var isColour = true;

  strokeCap(ROUND);
  strokeWeight(thickness);

  max = Math.sqrt(((x2-x1)**2)+((y2-y1)**2)) / 75

  while(count<21){
    if (isColour == true){
      stroke(colour1);
      isColour = false;
    }
    else{
      stroke(colour2);
      isColour = true;
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
    var mouseDistanceToCar = Math.abs(Math.sqrt((windowHeight/2 - mouseY)**2+(windowHeight/2 - mouseY)**2));
    socket.emit("inputData", {mouseX, mouseY, angle, windowWidth, windowHeight, mouseClick, mouseDistanceToCar});
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
  this.boosts = car.maxBoosts;
  this.acceleration = car.acceleration;
  this.alive = true;
  this.drawCar = car.drawCar;
  this.boostPower = car.boostPower;
  this.mass = car.mass;
  this.canBoost = true;
  this.boostCooldown = 0;
  this.laps = 0;

  this.draw = function() {

    // Player's car
    this.drawCar(this.x, this.y, this.angle);

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
var Car = function(name, maxHP, maxSpeed, maxBoosts, upgrades, acceleration, boostPower, size, mass, drawCar){
  this.name = name;
  this.maxHP = maxHP;
  this.maxSpeed = maxSpeed;
  this.maxBoosts = maxBoosts;
  this.upgrades = upgrades;
  this.acceleration = acceleration;
  this.drawCar = drawCar;
  this.boostPower = boostPower;
  this.mass = mass;
  this.size = size;
}
