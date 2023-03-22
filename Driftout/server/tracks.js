const matterjs = require("matter-js");
const Bodies = matterjs.Bodies;
const engineCanvas = {width: 5000, height: 5000};
const blockSize = 500;
const borderSize = blockSize / 2

module.exports = {
    Square : {
        name: "Square",
        walls: [
                Bodies.rectangle( // CENTER SQUARE
                engineCanvas.width / 2, 
                engineCanvas.height / 2, 
                engineCanvas.width / 1.5, 
                engineCanvas.height / 1.5, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                engineCanvas.width / 2, 
                engineCanvas.height, 
                engineCanvas.width + blockSize, 
                blockSize, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                engineCanvas.width / 2, 
                0, 
                engineCanvas.width + blockSize, 
                blockSize, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                engineCanvas.width,
                engineCanvas.height / 2, 
                blockSize, 
                engineCanvas.height + blockSize, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                0,
                engineCanvas.height / 2, 
                blockSize, 
                engineCanvas.height + blockSize, 
                {isStatic: true, restitution: 1}
                ),
            ],
        spawnArea: {x: engineCanvas.width / 2, y: engineCanvas.height - 200},
        borderLines:
            [
                {x1: borderSize, y1: borderSize, x2: engineCanvas.width - borderSize, y2: borderSize},
                {x1: engineCanvas.width - borderSize, y1: borderSize, x2: engineCanvas.width - borderSize, y2: engineCanvas.height - borderSize},
                {x1: engineCanvas.width - borderSize, y1: engineCanvas.height - borderSize, x2: borderSize, y2: engineCanvas.height - borderSize},
                {x1: borderSize, y1: engineCanvas.height - borderSize, x2: borderSize, y2: borderSize},
            ]
    }
}
