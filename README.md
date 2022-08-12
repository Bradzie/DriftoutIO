# DriftoutIO

## A fast-paced royle/racing game inspired by driftin.io built with socket.io, p5js and node.js.

I'm currently hosting this on heroku, here: https://driftout.herokuapp.com/

I'm planning to move to more independant hosting soon, but development is still early on.

## How to run locally:

1. Install Node js for your relevant system (https://nodejs.org/en/download/)
2. Install npm package manager (It should come installed with node.js, dependant on your specific download)
3. Install Express and Socket.io libraries using npm in terminal ("npm install express" / "npm install socket.io")
4. Run the local node server in terminal with "node _WhereverYouPutIt_\DriftoutIO\Driftout\server\server.js"
5. Open a localhost tab on port 3000 in your preferred web browser ("localhost:3000" as the address)
6. *Optional* You can also open a tab with your current network's ip followed by :3000 (e.g. 1.1.1.1:3000) to access the website from different machines

## Bugs:

There are currently multiple bugs on list to be corrected one by one - I will update this list as often as I can so it stays relevant.

1. Rapid refresh of the page causes issues new players to be created with null x and y values
2. CSS Main menu container and title scrambles on smaller screens
3. Sometimes, but rarely, lap checkpoints can be completely missed

