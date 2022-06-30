# DriftoutIO

## A fast-paced royle/racing game inspired by driftin.io built with socket.io, p5js and node.js.

*This is not currently hosted online due to very early development. You can however run the latest version locally but there are a few steps.*

## How to Run:

1. Install Node js for your relevant system (https://nodejs.org/en/download/)
2. Install npm package manager (It should come installed with node.js, dependant on your specific download)
3. Install Express and Socket.io libraries using npm in terminal ("npm install express" / "npm install socket.io")
4. Run the local node server in terminal with "node _WhereverYouPutIt_\DriftoutIO\Driftout\server\server.js"
5. Open a localhost tab on port 3000 in your preferred web browser ("localhost:3000" as the address)

## Bugs:

There are currently multiple bugs on list to be corrected one by one - I will update this list as often as I can so it stays relevant.

1. Boosting currently does not work, it was disabled when client/server sync was introduced
2. Leaderboard will show duplicated players as many times as they have lived (3x crashes = 3x appearences on leaderboard)
3. CSS display can be dodgy and difficult to look at when viewing on a smaller screen (Mobile, Tablet, etc.)

