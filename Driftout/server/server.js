var path = require("path");
var http = require("http");
var express = require("express");
var socketIO = require("socket.io");

// Needs replacement upon cloud hosting?
var publicPath = path.join(__dirname, "../client")
var port = process.env.PORT || 80;
var host = process.env.HOST || '0.0.0.0';
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
app.use(express.static(publicPath));

// ---------- GLOBALS ----------

var allTracks;
var currentTrack;
var allPlayers = [];
var notifications = [];
var currentEntities = [];
var totalConnections = 0;
var playerNames = [];
var gameEndPeriod = 0;
var invincibilityPeriod = 4000;

// ---------- MODIFIERS ----------

var grip = 0.99;
var lapsToWin = 20;

// ---------- ---------- ----------

server.listen(port, host);

console.log("Server started on port " + port);

function startGame(){
  gameEndPeriod = 0;
  notifications = [];
  currentEntities = [];

  var trackChoice = Math.floor(Math.random() * 3);
  if(trackChoice == 0){
    currentTrack = allTracks.Square;
  }
  if(trackChoice == 1){
    currentTrack = allTracks.DragStrip;
  }
  if(trackChoice == 2){
    currentTrack = allTracks.LeftRight;
  }

  console.log("Map : " + currentTrack.name);
}

io.on("connection", function(socket){
  console.log("New connection, ID: " + socket.id);
  totalConnections++;

  startGame();

  var player;
  socket.on("ready", (data) => {
      player = new Player(socket.id, data.name, 900, Math.floor((Math.random()-0.5)*200), data.car);
      player.alive = true;
      allPlayers.push(player);
      playerNames.push(player.name);

      socket.emit("myID", {id: player.id});
      //console.log(player.id);
      socket.broadcast.emit('newPlayer', player.getInitPack());

      var initPack = [];
      for(var i in allPlayers) {
          initPack.push(allPlayers[i].getInitPack());
      }
      socket.emit("initPack", {initPack: initPack, currentTrack:currentTrack});

      io.emit("syncedData", {
        notification: "Track: " + currentTrack.name,
        currentEntities: []
      });
  });

  socket.on("specifcData", (data) => {
    if(data == "metrics"){
      socket.emit("returnData", {name:"metrics", totalConnections:totalConnections, playerNames:playerNames})
    }
  })

  socket.on("inputData", (data) => {
      for(var i in allPlayers) {
          if(allPlayers[i].id === socket.id) {
              allPlayers[i].mouseX = data.mouseX;
              allPlayers[i].mouseY = data.mouseY;
              allPlayers[i].angle = data.clientPlayerAngle;
              allPlayers[i].windowWidth = data.windowWidth;
              allPlayers[i].windowHeight = data.windowHeight;
              allPlayers[i].mouseDistanceToCar = data.mouseDistanceToCar;
              allPlayers[i].mouseIsPressed = data.mouseClick;
              allPlayers[i].spacePressed = data.spacePressed;
              allPlayers[i].numPressed = data.numPressed;
              break;
          }
      }
      //console.log(mouseIsPressed);
  })

  socket.on("disconnect", () => {
      io.emit('someoneLeft', {id: socket.id});
      for(var i in allPlayers) {
          if(allPlayers[i].id === socket.id) {
              allPlayers.splice(i, 1);
          }
      }
  });

  socket.on("removePlayerServer", (playerID) => {
    socket.emit("removePlayerClient", playerID);
    for(var i in allPlayers) {
        if(allPlayers[i].id === playerID) {
            allPlayers.splice(i, 1);
        }
    }
  });
});

