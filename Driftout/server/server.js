var path = require("path");
var http = require("http");
var express = require("express");
var socketIO = require("socket.io");
var matterjs = require("matter-js")

var publicPath = path.join(__dirname, "../client")
var port = process.env.PORT || 80;
var host = process.env.HOST || '0.0.0.0';
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
app.use(express.static(publicPath));

// ---------- GLOBALS ----------

var rooms = [];
var allTracks;
var currentTrack;
var currentConnections = [];
var totalConnections = 0;
var playerNames = [];
const Bodies = matterjs.Bodies;
const Engine = matterjs.Engine;
const Body = matterjs.Body;
const Vector = matterjs.Vector;

// ---------- MODIFIERS ----------

var debug = false;
var grip = 0.99;
var lapsToWin = 20;
var maxRoomSize = 10;
var invincibilityPeriod = 4000;

// ---------- ---------- ----------

server.listen(port, host);

console.log("Server started on port " + port);

io.on("connection", function(socket){
  console.log("New connection, ID: " + socket.id);
  totalConnections++;
  currentConnections.push(socket.id);

  var player;
  socket.on("ready", (data) => {      
    var newName = data.name;
    if (newName == "" || newName.length > 14 || newName.includes("<")) {
      newName = data.car;
    }

    switch (data.car){
      case "Racer" : data.car = allCars.Racer;
        break;
      case "Sprinter" : data.car = allCars.Sprinter;
        break;
      case "Tank" : data.car = allCars.Tank;
        break;
      case "Prankster" : data.car = allCars.Prankster;
        break;
      case "Bullet" : data.car = allCars.Bullet;
        break;
      case "Fragile" : data.car = allCars.Fragile;
        break;
      case "Spike" : data.car = allCars.Spike;
        break;
      case "Swapper" : data.car = allCars.Swapper;
        break;
    }

    data.alive = true;
    playerNames.push(newName);

    player = new Player(socket.id, newName, data.car, data.dev);

    socket.emit("myID", {id: player.id});

    if(rooms.length==0){
      rooms.push(new Room());
      rooms[0].startGame();
    }

    var allocated = false;

    for(var i in rooms){
      if(rooms[i].allPlayers.length < maxRoomSize){
        player.myRoom = i;
        rooms[i].allPlayers.push(player);
        allocated = true;
        console.log("New player: '" + player.name + "' in room " + i  + " ID: " + player.id);
        break;
      }
    }

    if(allocated == false){
      rooms.push(new Room());
      console.log("Room " + (rooms.length-1) + " created")
      player.myRoom = rooms.length-1;
      rooms[rooms.length-1].allPlayers.push(player);
      rooms[rooms.length-1].startGame();
      console.log("New player: '" + player.name + "' in room " + (rooms.length-1) + " ID: " + player.id);
    }

    console.log("1")

    io.emit("roomUpdate", {
      room: new tempRoom(
        player.myRoom,
        rooms[player.myRoom].allPlayers,
        rooms[player.myRoom].notifications,
        rooms[player.myRoom].messages,
        rooms[player.myRoom].currentEntities,
        rooms[player.myRoom].gameEndPeriod,
        rooms[player.myRoom].lapsToWin,
        rooms[player.myRoom].roundModifier
        )
    });

    console.log("1")
    
    socket.emit("initPack", {
        initPack: rooms[player.myRoom].initPlayer(), 
        currentTrack: rooms[player.myRoom].currentTrack, 
        room: player.myRoom,
        body: player.body
      });

    console.log("1")

    socket.broadcast.emit("initPlayer", {
      initPack: player.getInitPack(), 
      room:player.myRoom
    });

    io.emit("syncedData", {
      notification: "Track: " + rooms[player.myRoom].currentTrack.name,
      currentEntities: [],
      message: []
    });
  });

  socket.on("specifcData", (data) => {
    if(data == "metrics"){
      socket.emit("returnData", {
        name: "metrics", 
        totalConnections: totalConnections, 
        playerNames: playerNames})
    }
  })

  socket.on("inputData", (data) => {
    for(var i in rooms){
      for(var j in rooms[i].allPlayers) {
          if(rooms[i].allPlayers[j].id === socket.id) {
              rooms[i].allPlayers[j].mouseX = data.mouseX;
              rooms[i].allPlayers[j].mouseY = data.mouseY;
              rooms[i].allPlayers[j].angle = data.clientPlayerAngle;
              rooms[i].allPlayers[j].windowWidth = data.windowWidth;
              rooms[i].allPlayers[j].windowHeight = data.windowHeight;
              rooms[i].allPlayers[j].mouseDistanceToCar = data.mouseDistanceToCar;
              rooms[i].allPlayers[j].mouseIsPressed = data.mouseClick;
              rooms[i].allPlayers[j].spacePressed = data.spacePressed;
              rooms[i].allPlayers[j].numPressed = data.numPressed;
              break;
          }
        }
      }
      //console.log(mouseIsPressed);
  })

  socket.on("disconnect", () => {
      io.emit('someoneLeft', {id: socket.id});
      //currentConnections.filter(connection => connection != socket.id);
      var newConnections = [];
      for(var i in currentConnections){
        if (currentConnections[i]!=socket.id){
          newConnections.push(currentConnections[i]);
        }
      }
      // for(var i in rooms){
      //   for(var j in rooms[i].allPlayers){
      //     console.log("Checking Player" +  rooms[i].allPlayers[j].id + " : Alive = " + rooms[i].allPlayers[j].alive);
      //     if(rooms[i].allPlayers[j].alive == false){
      //       rooms[i].allPlayers.splice(j,1);
      //     }
      //     // rooms[i].allPlayers = rooms[i].allPlayers.filter(player => player.alive != false);
      //   }
      // }

      currentConnections = newConnections;
      for(var i in rooms){
        for(var j in rooms[i].allPlayers) {
          if(rooms[i].allPlayers[j].id === socket.id) {
              rooms[i].allPlayers.splice(j, 1);
          }
        }
      }
  });

  socket.on("recieveMessage", (data) => {
    rooms[data.roomIndex].messages.push(data.author + ": " + data.message);
  });

  socket.on("removePlayerServer", (data) => {
    socket.emit("removePlayerClient", data.id);
    removePlayer(data.index, data.id);
    socket.emit("roomUpdate", {rooms:rooms, roomIndex:data.index});
  });
});

