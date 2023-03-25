const matterjs = require("matter-js");
const Bodies = matterjs.Bodies;
const engineCanvas = {width: 5000, height: 5000};

module.exports = {
    Square : {
        name: "Square",
        walls: [
                Bodies.rectangle( // CENTER SQUARE
                2500, 
                2500, 
                3000, 
                3000, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                    2500, 
                    5000, 
                5500, 
                500, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                    2500, 
                0, 
                5500, 
                500, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                    5000,
                2500, 
                500, 
                5500, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                0,
                2500, 
                500, 
                5500, 
                {isStatic: true, restitution: 1}
                ),
            ],
        spawnArea: {x: 2500, y: 4800},
        borderLines: // Generate functionally?
            [
                {x1: 250, y1: 250, x2: 4750, y2: 250},
                {x1: 4750, y1: 250, x2: 4750, y2: 4750},
                {x1: 4750, y1: 4750, x2: 250, y2: 4750},
                {x1: 250, y1: 4750, x2: 250, y2: 250},
                {x1: 1000, y1: 1000, x2: 4000, y2: 1000},
                {x1: 4000, y1: 1000, x2: 4000, y2: 4000},
                {x1: 4000, y1: 4000, x2: 1000, y2: 4000},
                {x1: 1000, y1: 4000, x2: 1000, y2: 1000},
            ],
        checkPoints:
            [

            ]
    }
}