// The player object constructor
var Player = function(id, name, x, y, car) {
  this.id = id;
  this.name = name;
  this.x = x;
  this.y = y;
  this.vX = 0;
  this.vY = 0;
  this.mouseX;
  this.mouseY;
  this.mouseDistanceToCar;
  this.mouseIsPressed = false;
  this.spacePressed = false;
  this.numPressed = null;
  this.car = car;
  this.maxHP = car.maxHP;
  this.HP = car.maxHP;
  this.regen = 0;
  this.maxSpeed = car.maxSpeed;
  this.boosts = car.maxBoosts;
  this.maxBoosts = car.maxBoosts;
  this.acceleration = car.acceleration;
  this.brake = false;
  this.alive = true;
  this.drawCar = car.drawCar;
  this.boostPower = car.boostPower;
  this.size = car.size;
  this.mass = car.mass;
  this.collisionDamage = car.name == "Spike" ? 30 : 20;
  this.angle = 0;
  this.canBoost = Date.now();
  this.boostCooldown = 3000;
  this.checkPointCounter = [false, false, false, false];
  this.laps = 0
  this.abilityCooldown = car.abilityCooldown;
  this.canAbility = Date.now();
  this.upgradePoints = 1;
  this.lapStart = Date.now();
  this.lapTime = 0;
  this.topLapTime = 0;
  this.god = [true, Date.now()+invincibilityPeriod];

  if(this.car.name == "Prankster"){
    this.ability = allCars.Prankster.ability;
    this.trapSize = 20;
    this.trapDamage = 40;
  }
  if(this.car.name == "Bullet"){
    this.ability = allCars.Bullet.ability;
    this.abilityDuration = Date.now();
    this.resisting = false;
  }
  if(this.car.name == "Fragile"){
    this.ability = allCars.Fragile.ability;
  }
  if(this.car.name == "Sprinter"){
    this.ability = allCars.Sprinter.ability;
    this.abilityDuration = Date.now();
  }
  if(this.car.name == "Tank"){
    this.bounceModifier = 1;
  }
  if(this.car.name == "Spike"){
    this.bodySize = 1;
  }

  this.doUpgrade = function(upgradeName, value=0){
    if(upgradeName == "MaxHP"){
      this.maxHP += value;
      this.HP += value;
    }
    if(upgradeName == "RegenHP"){
      this.regen += value;
    }
    if(upgradeName == "MaxBoosts"){
      this.maxBoosts += value;
      this.boosts += value;
    }
    if(upgradeName == "MoveSpeed"){
      this.acceleration += value[0];
      this.maxSpeed += value[1];
    }
    if(upgradeName == "SingleHeal"){
      console.log("single heal");
      if(this.HP + (this.maxHP * value) > this.maxHP){
        this.HP = this.maxHP;
      }
      else{
        this.HP += this.maxHP * value;
      }
    }
    if(upgradeName == "SingleBoost"){
      this.vX += Math.cos(this.angle)*value;
      this.vY += Math.sin(this.angle)*value;
    }
    if(upgradeName == "TrapDamage"){
      this.trapDamage += value;
    }
    if(upgradeName == "TrapCooldown"){
      this.abilityCooldown -= value;
    }
    if(upgradeName == "TrapSize"){
      this.trapSize += value;
    }
    if(upgradeName == "GiftCooldown"){
      this.abilityCooldown -= value;
    }
    if(upgradeName == "DashPower"){
      var newStats = [this.ability().dashResist, this.ability().dashPower + 10]
      this.ability = function(){
        return {
          name : "Dash",
          dashResist : newStats[0],
          dashPower : newStats[1]
        }
      };
    }
    if (upgradeName == "DashResist"){
      var newStats = [this.ability().dashResist - this.car.upgrades.dashResist, this.ability().dashPower]
      this.ability = function(){
        return {
          name : "Dash",
          dashResist : newStats[0],
          dashPower : newStats[1]
        }
      };
    }
    if(upgradeName == "CollisionDamage"){
      this.collisionDamage += value;
    }
    if(upgradeName == "BoostPower"){
      this.boostPower += value;
    }
    if(upgradeName == "BouncePower"){
      this.bounceModifier += value;
    }
    if(upgradeName == "BodySize"){
      this.bodySize += value;
      this.size += 3;
    }
  }

  this.events = function() {

    if (this.god[0]){
      if(Date.now()>this.god[1]){
        this.god[0]=false;
      }
    }

    if (this.alive == true){

      // Lap time
      this.lapTime = Date.now()-this.lapStart;

      // Check if crashed
      if (this.HP < 0){
        this.alive = false;
        notifications.push(this.name + " Crashed!");
        //socket.emit("removePlayerClient", this.id);
      }

      // Upgrades
      if (this.upgradePoints > 0 && this.numPressed != null){
        if (!this.numLock){
          this.numLock = true;
          for(var i in Object.entries(this.car.upgrades)){
            if(this.numPressed-1 == i){
              this.doUpgrade(Object.keys(this.car.upgrades)[i], Object.values(this.car.upgrades)[i]);
              this.upgradePoints -= 1;
            }
          }
        }
      }
      else{
        this.numLock = false;
      }
      this.numPressed = null;

      // ------ Abilities ------

      // On Loop

      if (this.car.name == "Sprinter"){
        if (this.abilityDuration < Date.now()){
          this.acceleration = this.car.acceleration;
          this.maxSpeed = this.car.maxSpeed;
        }
      }

      if (this.car.name == "Bullet"){
        if (this.abilityDuration < Date.now()){
          this.resisting = false;
        }
      }

      // On trigger

      if (this.spacePressed == true && Date.now() > this.canAbility){

        // console.log("?");
        // console.log(this.car.name);
        // console.log(this.ability);

        // Prankster Ability
        if (this.ability != null && this.car.name == "Prankster"){
          if (currentEntities.filter(entity => entity.ownerId == this.id).length >= 5){
            for (i in currentEntities){
              if (currentEntities[i].ownerId == this.id){
                currentEntities.splice(i, 1);
                break;
              }
            }
          }
          var newEntity = this.ability(this.x, this.y, this.angle, this.id);
          newEntity.size = this.trapSize;
          newEntity.damage = this.trapDamage;
          currentEntities.push(newEntity);
          this.canAbility = Date.now() + this.abilityCooldown;
          this.vX += Math.cos((this.angle) % 360) * 3;
          this.vY += Math.sin((this.angle) % 360) * 3;
        }

        // Bullet Ability
        if (this.ability != null && this.car.name == "Bullet"){
          this.canAbility = Date.now() + this.abilityCooldown;
          this.vX += Math.cos((this.angle) % 360) * this.ability().dashPower;
          this.vY += Math.sin((this.angle) % 360) * this.ability().dashPower;
          this.abilityDuration = Date.now() + 1000;
          this.resisting = true;
        }

        // Sprinter Ability
        if (this.ability != null && this.car.name == "Sprinter"){
          this.canAbility = Date.now() + this.abilityCooldown;
          this.abilityDuration = Date.now() + 2000;
          this.acceleration = this.ability().handling[0];
          this.maxSpeed = this.ability().handling[1];
        }

        // Fragile Ability
        if (this.ability != null && this.car.name == "Fragile"){
          this.canAbility = Date.now() + this.abilityCooldown;
          this.upgradePoints += 1;
        }
      }

      // Boosts

      if(!this.brake){

        if (this.mouseIsPressed == true && Date.now() > this.canBoost && this.boosts > 0){
          this.vX += this.vX > this.maxSpeed / 3 || this.vX < -this.maxSpeed / 3 ? Math.cos(this.angle)*this.boostPower : Math.cos(this.angle)*(this.boostPower)*3;
          this.vY += this.vY > this.maxSpeed / 3 || this.vY < -this.maxSpeed / 3 ? Math.sin(this.angle)*this.boostPower : Math.sin(this.angle)*(this.boostPower)*3;
          this.canBoost = Date.now() + this.boostCooldown;
          this.boosts-=1;
        }

        // Movement

        if (this.vX < this.maxSpeed && this.vX > -this.maxSpeed){
          this.vX += Math.cos(this.angle)*this.acceleration;
        }
        if (this.vY < this.maxSpeed && this.vY > -this.maxSpeed){
          this.vY += Math.sin(this.angle)*this.acceleration;
        }

      }

      // Apply mouse distance
      // if (this.mouseDistanceToCar < 30){
      //   this.vX *= (this.mouseDistanceToCar + 10)/40;
      //   this.vY *= (this.mouseDistanceToCar + 10)/40;
      // }

      // Apply movement to player location
      this.x += this.vX;
      this.y += this.vY;

      this.vX = this.vX * grip;
      this.vY = this.vY * grip;

      // Collisions

      this.doCollisions();

      // Health regen

      if(this.HP < this.maxHP && this.regen > 0){
        this.HP += this.regen;
      }
    }
  }

  this.doCollisions = function() {

    // Entity Collisions
    if (!this.god[0]){
      for (var i in currentEntities){
        if (currentEntities[i].ownerId != this.id){
          if (Math.sqrt(((this.x-currentEntities[i].x)**2)+((this.y-currentEntities[i].y)**2)) < this.size + currentEntities[i].size){
            this.vX *= 0.3;
            this.vY *= 0.3;
            this.HP -= currentEntities[i].damage;
            currentEntities.splice(i, 1);
          }
        }
      }

      // Player Collisions
      if (allPlayers.length > 1){
        for (var i in allPlayers){
          if (allPlayers[i].id != this.id){
            if (Math.sqrt(((this.x-allPlayers[i].x)**2)+((this.y-allPlayers[i].y)**2)) < this.size + allPlayers[i].size){

              // Physics Calc

              var collidedPlayerAngle = Math.atan2(this.y - allPlayers[i].y, this.x - allPlayers[i].x);

              var xVDiff = this.vX - allPlayers[i].vX;
              var yVDiff = this.vY - allPlayers[i].vY;

              var xDist = allPlayers[i].x - this.x;
              var yDist = allPlayers[i].y - this.y;

              if(xVDiff * xDist + yVDiff * yDist >= 0){
                var angle = -Math.atan2(allPlayers[i].y - this.y, allPlayers[i].x - this.x);

                var m1 = this.mass;
                var m2 = allPlayers[i].mass;

                const u1 = rotate({x : this.vX, y : this.vY}, angle);
                const u2 = rotate({x : allPlayers[i].vX, y : allPlayers[i].vY}, angle);

                var v1 = {x: u1.x * (m1 - m2) / (m1 + m2) + u2.x * 2 * m2 / (m1 + m2), y: u1.y};
                var v2 = {x: u2.x * (m1 - m2) / (m1 + m2) + u1.x * 2 * m2 / (m1 + m2), y: u2.y};

                var v1Final = rotate(v1, -angle);
                var v2Final = rotate(v2, -angle);

                //Damage Calc

                if (this.resisting == true){
                  this.HP -= Math.abs((this.vX + this.vY)/2) * (allPlayers[i].collisionDamage * this.ability().dashResist);
                }
                else{
                  this.HP -= Math.abs((this.vX + this.vY)/2) * allPlayers[i].collisionDamage;
                }
                allPlayers[i].HP -= Math.abs((allPlayers[i].vX + allPlayers[i].vY)/2) * this.collisionDamage;

                //Apply Movement

                this.vX = v1Final.x;
                this.vY = v1Final.y;

                if(this.bounceModifier){
                  allPlayers[i].vX = v2Final.x*this.bounceModifier;
                  allPlayers[i].vY = v2Final.y*this.bounceModifier;
                }
                else{
                  allPlayers[i].vX = v2Final.x;
                  allPlayers[i].vY = v2Final.y;
                }
              }
            }
          }
        }
      }
    }

    for(var i in currentTrack.walls){
      this.collision(this.x, this.y, currentTrack.walls[i][0], currentTrack.walls[i][1], currentTrack.walls[i][2], currentTrack.walls[i][3],
        currentTrack.walls[i][4], currentTrack.walls[i][5], currentTrack.walls[i][6])
    }

    // Check if inside finish line
    if (this.collision(this.x, this.y, currentTrack.finishLine[0], currentTrack.finishLine[1],
    currentTrack.finishLine[2], currentTrack.finishLine[3], "trigger") == true){
      if (this.checkPointCounter.every(point => point == true)){
        this.laps += 1;
        this.boosts = this.maxBoosts;
        this.checkPointCounter = [false, false, false, false];
        notifications.push(this.name + " Completed a lap!");
        console.log(this.name + " has now completed " + this.laps + " laps!");
        this.upgradePoints += 1;
        this.lapStart = Date.now();
        if (this.lapTime < this.topLapTime || this.topLapTime == 0){
          this.topLapTime = this.lapTime;
        }
        if (this.laps >= lapsToWin){
          notifications.push(this.name + " has Won!!!");
          gameEndPeriod = Date.now()+5000;
          for(var i in allPlayers){
            allPlayers[i].brake = true;
          }
        }
      }
    }

    // Check for collision with check points
    for(var i in currentTrack.checkPoints){
      if (this.collision(this.x, this.y, currentTrack.checkPoints[i][0], currentTrack.checkPoints[i][1],
      currentTrack.checkPoints[i][2], currentTrack.checkPoints[i][3], "trigger") == true){
        this.checkPointCounter[i] = true;
      }
    }

    }
    // The collision function
    this.collision = function(playerx, playery, x1, x2, y1, y2, effect, damage=0, bounce=0) {
      if ((playerx > x1 && playerx < x2) && (playery > y1 && playery < y2)){
       if (effect == "x-1"){
         this.x -= 1;
         this.HP -= this.god[0]?0:(Math.abs(this.vX)*damage) + 2;
         this.vX = -this.vX * bounce;
         }
       if (effect == "x+1"){
         this.x += 1;
         this.HP -= this.god[0]?0:(Math.abs(this.vX)*damage) + 2;
         this.vX = Math.abs(this.vX)*bounce;
         }
       if (effect == "y-1"){
         this.y -= 1;
         this.HP -= this.god[0]?0:(Math.abs(this.vY)*damage) + 2;
         this.vY = -this.vY * bounce;
         }
       if (effect == "y+1"){
         this.y += 1;
         this.HP -= this.god[0]?0:(Math.abs(this.vY)*damage) + 2;
         this.vY = Math.abs(this.vY)*bounce;
         }
       if (effect == "trigger"){
        return true;
        }
       }
      else{
        if (effect == "trigger"){
          return false;
        }
      }
    }

  // Pack to initialize a new instance of a player
  this.getInitPack = function () {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      car: this.car
    }
  }

  // Important player information to be transferred server/client
  this.getUpdatePack = function () {
    if(this.car.name == "Prankster"){
      return {
        id: this.id,
        x: this.x,
        y: this.y,
        angle: this.angle,
        HP: this.HP,
        maxHP : this.maxHP,
        alive: this.alive,
        laps: this.laps,
        boosts: this.boosts,
        boostCooldown: this.boostCooldown,
        canBoost: this.canBoost,
        abilityCooldown: this.abilityCooldown,
        canAbility: this.canAbility,
        upgradePoints: this.upgradePoints,
        lapTime: this.lapTime,
        topLapTime: this.topLapTime,
        god: this.god[0]?true:false,
        trapSize : this.trapSize
      }
    }
    if(this.car.name == "Spike"){
      return {
        id: this.id,
        x: this.x,
        y: this.y,
        angle: this.angle,
        HP: this.HP,
        maxHP : this.maxHP,
        alive: this.alive,
        laps: this.laps,
        boosts: this.boosts,
        boostCooldown: this.boostCooldown,
        canBoost: this.canBoost,
        abilityCooldown: this.abilityCooldown,
        canAbility: this.canAbility,
        upgradePoints: this.upgradePoints,
        lapTime: this.lapTime,
        topLapTime: this.topLapTime,
        god: this.god[0]?true:false,
        bodySize : this.bodySize
      }
    }
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      HP: this.HP,
      maxHP : this.maxHP,
      alive: this.alive,
      laps: this.laps,
      boosts: this.boosts,
      boostCooldown: this.boostCooldown,
      canBoost: this.canBoost,
      abilityCooldown: this.abilityCooldown,
      canAbility: this.canAbility,
      upgradePoints: this.upgradePoints,
      lapTime: this.lapTime,
      topLapTime: this.topLapTime,
      god: this.god[0]?true:false
    }
  }

    return this;
}