function removePlayer (roomIndex, removeId){
  if(rooms.length > 0){
    for(var i in rooms[roomIndex].allPlayers){
      if(rooms[roomIndex].allPlayers[i].id == removeId){
        rooms[roomIndex].allPlayers.splice(i,1);
      }
    }
  }
}

// The player object constructor
var Player = function(id, name, car, dev) {
  this.body = null;//Bodies.circle(0, 0, 40);
  this.myRoom;
  this.id = id;
  this.name = name;
  this.dev = dev;
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
  this.collisionDamage = car.name == "Spike" ? 22 : 20;
  this.angle = 0;
  this.canBoost = Date.now();
  this.boostCooldown = 3000;
  this.checkPointCounter = [false, false, false, false];
  this.laps = 0
  this.abilityCooldown = car.abilityCooldown;
  this.canAbility = Date.now();
  this.upgradePoints = 1;
  this.upgrades = [];
  this.lapStart = Date.now();
  this.lapTime = 0;
  this.topLapTime = 0;
  this.god = [true, Date.now()+invincibilityPeriod];
  this.upgradeLock = 0;
  this.kills = 0;

  //Dev gets godmode indefinitely
  if(this.dev){
    this.god = [true, Date.now() + 60000*60];
  }

  for (var x in this.car.upgrades){
    this.upgrades.push([0]);
  }

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
  if(this.car.name == "Swapper"){
    this.form = false;
    this.ability = allCars.Swapper.ability;
    this.resisting = true;
    this.resistance = 0.8;
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
      var newStats = [this.ability().dashResist, this.ability().dashPower + 4]
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
    if(upgradeName == "OffenseSpeed"){
      this.acceleration += value[0];
      this.maxSpeed += value[1];
    }
    if(upgradeName == "DefenseResist"){
      this.resistance -= value;
    }
  }

  this.events = function() {

    if(debug){this.HP=100};

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
        //removePlayer(this.myRoom, this.id);
        rooms[this.myRoom].notifications.push(this.name + " Crashed!");
        //socket.emit("removePlayerClient", this.id);
      }

      // Upgrades
      if (this.upgradePoints > 0 && this.numPressed != null){
        if (this.upgradeLock < Date.now()){
          this.upgradeLock = Date.now()+200;
          for(var i in Object.entries(this.car.upgrades)){
            if(this.numPressed-1 == i){
              this.doUpgrade(Object.keys(this.car.upgrades)[i], Object.values(this.car.upgrades)[i]);
              this.upgrades[this.numPressed-1]++;
              this.upgradePoints -= 1;
            }
          }
        }
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

        // Prankster Ability
      //   if (this.ability != null && this.car.name == "Prankster"){
      //     if (rooms[this.myRoom].currentEntities.filter(entity => entity.ownerId == this.id).length >= 5){
      //       for (i in rooms[this.myRoom].currentEntities){
      //         if (rooms[this.myRoom].currentEntities[i].ownerId == this.id){
      //           rooms[this.myRoom].currentEntities.splice(i, 1);
      //           break;
      //         }
      //       }
      //     }
      //     var newEntity = this.ability(this.x, this.y, this.angle, this.id);
      //     newEntity.size = this.trapSize;
      //     newEntity.damage = this.trapDamage;
      //     rooms[this.myRoom].currentEntities.push(newEntity);
      //     this.canAbility = Date.now() + this.abilityCooldown;
      //     this.vX += Math.cos((this.angle) % 360) * 3;
      //     this.vY += Math.sin((this.angle) % 360) * 3;
      //   }

      //   // Bullet Ability
      //   if (this.ability != null && this.car.name == "Bullet"){
      //     this.canAbility = Date.now() + this.abilityCooldown;
      //     this.vX += Math.cos((this.angle) % 360) * this.ability().dashPower;
      //     this.vY += Math.sin((this.angle) % 360) * this.ability().dashPower;
      //     this.abilityDuration = Date.now() + 1000;
      //     this.resisting = true;
      //   }

      //   // Sprinter Ability
      //   if (this.ability != null && this.car.name == "Sprinter"){
      //     this.canAbility = Date.now() + this.abilityCooldown;
      //     this.abilityDuration = Date.now() + 2000;
      //     this.acceleration = this.ability().handling[0];
      //     this.maxSpeed = this.ability().handling[1];
      //   }

      //   // Fragile Ability
      //   if (this.ability != null && this.car.name == "Fragile"){
      //     this.canAbility = Date.now() + this.abilityCooldown;
      //     this.upgradePoints += 1;
      //   }

      //   if (this.ability != null && this.car.name == "Swapper"){
      //     this.canAbility = Date.now() + this.abilityCooldown;
      //     if(this.form){
      //       this.form = false;
      //       this.resisting = true;
      //     }
      //     else{
      //       this.form = true;
      //       this.resisting = false;
      //     }
      //   }
      // }

      // Boosts

      // if(!this.brake){

      //   if (this.mouseIsPressed == true && Date.now() > this.canBoost && this.boosts > 0){
      //     this.vX += this.vX > this.maxSpeed / 3 || this.vX < -this.maxSpeed / 3 ? Math.cos(this.angle)*this.boostPower : Math.cos(this.angle)*(this.boostPower)*3;
      //     this.vY += this.vY > this.maxSpeed / 3 || this.vY < -this.maxSpeed / 3 ? Math.sin(this.angle)*this.boostPower : Math.sin(this.angle)*(this.boostPower)*3;
      //     this.canBoost = Date.now() + this.boostCooldown;
      //     this.boosts-=1;
      //   }

        // Movement

        let cur = Body.getVelocity(this.body)

        if (cur.x < this.maxSpeed && cur.x > -this.maxSpeed){
          //cur.x += Math.cos(this.angle)*this.acceleration;
          Body.setVelocity(this.body, Vector.create(Math.cos(this.angle)*this.acceleration));
        }
        if (cur.y < this.maxSpeed && cur.y > -this.maxSpeed){
          Body.setVelocity(this.body, Vector.create(Math.sin(this.angle)*this.acceleration));
        }
      }

      if(this.HP < this.maxHP && this.regen > 0){
        this.HP += this.regen;

      }
    }
  }

  // Pack to initialize a new instance of a player
  this.getInitPack = function () {
    return {
      id: this.id,
      body: this.body,
      name: this.name,
      car: this.car,
      dev: this.dev
    }
  }

  // Important player information to be transferred server/client
  this.getUpdatePack = function () {
    if(this.car.name == "Prankster"){
      return {
        id: this.id,
        body: this.body,
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
        upgrades: this.upgrades,
        upgradePoints: this.upgradePoints,
        lapTime: this.lapTime,
        topLapTime: this.topLapTime,
        god: this.god[0]?true:false,
        kills: this.kills,
        trapSize : this.trapSize
      }
    }
    if(this.car.name == "Spike"){
      return {
        id: this.id,
        body: this.body,
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
        upgrades: this.upgrades,
        lapTime: this.lapTime,
        topLapTime: this.topLapTime,
        god: this.god[0]?true:false,
        kills: this.kills,
        bodySize : this.bodySize
      }
    }
    if(this.car.name == "Swapper"){
      return {
        id: this.id,
        body: this.body,
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
        upgrades: this.upgrades,
        lapTime: this.lapTime,
        topLapTime: this.topLapTime,
        god: this.god[0]?true:false,
        kills: this.kills,
        form: this.form?true:false
      }
    }
    return {
      id: this.id,
      body: this.body,
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
      upgrades: this.upgrades,
      lapTime: this.lapTime,
      topLapTime: this.topLapTime,
      kills: this.kills,
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
    for(var i in rooms){
      if (rooms[i].notifications.length > 0){
        io.emit("syncedData", {
          notification: [i, rooms[i].notifications[0]],
          currentEntities: [],
          message: []
        });
        rooms[i].notifications = rooms[i].notifications.slice(1);
      }

      if(rooms[i].messages.length > 0){
        io.emit("syncedData", {
          notification: [],
          currentEntities: [],
          message: [i, rooms[i].messages[0]]
        });
        rooms[i].messages = rooms[i].messages.slice(1);
      }

      io.emit("syncedData", {
        notification: [],
        currentEntities: [i, rooms[i].currentEntities],
        message: []
      });
    }

    // for(var i in rooms){
    //   if (rooms[i].currentEntities.length > 0){
    //     for (var j in rooms[i].currentEntities){
    //       if (rooms[i].currentEntities[j].newEntity == true){
    //         rooms[i].currentEntities[j].newEntity = false;
    //         rooms[i].currentEntities[j].createdAt = Date.now();
    //       }
    //       rooms[i].currentEntities[j].vX *= 0.95;
    //       rooms[i].currentEntities[j].vY *= 0.95;
    //       rooms[i].currentEntities[j].x += rooms[i].currentEntities[j].vX;
    //       rooms[i].currentEntities[j].y += rooms[i].currentEntities[j].vY;

    //       for(var k in rooms[i].currentTrack.walls){
    //         if ((rooms[i].currentEntities[j].x > rooms[i].currentTrack.walls[k][0] && rooms[i].currentEntities[j].x < rooms[i].currentTrack.walls[k][1]) &&
    //         (rooms[i].currentEntities[j].y > rooms[i].currentTrack.walls[k][2] && rooms[i].currentEntities[j].y < rooms[i].currentTrack.walls[k][3])){
    //           rooms[i].currentEntities[j].vX = 0;
    //           rooms[i].currentEntities[j].vY = 0;
    //         }
    //       }
    //       // if (currentEntities[i].createdAt + 10000 > Date.now()){
    //       //   currentEntities.splice(i, i+1);
    //       // }
    //     }
    //   }
    // }
}, 1000/75)


