const matterjs = require("matter-js");
const Bodies = matterjs.Bodies;
const Vertices = matterjs.Vertices;
const getSpawn = function(){
    let num = {x: 2500, y: 200 + Math.floor(Math.random() * 200)};
    return num;
}

module.exports = {
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
            points: '25 0 -25 20 -25 -20',
            bounce: 0.5
        },//Bodies.fromVertices(getSpawn().x, getSpawn().y, Vertices.fromPath('25 0 -25 20 -25 -20'), {restitution: 0.5}),
        colour: {r: 20, g: 20, b: 200},
        colourOutline: {r: 100, g: 100, b: 255},
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
            radius: 30,
            bounce: 0.5
        },// Bodies.polygon(getSpawn().x, getSpawn().y, 16, 30, {restitution: 0.7}),
        colour: {r: 50, g: 255, b: 150},
        colourOutline: {r: 0, g: 150, b: 50},
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
            points: '-25 -20 -25 20 -10 10 -10 -10 -10 20 -10 -20 30 -20 30 20',
            bounce: 0.5
        },//Bodies.fromVertices(getSpawn().x, getSpawn().y, Vertices.fromPath('-25 -20 -25 20 -10 10 -10 -10 -10 20 -10 -20 30 -20 30 20'), {restitution: 0.5}),
        colour: {r: 50, g: 255, b: 150},
        colourOutline: {r: 0, g: 150, b: 50},
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
            points: '30 -10 30 10 15 20 -30 20 -30 -20 15 -20',
            bounce: 0.5
        },//Bodies.fromVertices(getSpawn().x, getSpawn().y, Vertices.fromPath('30 -10 30 10 15 20 -30 20 -30 -20 15 -20'), {restitution: 0.5}),
        colour: {r: 230, g: 230, b: 10},
        colourOutline: {r: 125, g: 125, b: 0},
    }
}