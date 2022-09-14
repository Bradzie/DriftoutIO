# DriftoutIO

## A fast-paced royle/racing game inspired by driftin.io built with socket.io, p5js and node.js

The game finally has independent hosting and a custom domain!

! https://driftout.io !

## Battle other racers to be the first to complete 20 laps! 🚗

> Select from 7 different car classes each with different attributes and some with abilities ⚔️

> Complete laps to upgrade your car and survive longer ⬆️

> Play solo to attempt for a personal best time 💨

## How to run locally:

1. Install Node js for your relevant system (https://nodejs.org/en/download/)
2. Install npm package manager (It should come installed with node.js, dependant on your specific download)
3. Install Express and Socket.io libraries using npm in terminal ("npm install express" / "npm install socket.io")
4. Run the local node server in terminal with "node _WhereverYouPutIt_\DriftoutIO\Driftout\server\server.js"
5. Open a localhost tab on port 80 in your preferred web browser ("localhost:80" as the address)
6. *Optional* You can also open a tab with your current network's ip followed by :80 (e.g. 1.1.1.1:80) to access the website from different machines

## Version info:

I'm slowly approaching the planned criteria I had imagined months ago when I had just started development. Version numbers allow me to reflect how close I am to what I feel is the a release.

We are currently at: V0.6.2

- V0.6 All upgrades functional
- V0.6.1 (Bug fix) Maps rotating inbetween games
- V0.6.2 (Bug fix) Players without godmode could damage those with godmode
- V0.6.3 (Bug fix) Upgrading rapidly upon button press
- V0.7 Optimise GUI and reward upgrade points upon kill
- v0.8 Mobile integration
- v0.9 10 Classes, 4 Maps
- V1.0 Round modifiers


## Bugs:

There are currently multiple bugs on list to be corrected one by one - I will update this list as often as I can so it stays relevant. As of 11/9/22 I advertised this game on the IOgames sub-reddit and wow, there was alot of bugs. Was really fun playing with everyone :)

1. Rapid refresh of the page causes issues new players to be created with null x and y values
2. Upgrades don't work on mobile
3. Sometimes, but rarely, lap checkpoints can be completely missed (likely due to the size of checkpoint triggers)
4. Upgrade selections rapidly select with more than one point
5. Leaderboard does not sort by highest laps
6. Leaderboard still duplicates some player names