function rotate(velocity, angle) {
    const rotatedVelocities = {
        x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
        y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle)
    }

    return rotatedVelocities;
}

// Loop speed to update entities
setInterval(() => {
    if (notifications.length > 0){
      io.emit("syncedData", {
        notification: notifications[0],
        currentEntities: []
      });
      notifications = notifications.slice(1);
    }
      io.emit("syncedData", {
        notification: [],
        currentEntities: currentEntities
      });

    if (currentEntities.length > 0){
      for (var i in currentEntities){
        if (currentEntities[i].newEntity == true){
          currentEntities[i].newEntity = false;
          currentEntities[i].createdAt = Date.now();
        }
        currentEntities[i].vX *= 0.95;
        currentEntities[i].vY *= 0.95;
        currentEntities[i].x += currentEntities[i].vX;
        currentEntities[i].y += currentEntities[i].vY;

        for(var j in currentTrack.walls){
          if ((currentEntities[i].x > currentTrack.walls[j][0] && currentEntities[i].x < currentTrack.walls[j][1]) &&
          (currentEntities[i].y > currentTrack.walls[j][2] && currentEntities[i].y < currentTrack.walls[j][3])){
            currentEntities[i].vX = 0;
            currentEntities[i].vY = 0;
          }
        }
        // if (currentEntities[i].createdAt + 10000 > Date.now()){
        //   currentEntities.splice(i, i+1);
        // }
      }
    }
}, 1000/75)


