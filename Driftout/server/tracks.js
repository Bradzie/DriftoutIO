const matterjs = require("matter-js");
const Bodies = matterjs.Bodies;
const Body = matterjs.Body;
const Bounds = matterjs.Bounds;
const Vertices = matterjs.Vertices;
const engineCanvas = {width: 5000, height: 5000};

//Collision filter 1 = Collisions | Collision filter -1 = No Collisions

module.exports = {
    Square : {
        name: "Square",
        walls: [
                Bodies.rectangle( // CENTER SQUARE
                2500, 
                2500, 
                3000, 
                3000, 
                {isStatic: true, restitution: 0, collisionFilter: {group: 1, mask: 0}}
                ),
                Bodies.rectangle(
                2500, 
                5000, 
                5500, 
                500, 
                {isStatic: true, restitution: 0, collisionFilter: {group: 1, mask: 0}}
                ),
                Bodies.rectangle(
                2500, 
                0, 
                5500, 
                500, 
                {isStatic: true, restitution: 0, collisionFilter: {group: 1, mask: 0}}
                ),
                Bodies.rectangle(
                5000,
                2500, 
                500, 
                5500, 
                {isStatic: true, restitution: 0, collisionFilter: {group: 1, mask: 0}}
                ),
                Bodies.rectangle(
                0,
                2500, 
                500, 
                5500, 
                {isStatic: true, restitution: 0, collisionFilter: {group: 1, mask: 0}}
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
        finishLine:
            {
                bounds: Bounds.create(
                    Vertices.create([
                        {x: 2400, y: 250},
                        {x: 2600, y: 250},
                        {x: 2600, y: 1000},
                        {x: 2400, y: 1000},
                    ])
                ),
                line: [
                    {x1: 2500, y1: 250, x2: 2500, y2: 1000},
                ]
            },
        checkPoints:
            [
                Bounds.create(
                    Vertices.create([
                        {x: 0, y: 0},
                        {x: 1000, y: 0},
                        {x: 1000, y: 1000},
                        {x: 0, y: 1000},
                    ])
                ),
                Bounds.create(
                    Vertices.create([
                        {x: 4000, y: 0},
                        {x: 5000, y: 0},
                        {x: 5000, y: 1000},
                        {x: 4000, y: 1000},
                    ])
                ),
                Bounds.create(
                    Vertices.create([
                        {x: 0, y: 4000},
                        {x: 0, y: 5000},
                        {x: 1000, y: 5000},
                        {x: 1000, y: 4000},
                    ])
                ),
                Bounds.create(
                    Vertices.create([
                        {x: 4000, y: 4000},
                        {x: 4000, y: 5000},
                        {x: 5000, y: 5000},
                        {x: 5000, y: 4000},
                    ])
                ),
            ]
    }
}