// loop spped to update player properties
setInterval(() => {
  for(var i in rooms){
    // If period after a win is complete, kill all players & restart game
    if(Date.now() > rooms[i].gameEndPeriod && rooms[i].gameEndPeriod != 0){
      for(var j in rooms[i].allPlayers) {
        rooms[i].allPlayers[j].alive = false;
      }
      rooms[i].startGame();
    }

    // Init and assign player data to update packet & send to clients
    var updatePack = [];
    for(var j in rooms[i].allPlayers) {
        updatePack.push(rooms[i].allPlayers[j].getUpdatePack());
        // Process player events
        rooms[i].allPlayers[j].events();
    }
    io.emit("updatePack", {updatePack:updatePack, i:i});
  }
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
    [200, 1600, 1575, 1600, "y+1", 8, 0.4],[2000, 2100, -225, 2100, "x-1", 8, 0.4],[-225, -200, -225, 2100, "x+1", 8, 0.4],
    [-200, 2000, 2000, 2100, "y-1", 8, 0.4],[-200, 2000, -225, -200, "y+1", 8, 0.4]],
    // Checkpoints
    [[-200, 200, 1600, 2000], [-200, 200, -200, 200], [1600, 2000, -200, 200], [1600, 2000, 1600, 2000]],
    // FinishLine
    [975, 1025, -200, 200]
  ),

  DragStrip : new Track(
    // Name
    "DragStrip",
    // Walls
    [[-600, -575, 200, 600, "x-1", 8, 0.4],[-600, 2600, 200, 300, "y-1", 8, 0.4],[2575, 2600, 200, 600, "x+1", 8, 0.4],
    [-600, 2600, 575, 600, "y+1", 8, 0.4],[3000, 3100, -225, 1025, "x-1", 8, 0.4],[-1100, -1000, -225, 1025, "x+1", 8, 0.4],
    [-1000, 3000, 1000, 1100, "y-1", 8, 0.4],[-1000, 3000, -225, -200, "y+1", 8, 0.4]],
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
    [200, 400, 1575, 1600, "y+1", 8, 0.4],[1400, 1600, 1575, 1600, "y+1", 8, 0.4],[2000, 2100, -225, 2100, "x-1", 8, 0.4],
    [-225, -200, -225, 2025, "x+1", 8, 0.4],[-200, 800, 2000, 2100, "y-1", 8, 0.4],[-200, 2000, 2000, 2100, "y-1", 8, 0.4],
    [-200, 2000, -225, -200, "y+1", 8, 0.4],[375, 400, 400, 1600, "x+1", 8, 0.4],[1400, 1425, 400, 1600, "x-1", 8, 0.4],
    [800, 825, 800, 2000, "x-1", 8, 0.4],[975, 1000, 800, 2000, "x+1", 8, 0.4],[400, 1400, 400, 425, "y+1", 8, 0.4],
    [800, 1000, 800, 825, "y-1", 8, 0.4]],
    // Checkpoints
    [[-200, 200, 1600, 2000], [-200, 200, -200, 200], [1600, 2000, -200, 200], [1600, 2000, 1600, 2000]],
    // FinishLine
    [975, 1025, -200, 200]
  )
}

