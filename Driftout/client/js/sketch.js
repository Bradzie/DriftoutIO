// ---------- GLOBALS ----------

// Bulk HTML Access

var mainCanvas = document.getElementById("mainCanvas"),
  gameTitle = document.getElementById("gameTitle"),
  enterGameButton = document.getElementById('enterGameButton'),
  changeClassButton = document.getElementById('changeClassButton')
  menuContainer = document.getElementById("menuContainer"),
  classDisplay = document.getElementById('classDisplay'),
  classImage = document.getElementById('classImage'),
  nameInput = document.getElementById('nameInput'),
  tipsContainer = document.getElementById('tipsContainer'),
  gameGuiContainer = document.getElementById('gameGuiContainer'),
  notificationContainer = document.getElementById('notificationContainer'),
  leaderboardContainer = document.getElementById('leaderboardContainer'),
  leaderboardItem = document.getElementById('leaderboardItem'),
  tabLeaderboard = document.getElementById('tabLeaderboard'),
  boostContainer = document.getElementById('boostContainer'),
  boostContainerCooldown = document.getElementById('boostContainerCooldown'),
  abilityContainer = document.getElementById('abilityContainer'),
  abilityContainerCooldown = document.getElementById('abilityContainerCooldown'),
  abilityHint = document.getElementById('abilityHint'),
  timeContainer = document.getElementById('timeContainer'),
  timeContainerInterior = document.getElementById('timeContainerInterior'),
  bestTimeContainer = document.getElementById('bestTimeContainer'),
  bestTimeContainerInterior = document.getElementById('bestTimeContainerInterior'),
  debugContainer = document.getElementById('debugContainer'),
  upgradeContainer = document.getElementById('upgradeContainer'),
  upgradeItem = document.getElementById('upgradeItem'),
  upgradePointsTitle = document.getElementById('upgradePointsTitle'),
  currentLaps = document.getElementById('currentLaps'),
  currentLapsInterior = document.getElementById('currentLapsInterior'),
  chatToggle = document.getElementById('chatToggle'),
  chatDisplay = document.getElementById('chatDisplay'),
  chatInput = document.getElementById('chatInput'),
  chatContent = document.getElementById('chatContent'),
  metricsData = document.getElementById('metricsData'),
  metricsContainer = document.getElementById('metricsContainer'),
  newsButton = document.getElementById('newsButton'),
  newsContainer = document.getElementById('newsContainer'),
  newsArticle = document.getElementById('newsArticle'),
  newsExitButton = document.getElementById('newsExitButton');

// Global Vars

var socket;
var playing = false;
var windowDisplay = false;
var allPlayers = [];
var clientPlayerAngle = 0;
var classIndex = 0;
var classEntries = [
  "Racer<br>■■□ Speed<br>■■□ Handling<br>■■□ Durability",
  "Sprinter<br>■■■ Speed<br>■□□ Handling<br>■□□ Durability<br>Ability: Steady",
  "Tank<br>■□□ Speed<br>■■■ Handling<br>■■■ Durability",
  "Prankster<br>■■□ Speed<br>■■□ Handling<br>■□□ Durability<br>Ability: Trap",
  "Bullet<br>■■■ Speed<br>■□□ Handling<br>■■■ Durability<br>Ability: Dash",
  "Fragile<br>■□□ Speed<br>■□□ Handling<br>■□□ Durability<br>Ability: Gift",
  "Spike<br>■□□ Speed<br>■■■ Handling<br>■■□ Durability",
  "Swapper<br>■□□ Speed<br>■■■ Handling<br>■■■ Durability<br>Ability: Switch"
]
var forceDisconnect = 0;
var errors = [
  "Failed to reach server for 3 seconds. Most likely an update, refresh in a minute. :D",
  "This game only functions properly in portrait mode, please rotate your device and refresh :)"
]
var tips = [
  "Boosting from a lower speed increases boost power",
  "Crash other players to earn upgrade points",
  "Press 'q' to open a detailed leaderboard",
  "Some cars are heavier and have reduced knockback",
  "Round modifiers and more cars coming soon :)",
  "This game also has mobile controls, but is resource intensive",
  "Boosts and health refill upon completion of a lap"
]

var tipsCounter = Date.now();
var tipsIndex = Math.floor(Math.random() * tips.length);
var classDisplayAngle = 0;
var totalConnections=0;
var playerNames = [];
var myName;
var mobileCoords;
var timeOutTick = 0;
var state;
var myId = 0;
var serverCanvas = {width: 2000, height: 2000};

class NewsPiece{
  constructor(title, date, content){
    this.title = title;
    this.date = date;
    this.content = content;
  }
}

