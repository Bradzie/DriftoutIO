const p5 = require('node-p5');
const matterjs = require("matter-js");
const Bodies = matterjs.Bodies;
const Vertices = matterjs.Vertices;
const getSpawn = function(){
    let num = {x: 2500, y: 300 + Math.floor(Math.random() * 200)};
    return num;
}

module.exports = {

    // Car templates
    Racer: {
        name: "Racer",
        HP: 100,
        maxSpeed: 10,
        acceleration: 0.15,
        density: 0.05,
        body: {
            type: "Vertices",
            x: getSpawn().x,
            y: getSpawn().y,
            points: '36 0 -36 26 -36 -26',
            bounce: 0.5
        },
        colour: {r: 20, g: 20, b: 200},
        colourOutline: {r: 100, g: 100, b: 255},
        ability: null,
    },
    Sprinter: {
        name: "Sprinter",
        HP: 70,
        maxSpeed: 24,
        acceleration: 0.18,
        density: 0.02,
        body: {
            type: "Vertices",
            x: getSpawn().x,
            y: getSpawn().y,
            points: '40 0 -30 -20 -30 20',
            bounce: 0.2
        },
        colour: {r: 255, g: 0, b: 0},
        colourOutline: {r: 125, g: 0, b: 0},
        ability: null,
    },
    Tank: {
        name: "Tank",
        HP: 175,
        maxSpeed: 7,
        acceleration: 0.25,
        density: 0.08,
        body: {
            type: "Polygon",
            x: getSpawn().x,
            y: getSpawn().y,
            sides: 16,
            radius: 40,
            bounce: 1
        },
        colour: {r: 50, g: 255, b: 150},
        colourOutline: {r: 0, g: 150, b: 50},
        ability: null,
    },
    Prankster: {
        name: "Prankster",
        HP: 80,
        maxSpeed: 9,
        acceleration: 0.12,
        density: 0.04,
        body: {
            type: "Vertices",
            x: getSpawn().x,
            y: getSpawn().y,
            points: '',
            bounce: 0.5
        },
        colour: {r: 50, g: 255, b: 150},
        colourOutline: {r: 0, g: 150, b: 50},
        ability: {
            name: "Trap",
            fire: function(player){
                player.HP += 20;
                return player;
            }
        },
    },
    Bullet: {
        name: "Bullet",
        HP: 100,
        maxSpeed: 12,
        acceleration: 0.1,
        density: 0.04,
        body: {
            type: "Vertices",
            x: getSpawn().x,
            y: getSpawn().y,
            points: '40 -12 40 12 20 26 -40 26 -40 -26 20 -26',
            bounce: 0.5
        },
        colour: {r: 230, g: 230, b: 10},
        colourOutline: {r: 125, g: 125, b: 0},
        ability: {
            name: "Dash",
            fire: function(player){
                player.maxSpeed = 20;
                return player;
            }
        }
    },
}