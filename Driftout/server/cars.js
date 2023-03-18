const matterjs = require("matter-js");
const Bodies = matterjs.Bodies;
const Vertices = matterjs.Vertices;

module.exports = {
    Racer: {
        name: "Racer",
        HP: 100,
        maxSpeed: 12,
        acceleration: 0.2,
        density: 0.05,
        body: Bodies.fromVertices(2500, 250, Vertices.fromPath('25 0 -25 20 -25 -20'), {restitution: 0.5}),
        colour: {r: 20, g: 20, b: 200},
        colourOutline: {r: 100, g: 100, b: 255},
    },
    Tank: {
        name: "Tank",
        HP: 175,
        maxSpeed: 8,
        acceleration: 0.3,
        density: 0.08,
        body: Bodies.polygon(2500, 250, 16, 30, {restitution: 0.7}),
        colour: {r: 50, g: 255, b: 150},
        colourOutline: {r: 0, g: 150, b: 50},
    },
    Prankster: {
        name: "Prankster",
        HP: 80,
        maxSpeed: 10,
        acceleration: 0.2,
        density: 0.04,
        body: Bodies.fromVertices(2500, 250, Vertices.fromPath('-10 10 -10 -10 -25 -20 -25 20'), {restitution: 0.5}),
        colour: {r: 50, g: 255, b: 150},
        colourOutline: {r: 0, g: 150, b: 50},
    },
    Bullet: {
        name: "Bullet",
        HP: 100,
        maxSpeed: 14,
        acceleration: 0.15,
        density: 0.04,
        body: Bodies.fromVertices(2500, 250, Vertices.fromPath('30 -10 30 10 15 20 -30 20 -30 -20 15 -20'), {restitution: 0.5}),
        colour: {r: 230, g: 230, b: 10},
        colourOutline: {r: 125, g: 125, b: 0},
    }
}