currentNews = [
  new NewsPiece("Server Migration", "4/12/22", "Hey everyone!\nThe last month has left me with very little spare time to commit updates to Driftout, and after having this game listed on some IO game websites, it gained alot of traction. As a result, the hosting is becoming rather expensive. So over the next few days I will be migrating the hosting from Digital Ocean to a more cost-friendly alternative.\n Apologies for any performance issues caused by this as I am aiming for as effective connection possible for the money I am willing to spend. Thanks! :) ~ Brad")
]

for(article in currentNews){
  newsContainer.innerHTML += "<div id='newsArticle'><h1>" + currentNews[article].title + "</h1><p>" + currentNews[article].date + "</p><h2>" + currentNews[article].content + "</h2></div>";
}

function preload(){
}

// Called when game is started once
function setup(){
  // Client setup
  allPlayers = [];

  nameInput.focus();
  nameInput.select();

  frameRate(30);

  menuContainer.style.visibility = "visible";
  menuContainer.style.opacity = "1";

  classDisplay.innerHTML = "<div id='classImageBlock'></div>" + classEntries[classIndex];

  canvas = createCanvas(windowWidth, windowHeight);

  socket = io();

  socket.on("setupData", function(data) {
      myId = data.id;
      serverCanvas = data.serverCanvas;
  });

  socket.on("addPlayer", function(data) {
    allPlayers.push(new Player(data.playerID, data.vector.x, data.vector.y));
  });

  var mainCanvas = createCanvas(windowWidth, windowHeight);
  mainCanvas.parent("mainCanvas");

  socket.on("updateState", (data) => {
    state = data;
    timeOutTick = 0;
  });

  socket.on("playerData", (data) => {
    for(var i in data){
      for(var j in allPlayers){
        if(allPlayers[j].id === data[i].id){
          allPlayers[j].x = data[i].pos.x
          allPlayers[j].y = data[i].pos.y
          allPlayers[j].HP = data[i].HP
          allPlayers[j].maxHP = data[i].maxHP
          break;
        }
      }
    }
  });

}

function draw() {
  // Resize canvas to correct dimensions (non-functional on mobile?)
  resizeCanvas(windowWidth, windowHeight);

  // Render game only if playing
  if (playing == true){  

    // Translate window to match position of player
    for(var i in allPlayers){
      if(allPlayers[i].id == myId){
        translate(windowWidth/2 - allPlayers[i].x, windowHeight/2 - allPlayers[i].y);
      }

      allPlayers[i].drawGUI();
    }

    // Draw wall shapes based on verticies sent by server
    state.walls.forEach(w => {
      strokeCap(ROUND);
      strokeWeight(12);
      stroke(30,30,30);
      fill(0,0,0);
      beginShape();
      w.forEach(v => vertex(v.x, v.y));
      endShape(CLOSE);
    });


    // Draw player shapes based on verticies sent by server
    state.players.forEach(p => {
      strokeWeight(5);
      fill(p[1].r, p[1].g, p[1].b);
      stroke(p[2].r, p[2].g, p[2].b);
      strokeJoin(ROUND);
      beginShape();
      p[0].forEach(v => vertex(v.x, v.y));
      endShape(CLOSE);
      smooth(5);
    });

    // Start counting up from last packet recieved
    timeOutTick++;

    // If no packets recieved in 3 seconds (30FPS * 3 = 90 ticks), exit game
    if(timeOutTick > 90){
      exitGame();
      forceDisconnect = 1;
      enterGameButton.setAttribute('onClick', '');
      return;
    }

    // Render background and GUI's
    refreshDisplays();

    // Send keyboard/mouse inputs to server
    sendInputData();

    // if(allPlayers.filter(player => player.id === myId).length == 0){
    //   exitGame();
    // }
  }

  else{
    if(!windowDisplay){
      if(Date.now() > tipsCounter){
        if(tipsIndex >= tips.length-1){
          tipsIndex = 0;
        }
        else{
          tipsIndex++;
        }
        if(forceDisconnect == 1){
          tipsContainer.innerHTML = errors[0];
        }
        if(forceDisconnect == 2){
          tipsContainer.innerHTML = errors[1];
        }
        else{
          tipsContainer.innerHTML = tips[tipsIndex];
        }
        tipsCounter = Date.now() + 3500;
      }
    }
  }
}

function debugDraw(debugText){
  //[[-1000, -200, -600, 3000], [-1000, -600, -600, -200], [2600, 3000, -600, -200], [2600, 3000, 2600, 3000]]
  textSize(20);
  textAlign(CENTER);
  textStyle(BOLD);
  fill(0,0,0);
  text(debugText, windowWidth/2,windowHeight/2);
}