var roundModifier = function(name, intervalModifier = null, startupModifier = null){
  this.name = name;
  this.intervalModifier = intervalModifier;
  this.startupModifier = startupModifier;
}

allModifiers = {
  none : new roundModifier(
    // Name
    "None",
  ),
  obstacles : new roundModifier(
    // Name
    "Obstacles",
    // Interval Modifier
    null,
    // Startup Modifier
    function(room){
      //var newEntity = ()
      //room.currentEntities.push()
      return room
    }
  )
}

var tempRoom = function(index, allPlayers, notifications, messages, currentEntities, endPeriod, lapsToWin, modifier){
  this.roomIndex = index;
  this.allPlayers = allPlayers;
  this.notifications = notifications;
  this.messages = messages;
  this.currentEntities = currentEntities;
  this.gameEndPeriod = endPeriod;
  this.lapsToWin = lapsToWin;
  this.roundModifier = modifier;
}

// The room object constructor
var Room = function(){
  this.roomIndex = rooms.length;
  this.allPlayers = [];
  this.notifications = [];
  this.messages = [];
  this.currentEntities = [];
  this.gameEndPeriod = 0;
  this.lapsToWin = lapsToWin;
  this.roundModifier = allModifiers.none;
  this.engine = Engine.create();

  this.startGame = function(){
    this.gameEndPeriod = 0;
    this.notifications = [];
    this.currentEntities = [];
    console.log("before")
    console.log("after")

    var trackChoice = Math.floor(Math.random() * Object.keys(allTracks).length);
    if(trackChoice == 0){
      this.currentTrack = allTracks.Square;
    }
    if(trackChoice == 1){
      this.currentTrack = allTracks.DragStrip;
    }
    if(trackChoice == 2){
      this.currentTrack = allTracks.LeftRight;
    }

    console.log("Room: " + this.roomIndex + " | Map : " + this.currentTrack.name);

    this.initPlayer();
  }

  this.initPlayer = function(){
    this.initPack = [];
    for(var i in this.allPlayers) {
        this.initPack.push(this.allPlayers[i].getInitPack());
    }
    return this.initPack;
  }
}