// loop spped to update player properties
setInterval(() => {
  if(Date.now() > gameEndPeriod && gameEndPeriod != 0){
    for(var i in allPlayers) {
      allPlayers[i].alive = false;
    }
    startGame();
  }
  var updatePack = [];
  for(var i in allPlayers) {
      updatePack.push(allPlayers[i].getUpdatePack());
      allPlayers[i].events();
  }
  io.emit("updatePack", {updatePack});
}, 1000/75)

var checkPoints = [
  [-200, 200, 1600, 2000],
  [-200, 200, -200, 200],
  [1600, 2000, -200, 200],
  [1600, 2000, 1600, 2000]
];

var finishLine = [975, 1025, -200, 200];

// The track object constructor
var Track = function(name, walls, checkPoints, finishLine, spawnRegion){
  this.name = name;
  this.walls = walls;
  this.checkPoints = checkPoints;
  this.finishLine = finishLine;
  this.spawnRegion = spawnRegion;
}


allTracks = {
  Square : new Track(
    // Name
    "Square",
    // Walls
    [[200, 225, 200, 1600, "x-1", 8, 0.4],[200, 1600, 200, 225, "y-1", 8, 0.4],[1575, 1600, 200, 1600, "x+1", 8, 0.4],
    [200, 1600, 1575, 1600, "y+1", 8, 0.4],[2000, 2025, -225, 2025, "x-1", 8, 0.4],[-225, -200, -225, 2025, "x+1", 8, 0.4],
    [-200, 2000, 2000, 2025, "y-1", 8, 0.4],[-200, 2000, -225, -200, "y+1", 8, 0.4]],
    // Checkpoints
    [[-200, 200, 1600, 2000], [-200, 200, -200, 200], [1600, 2000, -200, 200], [1600, 2000, 1600, 2000]],
    // FinishLine
    [975, 1025, -200, 200]
  ),

  DragStrip : new Track(
    // Name
    "DragStrip",
    // Walls
    [[-600, -575, 200, 600, "x-1", 8, 0.4],[-600, 2600, 200, 225, "y-1", 8, 0.4],[2575, 2600, 200, 600, "x+1", 8, 0.4],
    [-600, 2600, 575, 600, "y+1", 8, 0.4],[3000, 3025, -225, 1025, "x-1", 8, 0.4],[-1025, -1000, -225, 1025, "x+1", 8, 0.4],
    [-1000, 3000, 1000, 1025, "y-1", 8, 0.4],[-1000, 3000, -225, -200, "y+1", 8, 0.4]],
    // Checkpoints
    [[-1000, -600, 200, 600], [-1000, -600, -200, 200], [2600, 3000, 200, 600], [2600, 3000, -200, 200]],
    // FinishLine
    [975, 1025, -200, 200]
  ),

  LeftRight : new Track(
    // Name
    "Left, Right",
    // Walls
    [[200, 225, 200, 1600, "x-1", 8, 0.4],[200, 1600, 200, 225, "y-1", 8, 0.4],[1575, 1600, 200, 1600, "x+1", 8, 0.4],
    [200, 400, 1575, 1600, "y+1", 8, 0.4],[1400, 1600, 1575, 1600, "y+1", 8, 0.4],[2000, 2025, -225, 2025, "x-1", 8, 0.4],
    [-225, -200, -225, 2025, "x+1", 8, 0.4],[-200, 800, 2000, 2025, "y-1", 8, 0.4],[1000, 2000, 2000, 2025, "y-1", 8, 0.4],
    [-200, 2000, -225, -200, "y+1", 8, 0.4],[375, 400, 400, 1600, "x+1", 8, 0.4],[1400, 1425, 400, 1600, "x-1", 8, 0.4],
    [800, 825, 800, 2000, "x-1", 8, 0.4],[975, 1000, 800, 2000, "x+1", 8, 0.4],[400, 1400, 400, 425, "y+1", 8, 0.4],
    [800, 1000, 800, 775, "y+1", 8, 0.4]],
    // Checkpoints
    [[-200, 200, 1600, 2000], [-200, 200, -200, 200], [1600, 2000, -200, 200], [1600, 2000, 1600, 2000]],
    // FinishLine
    [975, 1025, -200, 200]
  )
}