function exitGame(){
  notificationContainer.style.opacity = "0";
  menuContainer.style.visibility = "visible";
  menuContainer.style.opacity = "1";
  gameGuiContainer.style.visibility = "hidden";
  gameGuiContainer.style.opacity = "0";
  playing = false;
  enterGameButton.setAttribute('onClick', 'enterGame()');
  allPlayers=[];
  refreshDisplays();
}

// Executed on main menu 'race' button,

function enterGame(){

  socket.emit("ready", {});

  enterGameButton.setAttribute('onClick', '');
  menuContainer.style.visibility = "hidden";
  menuContainer.style.opacity = "0";
  //gameGuiContainer.style.visibility = "visible";
  //gameGuiContainer.style.opacity = "1";

  playing = true;

}

function setPlayerName(){
  for(var i in currentRoom.allPlayers){
    if (currentRoom.allPlayers[i].id == myId){
      myName = currentRoom.allPlayers[i].name;
    }
  }
}

function changeClass(){
  classIndex++;
  if(classIndex >= Object.keys(allCars).length){
    classIndex=0;
  }
  classDisplay.innerHTML = "<div id='classImageBlock'></div>" + classEntries[classIndex];
}

function toggleChat(){
  if (chatDisplay.style.display === "block") {
    chatDisplay.style.display = "none";
  } else {
    chatDisplay.style.display = "block";
    chatToggle.style.backgroundColor = "rgba(30, 30, 30, 0.6)";
  }
}

function toggleNewsOn(){
  if(!windowDisplay){
    newsContainer.style.opacity = "1";
    newsContainer.style.visibility = "visible";
    windowDisplay = true;
  }
}

function toggleNewsOff(){
  newsContainer.style.visibility = "hidden";
  newsContainer.style.opacity = "0";
  windowDisplay = false;
}

function toggleMetricsOn(){
  if(!windowDisplay){
    metricsContainer.style.opacity = "1";
    metricsContainer.style.visibility = "visible";
    socket.emit("specifcData", "metrics");
    if(totalConnections == 0 && playerNames == []){
      metricsData.innerHTML = "Loading...";
    }
    else{
      var playerNameList = "";
      for(var i in playerNames){
        playerNameList+=playerNames[i] + ", ";
      }
      metricsData.innerHTML = "Total page vists since restart: " + totalConnections + "</br>All player names: " + playerNameList;
    }
    windowDisplay = true;
  }
}

function toggleMetricsOff(){
    metricsContainer.style.opacity = "0";
    metricsContainer.style.visibility = "hidden";
    windowDisplay = false;
}

function refreshDisplays(){
  tabLeaderboard.style.visibility = "hidden";
  tabLeaderboard.style.opacity = "0";
  leaderboardContainer.innerHTML = "Leaderboard";
  tabLeaderboard.innerHTML = "Leaderboard";
  var text = "<table width='100%'><tr><th>Leaderboard</th></tr>";
  var tabText = "<table width='100%'><tr><th>Name</th><th>Laps</th><th>Best Time</th><th>Kills</th></tr>";

  if(keyIsDown(81)){
    tabLeaderboard.style.visibility = "visible";
    tabLeaderboard.style.opacity = "1";
  }

  if(keyIsDown(67) && chatDisplay.style.display != "block"){
    toggleChat();
  }
}

function sendInputData() {
    var mouseClick = false;
    var spacePressed = false;
    clientPlayerAngle = atan2(mouseY - windowHeight/2, mouseX - windowWidth/2);
    if (mouseIsPressed === true){
      mouseClick = true;
    }
    if (keyIsDown(49)){
      numPressed = 1;
    }
    if (keyIsDown(50)){
      numPressed = 2;
    }
    if (keyIsDown(51)){
      numPressed = 3;
    }
    if (keyIsDown(52)){
      numPressed = 4;
    }
    if (keyIsDown(53)){
      numPressed = 5;
    }
    if (keyIsDown(54)){
      numPressed = 6;
    }
    if (keyIsDown(32)){
      spacePressed = true;
    }
    //var mouseDistanceToCar = Math.abs(Math.sqrt((windowHeight/2 - mouseY)**2+(windowHeight/2 - mouseY)**2));
    var mouseDistanceToCar = Math.abs((windowHeight/2 + windowWidth/2) - (mouseX+mouseY));
    socket.emit("inputData", {mouseX, mouseY, clientPlayerAngle, windowWidth, windowHeight, mouseClick, mouseDistanceToCar, spacePressed});
}

// ----------- OBJECTS ---------------------------------------------------

// The player object constructor
var Player = function(id, vector) {
  this.id = id;
  this.verticies;
  this.x = vector.x;
  this.y = vector.y;
  this.name = "Racer";
  this.maxHP = 0;
  this.HP = 0;

  this.drawGUI = function(){

    // Player HP bar
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

}
