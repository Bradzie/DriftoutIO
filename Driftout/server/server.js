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

var rooms = [];
var allTracks;
var currentTrack;
var currentConnections = [];
var totalConnections = 0;
var playerNames = [];

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
      player = new Player(socket.id, data.name, 900, Math.floor((Math.random()-0.5)*200), data.car, data.dev);
      if(player.name.length > 14){
        player.name = "";
      }
      if(player.name == ""){
        player.name = player.car.name;
      }
      player.alive = true;
      playerNames.push(player.name);

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

      io.emit("roomUpdate", {rooms:rooms, roomIndex:player.myRoom});
      //console.log(player.id);

      socket.emit("initPack", {initPack: rooms[player.myRoom].initPlayer(), currentTrack:rooms[player.myRoom].currentTrack, room:player.myRoom});
      socket.broadcast.emit("initPlayer", {initPack: player.getInitPack(), room:player.myRoom});



      io.emit("syncedData", {
        notification: "Track: " + rooms[player.myRoom].currentTrack.name,
        currentEntities: [],
        message: []
      });
  });

  socket.on("specifcData", (data) => {
    if(data == "metrics"){
      socket.emit("returnData", {name:"metrics", totalConnections:totalConnections, playerNames:playerNames})
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
var Player = function(id, name, x, y, car, dev) {
  this.myRoom;
  this.id = id;
  this.name = name;
  this.dev = dev;
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
        if (this.ability != null && this.car.name == "Prankster"){
          if (rooms[this.myRoom].currentEntities.filter(entity => entity.ownerId == this.id).length >= 5){
            for (i in rooms[this.myRoom].currentEntities){
              if (rooms[this.myRoom].currentEntities[i].ownerId == this.id){
                rooms[this.myRoom].currentEntities.splice(i, 1);
                break;
              }
            }
          }
          var newEntity = this.ability(this.x, this.y, this.angle, this.id);
          newEntity.size = this.trapSize;
          newEntity.damage = this.trapDamage;
          rooms[this.myRoom].currentEntities.push(newEntity);
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

        if (this.ability != null && this.car.name == "Swapper"){
          this.canAbility = Date.now() + this.abilityCooldown;
          if(this.form){
            this.form = false;
            this.resisting = true;
          }
          else{
            this.form = true;
            this.resisting = false;
          }
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

        if(this.car.name == "Swapper"){
          if(this.form == true){
            if (this.vX < this.maxSpeed && this.vX > -this.maxSpeed){
              this.vX += Math.cos(this.angle)*this.acceleration;
            }
            if (this.vY < this.maxSpeed && this.vY > -this.maxSpeed){
              this.vY += Math.sin(this.angle)*this.acceleration;
            }
          }
          if(this.form != true){
            if (this.vX < this.ability().formSpeed[0] && this.vX > -this.ability().formSpeed[0]){
              this.vX += Math.cos(this.angle)*this.ability().formSpeed[1];
            }
            if (this.vY < this.ability().formSpeed[0] && this.vY > -this.ability().formSpeed[0]){
              this.vY += Math.sin(this.angle)*this.ability().formSpeed[1];
            }
          }
        }

        else{
          if (this.vX < this.maxSpeed && this.vX > -this.maxSpeed){
            this.vX += Math.cos(this.angle)*this.acceleration;
          }
          if (this.vY < this.maxSpeed && this.vY > -this.maxSpeed){
            this.vY += Math.sin(this.angle)*this.acceleration;
          }
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
      for (var i in rooms[this.myRoom].currentEntities){
        if (rooms[this.myRoom].currentEntities[i].ownerId != this.id){
          if (Math.sqrt(((this.x-rooms[this.myRoom].currentEntities[i].x)**2)+((this.y-rooms[this.myRoom].currentEntities[i].y)**2)) < this.size + rooms[this.myRoom].currentEntities[i].size){
            this.vX *= 0.3;
            this.vY *= 0.3;
            this.HP -= rooms[this.myRoom].currentEntities[i].damage;
            if(rooms[this.myRoom].allPlayers){
              if(this.HP < 0 && rooms[this.myRoom].allPlayers.filter(player => player.id == rooms[this.myRoom].currentEntities[i].ownerId).length > 0){
                rooms[this.myRoom].allPlayers.filter(player => player.id == rooms[this.myRoom].currentEntities[i].ownerId)[0].upgradePoints++;
                rooms[this.myRoom].allPlayers.filter(player => player.id == rooms[this.myRoom].currentEntities[i].ownerId)[0].kills++;
                rooms[this.myRoom].notifications.push(rooms[this.myRoom].allPlayers.filter(player => player.id == rooms[this.myRoom].currentEntities[i].ownerId)[0].name + " crashed " + this.name + "!");
                this.alive = false;
              }
              rooms[this.myRoom].currentEntities.splice(i, 1);
            }
          }
        }
      }

      // Player Collisions
      if (rooms[this.myRoom].allPlayers.length > 1){
        for (var i in rooms[this.myRoom].allPlayers){
          if (rooms[this.myRoom].allPlayers[i].id != this.id){

            // If this player's car overlaps any other player's car
            if (Math.sqrt(((this.x-rooms[this.myRoom].allPlayers[i].x)**2)+((this.y-rooms[this.myRoom].allPlayers[i].y)**2))
             < this.size + rooms[this.myRoom].allPlayers[i].size && rooms[this.myRoom].allPlayers[i].alive == true){

              // Physics Calc

              // Calculate angle at which this player collided with another
              var collidedPlayerAngle = Math.atan2(this.y - rooms[this.myRoom].allPlayers[i].y, this.x - rooms[this.myRoom].allPlayers[i].x);

              // Calculate difference in velocities
              var xVDiff = this.vX - rooms[this.myRoom].allPlayers[i].vX;
              var yVDiff = this.vY - rooms[this.myRoom].allPlayers[i].vY;

              // Calulcate difference in distances
              var xDist = rooms[this.myRoom].allPlayers[i].x - this.x;
              var yDist = rooms[this.myRoom].allPlayers[i].y - this.y;

              // Check if both cars are approaching each-other
              if(xVDiff * xDist + yVDiff * yDist >= 0){
                console.log("Collision! - - - - - - - -")
                console.log("Between: " + rooms[this.myRoom].allPlayers[i].name + " and " + this.name);
                var angle = -Math.atan2(rooms[this.myRoom].allPlayers[i].y - this.y, rooms[this.myRoom].allPlayers[i].x - this.x);

                var m1 = this.mass;
                var m2 = rooms[this.myRoom].allPlayers[i].mass;

                const u1 = rotate({x : this.vX, y : this.vY}, angle);
                const u2 = rotate({x : rooms[this.myRoom].allPlayers[i].vX, y : rooms[this.myRoom].allPlayers[i].vY}, angle);

                var v1 = {x: u1.x * (m1 - m2) / (m1 + m2) + u2.x * 2 * m2 / (m1 + m2), y: u1.y};
                var v2 = {x: u2.x * (m1 - m2) / (m1 + m2) + u1.x * 2 * m2 / (m1 + m2), y: u2.y};

                var v1Final = rotate(v1, -angle);
                var v2Final = rotate(v2, -angle);

                var impact = (Math.abs(xVDiff) + Math.abs(yVDiff))/3;
                console.log("Impact: " + impact);

                //Damage Calc

                //If either player has godmode, no damage is taken
                if(rooms[this.myRoom].allPlayers[i].god[0] || this.god[0]){
                  continue;
                }

                //Perform calculation for this player

                if (this.resisting == true){
                  if(this.car.name == "Bullet"){
                    this.HP -= impact * rooms[this.myRoom].allPlayers[i].collisionDamage * this.ability().dashResist;
                    console.log("Player 1 damaged by (Resist " + this.ability().dashResist + "): " + impact * rooms[this.myRoom].allPlayers[i].collisionDamage * this.ability().dashResist);
                  }
                  if(this.car.name == "Swapper"){
                    this.HP -= impact * rooms[this.myRoom].allPlayers[i].collisionDamage * this.resistance;
                    console.log("Player 1 damaged by (Resist " + this.resistance + "): " + impact * rooms[this.myRoom].allPlayers[i].collisionDamage * this.resistance);
                  }
                }
                else{
                  console.log("Player 1 damaged by: " + impact * rooms[this.myRoom].allPlayers[i].collisionDamage);
                  this.HP -= impact * rooms[this.myRoom].allPlayers[i].collisionDamage;
                }

                if(this.HP < 0){
                  console.log("Player 1 has crashed!");
                  rooms[this.myRoom].allPlayers[i].upgradePoints++;
                  rooms[this.myRoom].allPlayers[i].kills++;
                  rooms[this.myRoom].notifications.push(this.name + " crashed " + rooms[this.myRoom].allPlayers[i].name + "!");
                  this.alive = false;
                }

                //Perform calculation for that player

                if (rooms[this.myRoom].allPlayers[i].resisting == true){
                  if(rooms[this.myRoom].allPlayers[i].car.name == "Bullet"){
                    rooms[this.myRoom].allPlayers[i].HP -= impact * this.collisionDamage * rooms[this.myRoom].allPlayers[i].ability().dashResist;
                    console.log("Player 2 damaged by (Resist " + rooms[this.myRoom].allPlayers[i].ability().dashResist + "): " + impact * this.collisionDamage * rooms[this.myRoom].allPlayers[i].ability().dashResist);
                  }
                  if(rooms[this.myRoom].allPlayers[i].car.name == "Swapper"){
                    rooms[this.myRoom].allPlayers[i].HP -= impact * this.collisionDamage * rooms[this.myRoom].allPlayers[i].resistance;
                    console.log("Player 2 damaged by (Resist " + rooms[this.myRoom].allPlayers[i].resistance + "): " + impact * this.collisionDamage * rooms[this.myRoom].allPlayers[i].resistance);
                  }
                }
                else{
                  console.log("Player 2 damaged by: " + impact * this.collisionDamage);
                  rooms[this.myRoom].allPlayers[i].HP -= impact * this.collisionDamage;
                }

                if(rooms[this.myRoom].allPlayers[i].HP < 0){
                  console.log("Player 2 has crashed!");
                  this.upgradePoints++;
                  this.kills++;
                  rooms[this.myRoom].notifications.push(this.name + " crashed " + rooms[this.myRoom].allPlayers[i].name + "!");
                  rooms[this.myRoom].allPlayers[i].alive = false;
                }

                //Apply Movement

                this.vX = v1Final.x*1.1;
                this.vY = v1Final.y*1.1;

                if(this.bounceModifier){
                  rooms[this.myRoom].allPlayers[i].vX = v2Final.x*this.bounceModifier;
                  rooms[this.myRoom].allPlayers[i].vY = v2Final.y*this.bounceModifier;
                }
                else{
                  rooms[this.myRoom].allPlayers[i].vX = v2Final.x;
                  rooms[this.myRoom].allPlayers[i].vY = v2Final.y;
                }
              }
            }
          }
        }
      }
    }

    for(var i in rooms[this.myRoom].currentTrack.walls){
      this.collision(this.x, this.y, rooms[this.myRoom].currentTrack.walls[i][0], rooms[this.myRoom].currentTrack.walls[i][1],
        rooms[this.myRoom].currentTrack.walls[i][2], rooms[this.myRoom].currentTrack.walls[i][3],
        rooms[this.myRoom].currentTrack.walls[i][4], rooms[this.myRoom].currentTrack.walls[i][5],
        rooms[this.myRoom].currentTrack.walls[i][6])
    }

    // Check if inside finish line
    if (this.collision(this.x, this.y, rooms[this.myRoom].currentTrack.finishLine[0], rooms[this.myRoom].currentTrack.finishLine[1],
    rooms[this.myRoom].currentTrack.finishLine[2], rooms[this.myRoom].currentTrack.finishLine[3], "trigger") == true){
      if (this.checkPointCounter.every(point => point == true)){
        this.laps += 1;
        this.boosts = this.maxBoosts;
        this.checkPointCounter = [false, false, false, false];
        rooms[this.myRoom].notifications.push(this.name + " Completed a lap!");
        this.upgradePoints += 1;
        this.HP = this.maxHP;
        this.lapStart = Date.now();
        if (this.lapTime < this.topLapTime || this.topLapTime == 0){
          this.topLapTime = this.lapTime;
        }
        if (this.laps >= lapsToWin){
          rooms[this.myRoom].notifications.push(this.name + " has Won!!!");
          rooms[this.myRoom].gameEndPeriod = Date.now()+5000;
          for(var i in rooms[this.myRoom].allPlayers){
            rooms[this.myRoom].allPlayers[i].brake = true;
            rooms[this.myRoom].allPlayers[i].god[1] = Date.now() + 5000;
            rooms[this.myRoom].allPlayers[i].god[0] = true;
          }
        }
      }
    }

    // Check for collision with check points
    for(var i in rooms[this.myRoom].currentTrack.checkPoints){
      if (this.collision(this.x, this.y, rooms[this.myRoom].currentTrack.checkPoints[i][0], rooms[this.myRoom].currentTrack.checkPoints[i][1],
      rooms[this.myRoom].currentTrack.checkPoints[i][2], rooms[this.myRoom].currentTrack.checkPoints[i][3], "trigger") == true){
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
      car: this.car,
      dev: this.dev
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

    for(var i in rooms){
      if (rooms[i].currentEntities.length > 0){
        for (var j in rooms[i].currentEntities){
          if (rooms[i].currentEntities[j].newEntity == true){
            rooms[i].currentEntities[j].newEntity = false;
            rooms[i].currentEntities[j].createdAt = Date.now();
          }
          rooms[i].currentEntities[j].vX *= 0.95;
          rooms[i].currentEntities[j].vY *= 0.95;
          rooms[i].currentEntities[j].x += rooms[i].currentEntities[j].vX;
          rooms[i].currentEntities[j].y += rooms[i].currentEntities[j].vY;

          for(var k in rooms[i].currentTrack.walls){
            if ((rooms[i].currentEntities[j].x > rooms[i].currentTrack.walls[k][0] && rooms[i].currentEntities[j].x < rooms[i].currentTrack.walls[k][1]) &&
            (rooms[i].currentEntities[j].y > rooms[i].currentTrack.walls[k][2] && rooms[i].currentEntities[j].y < rooms[i].currentTrack.walls[k][3])){
              rooms[i].currentEntities[j].vX = 0;
              rooms[i].currentEntities[j].vY = 0;
            }
          }
          // if (currentEntities[i].createdAt + 10000 > Date.now()){
          //   currentEntities.splice(i, i+1);
          // }
        }
      }
    }
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

// The room object constructor
var Room = function(){
  this.roomIndex = rooms.length;
  this.allPlayers = [];
  this.notifications = [];
  this.messages = [];
  this.currentEntities = [];
  this.gameEndPeriod = 0;
  this.lapsToWin = lapsToWin;

  this.startGame = function(){
    this.gameEndPeriod = 0;
    this.notifications = [];
    this.currentEntities = [];

    var trackChoice = Math.floor(Math.random() * 3);
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
  Racer : new Car('Racer', 150, 6, 5, {
    MaxHP : 12,
    RegenHP : 0.3,
    MaxBoosts: 1,
    MoveSpeed : [0.01, 0.5],
    SingleHeal : 0.4,
    SingleBoost : 7.5
  }, 0.11, 2.5, 25, 5, null, null, null),

  Prankster : new Car('Prankster', 120, 6, 4, {
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

  Bullet : new Car('Bullet', 100, 12, 3, {
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

  Tank : new Car('Tank', 200, 4, 4, {
    MaxHP : 14,
    RegenHP : 0.8,
    MaxBoosts: 1,
    BoostPower : 0.4,
    BouncePower : 0.1,
    SingleHeal : 0.25
  }, 0.08, 3, 35, 10, null, function(){
    return null
  }, null),

  Sprinter : new Car('Sprinter', 80, 12, 5, {
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

  Fragile : new Car('Fragile', 70, 6, 3, {
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

  Spike : new Car('Spike', 150, 5, 3, {
    MaxHP : 12,
    RegenHP : 0.2,
    MaxBoosts: 1,
    MoveSpeed : [0.01, 0.4],
    CollisionDamage : 5,
    BodySize : 1
  }, 0.12, 3, 30, 8, null, function(){
    return null
  }, null),

  Swapper : new Car('Swapper', 80, 100, 3, {
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
