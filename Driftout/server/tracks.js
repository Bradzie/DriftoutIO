const matterjs = require("matter-js");
const Bodies = matterjs.Bodies;
const engineCanvas = {width: 5000, height: 5000};

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
                engineCanvas.width + 500, 
                500, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                engineCanvas.width / 2, 
                0, 
                engineCanvas.width + 500, 
                500, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                engineCanvas.width,
                engineCanvas.height / 2, 
                500, 
                engineCanvas.height + 500, 
                {isStatic: true, restitution: 1}
                ),
                Bodies.rectangle(
                0,
                engineCanvas.height / 2, 
                500, 
                engineCanvas.height + 500, 
                {isStatic: true, restitution: 1}
                ),
            ],
        spawnArea: {x: engineCanvas.width / 2, y: engineCanvas.height - 200}
    }
}
