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
        body: Bodies.polygon(2500, 250, 16, 30, {restitution: 0.5}),
        colour: {r: 50, g: 255, b: 150},
        colourOutline: {r: 0, g: 150, b: 50},
    }
}