// The car object constructor
var Car = function(name, maxHP, maxSpeed, maxBoosts, upgrades, acceleration, boostPower, size, mass, abilityCooldown, ability, drawCar){
  this.name = name;
  this.maxHP = maxHP;
  this.maxSpeed = maxSpeed;
  this.maxBoosts = maxBoosts;
  this.upgrades = upgrades;
  this.acceleration = acceleration;
  this.drawCar = drawCar;
  this.boostPower = boostPower;
  this.size = size;
  this.mass = mass;
  this.ability = ability;
  this.abilityCooldown = abilityCooldown;
}

// Car class objects
allCars = {
  Racer : new Car('Racer', 150, 6, 8, {
    MaxHP : 12,
    RegenHP : 0.005,
    MaxBoosts: 1,
    MoveSpeed : [0.01, 0.5],
    SingleHeal : 0.4,
    SingleBoost : 7.5
  }, 0.11, 2.5, 25, 5, null, null, null),

  Prankster : new Car('Prankster', 120, 6, 5, {
    MaxHP : 10,
    RegenHP : 2,
    TrapDamage: 8,
    TrapCooldown : 250,
    TrapSize : 4,
    SingleHeal : 0.4
  }, 0.1, 2, 20, 4, 4000, function(x, y, angle, ownerId){
    return {
      name : "Trap",
      x : x,
      y : y,
      vX : Math.cos((angle + 135) % 360) * 14,
      vY : Math.sin((angle + 135) % 360) * 14,
      size : 20,
      damage : 40,
      cooldown : 4000,
      ownerId: ownerId,
      newEntity : true,
      createdAt : 0
    };
  }, null),

  Bullet : new Car('Bullet', 100, 12, 5, {
    MaxHP : 10,
    RegenHP : 3,
    MaxBoosts: 1,
    MoveSpeed : [0.005, 0.8],
    DashResist : 0.05,
    DashPower : 0.4
  }, 0.08, 2.5, 25, 7, 3000, function(){
    return {
    name : "Dash",
    dashResist : 0.2,
    dashPower : 10
  }
}, null),

  Tank : new Car('Tank', 200, 4, 5, {
    MaxHP : 14,
    RegenHP : 2,
    MaxBoosts: 1,
    BoostPower : 0.4,
    BouncePower : 0.1,
    SingleHeal : 0.25
  }, 0.08, 3, 35, 10, null, function(){
    return null
  }, null),

  Sprinter : new Car('Sprinter', 80, 12, 10, {
    MaxHP : 8,
    RegenHP : 3,
    MaxBoosts: 1,
    SteadyHandling : 0.2,
    SingleHeal : 0.4,
    SingleBoost : 6
  }, 0.14, 2, 25, 2, 8000, function(){
    return {
      name : "Grip",
      handling : [0.6, 6]
    }
  }, null),

  Fragile : new Car('Fragile', 70, 6, 5, {
    MaxHP : 20,
    RegenHP : 3,
    MaxBoosts: 2,
    MoveSpeed : [0.015, 0.6],
    GiftCooldown : 500,
    SingleBoost : 7.5
  }, 0.1, 2.5, 25, 1, 26000, function(){
    return {
    name : "Gift"
 }
  }, null),

  Spike : new Car('Spike', 150, 5, 3, {
    MaxHP : 12,
    RegenHP : 2,
    MaxBoosts: 1,
    MoveSpeed : [0.01, 0.4],
    CollisionDamage : 5,
    BodySize : 1
  }, 0.12, 3, 30, 8, null, function(){
    return null
  }, null)
};