// The car object constructor
var Car = function(name, body, maxHP, maxSpeed, maxBoosts, upgrades, acceleration, boostPower, size, mass, abilityCooldown, ability, drawCar){
  this.name = name;
  this.body = body;
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
  Racer : new Car('Racer',
    Bodies.circle(0,0,100),
    150, 6, 5, {
    MaxHP : 12,
    RegenHP : 0.3,
    MaxBoosts: 1,
    MoveSpeed : [0.01, 0.5],
    SingleHeal : 0.4,
    SingleBoost : 7.5
  }, 0.11, 2.5, 25, 5, null, null, null),

  Prankster : new Car('Prankster',
    Bodies.circle(0,0,100),
    120, 6, 4, {
    MaxHP : 10,
    RegenHP : 0.3,
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

  Bullet : new Car('Bullet',
    Bodies.circle(0,0,100),
    100, 12, 3, {
    MaxHP : 10,
    RegenHP : 0.4,
    MaxBoosts: 1,
    MoveSpeed : [0.005, 0.8],
    DashResist : 0.05,
    DashPower : 0.4
  }, 0.08, 2.5, 25, 7, 3000, function(){
    return {
    name : "Dash",
    dashResist : 0.2,
    dashPower : 4
  }
}, null),

  Tank : new Car('Tank',
   Bodies.circle(0,0,100),
    200, 4, 4, {
    MaxHP : 14,
    RegenHP : 0.8,
    MaxBoosts: 1,
    BoostPower : 0.4,
    BouncePower : 0.1,
    SingleHeal : 0.25
  }, 0.08, 3, 35, 10, null, function(){
    return null
  }, null),

  Sprinter : new Car('Sprinter',
    Bodies.circle(0,0,100),
    80, 12, 5, {
    MaxHP : 8,
    RegenHP : 0.5,
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

  Fragile : new Car('Fragile',
    Bodies.circle(0,0,100),
    70, 6, 3, {
    MaxHP : 20,
    RegenHP : 0.5,
    MaxBoosts: 2,
    MoveSpeed : [0.015, 0.6],
    GiftCooldown : 500,
    SingleBoost : 7.5
  }, 0.1, 2.5, 25, 1, 26000, function(){
    return {
    name : "Gift"
 }
  }, null),

  Spike : new Car('Spike',
    Bodies.circle(0,0,100),
    150, 5, 3, {
    MaxHP : 12,
    RegenHP : 0.2,
    MaxBoosts: 1,
    MoveSpeed : [0.01, 0.4],
    CollisionDamage : 5,
    BodySize : 1
  }, 0.12, 3, 30, 8, null, function(){
    return null
  }, null),

  Swapper : new Car('Swapper',
    Bodies.circle(0,0,100),
    80, 100, 3, {
    MaxHP : 10,
    RegenHP : 0.2,
    MaxBoosts : 1,
    OffenseSpeed : [0.014, 0.5],
    DefenseResist : 0.04,
    SwitchCooldown : 120
  }, 0.9, 3, 25, 2, 5000, function(){
    return {
      name : "Switch",
      formSpeed : [3, 0.1]
    }
  }, null)
};
